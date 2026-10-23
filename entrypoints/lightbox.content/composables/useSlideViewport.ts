import { refDebounced, useWindowSize } from '@vueuse/core';
import type { FullGestureState } from '@vueuse/gesture';
import { reactive, ref } from 'vue';

interface SlideViewportOptions {
    /** Whether the slide has content that gestures may act on. */
    isContentLoaded: () => boolean;
    onZoomStart: () => void;
    onZoomEnd: () => void;
}

// Pan/zoom transform state and gesture math for a single slide: media size,
// fit ratios, position, zoom/pan/pinch flags, centering, fitting,
// edge-constraining, and the drag/pinch/wheel/double-click handlers.
// Element refs, load state, and events stay in the component.
export function useSlideViewport(opts: SlideViewportOptions) {
    const mediaSize = ref<Vector2>({ x: 0, y: 0 });
    const windowSize = useWindowSize();
    const initialRatio = ref(1);
    const currentRatio = ref(1);
    const position = ref<Vector2>({ x: 0, y: 0 });
    const pinching = ref(false);
    const zoomedIn = ref(false);
    const panning = ref(false);
    const delayedPanning = refDebounced(panning, 100);

    const pinchData = reactive({
        pinchInitialDistance: 0,
        pinchStartRatio: 0,
        previousCenter: { x: 0, y: 0 } satisfies Vector2,
    });

    const centerOnScreen = () => {
        position.value = {
            x:
                (windowSize.width.value -
                    mediaSize.value.x * currentRatio.value) /
                2,
            y:
                (windowSize.height.value -
                    mediaSize.value.y * currentRatio.value) /
                2,
        };
    };

    const unzoom = () => {
        currentRatio.value = initialRatio.value;
        centerOnScreen();
        zoomedIn.value = false;
        opts.onZoomEnd();
    };

    const handleDoubleClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        unzoom();
        return true;
    };

    const constrainToScreen = () => {
        const scaledImageWidth = mediaSize.value.x * currentRatio.value;
        const scaledImageHeight = mediaSize.value.y * currentRatio.value;
        const imageRight = position.value.x + scaledImageWidth;
        const imageBottom = position.value.y + scaledImageHeight;

        if (scaledImageWidth > windowSize.width.value) {
            if (position.value.x > 0) {
                position.value.x = 0;
            } else if (imageRight < windowSize.width.value) {
                position.value.x = windowSize.width.value - scaledImageWidth;
            }
        } else {
            if (position.value.x < 0) {
                position.value.x = 0;
            } else if (imageRight > windowSize.width.value) {
                position.value.x = windowSize.width.value - scaledImageWidth;
            }
        }

        if (scaledImageHeight > windowSize.height.value) {
            if (position.value.y > 0) {
                position.value.y = 0;
            } else if (imageBottom < windowSize.height.value) {
                position.value.y = windowSize.height.value - scaledImageHeight;
            }
        } else {
            if (position.value.y < 0) {
                position.value.y = 0;
            } else if (imageBottom > windowSize.height.value) {
                position.value.y = windowSize.height.value - scaledImageHeight;
            }
        }
    };

    const handleDrag = ({
        dragging: draggingGesture,
        delta: [deltaX, deltaY],
        event,
        cancel,
    }: FullGestureState<'drag'>) => {
        if (panning.value && !draggingGesture) {
            panning.value = pinching.value = false;
            constrainToScreen();
            return;
        }

        if (pinching.value || !zoomedIn.value) return;

        if (!panning.value && draggingGesture) {
            if (
                typeof (event as MouseEvent).button !== 'undefined' &&
                (event as MouseEvent).button !== 0
            ) {
                cancel();
                return;
            }
            panning.value = true;
        } else if (panning.value && draggingGesture) {
            position.value.x = position.value.x + deltaX;
            position.value.y = position.value.y + deltaY;
        }
    };

    const handlePinch = ({
        da: [distance],
        pinching: pinchingGesture,
        origin: [ox, oy],
        event,
    }: FullGestureState<'pinch'>) => {
        event?.preventDefault();
        if (!opts.isContentLoaded()) {
            return;
        }
        if (!pinching.value && pinchingGesture) {
            // pinch start
            pinching.value = true;
            panning.value = true;
            zoomedIn.value = true;
            pinchData.pinchInitialDistance = distance;
            pinchData.pinchStartRatio = currentRatio.value;
            pinchData.previousCenter = { x: ox, y: oy };
            opts.onZoomStart();
        } else if (pinching.value && pinchingGesture) {
            const newRatio =
                (pinchData.pinchStartRatio * distance) /
                pinchData.pinchInitialDistance;
            const originXInImageSpace = ox - position.value.x;
            const originYInImageSpace = oy - position.value.y;
            const newCenterXInImageSpace =
                (originXInImageSpace * newRatio) / currentRatio.value;
            const newCenterYInImageSpace =
                (originYInImageSpace * newRatio) / currentRatio.value;
            position.value = {
                x:
                    ox -
                    newCenterXInImageSpace +
                    ((ox - pinchData.previousCenter.x) * newRatio) /
                        currentRatio.value,
                y:
                    oy -
                    newCenterYInImageSpace +
                    ((oy - pinchData.previousCenter.y) * newRatio) /
                        currentRatio.value,
            };
            pinchData.previousCenter = { x: ox, y: oy };
            currentRatio.value = newRatio;
        }
    };

    const handleWheel = ({
        delta: [x, y],
        event,
    }: FullGestureState<'wheel'>) => {
        event?.preventDefault();
        if (!opts.isContentLoaded()) {
            return;
        }
        const newRatio = Math.max(
            initialRatio.value * 0.1,
            currentRatio.value * (1 + Math.max(-1, (-y || x) / 500)),
        );
        const mouseX = (event as WheelEvent).clientX;
        const mouseY = (event as WheelEvent).clientY;
        const mouseXInImageSpace = mouseX - position.value.x;
        const mouseYInImageSpace = mouseY - position.value.y;
        const newMouseXInImageSpace =
            (mouseXInImageSpace * newRatio) / currentRatio.value;
        const newMouseYInImageSpace =
            (mouseYInImageSpace * newRatio) / currentRatio.value;
        position.value = {
            x: mouseX - newMouseXInImageSpace,
            y: mouseY - newMouseYInImageSpace,
        };
        currentRatio.value = newRatio;
        zoomedIn.value = true;
        opts.onZoomStart();
    };

    const fitToWindow = (loaded: boolean, hasElement: boolean) => {
        let newInitialRatio = 1;
        let resetPosition = false;

        if (
            mediaSize.value.x &&
            mediaSize.value.y &&
            (mediaSize.value.x > windowSize.width.value ||
                mediaSize.value.y > windowSize.height.value)
        )
            newInitialRatio = Math.min(
                windowSize.width.value / mediaSize.value.x,
                windowSize.height.value / mediaSize.value.y,
            );

        if (initialRatio.value === currentRatio.value) {
            currentRatio.value = newInitialRatio;
            resetPosition = true;
        }

        initialRatio.value = newInitialRatio;
        if (!loaded || resetPosition) {
            position.value = {
                x: windowSize.width.value / 2,
                y: windowSize.height.value / 2,
            };
            if (resetPosition && hasElement) {
                position.value.x -=
                    (currentRatio.value * mediaSize.value.x) / 2;
                position.value.y -=
                    (currentRatio.value * mediaSize.value.y) / 2;
            }
        }
    };

    return {
        centerOnScreen,
        constrainToScreen,
        currentRatio,
        fitToWindow,
        handleDoubleClick,
        handleDrag,
        handlePinch,
        handleWheel,
        mediaSize,
        panning,
        delayedPanning,
        position,
        unzoom,
        windowSize,
        zoomedIn,
    };
}
