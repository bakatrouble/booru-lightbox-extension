<script setup lang="ts">
import { useDebounce, useWindowSize } from '@vueuse/core';
import { FullGestureState } from '@vueuse/gesture';
import { MediaType } from '..';
import LoadingPlaceholder from './LoadingPlaceholder.vue';
import VideoPlayer from './VideoPlayer.vue';

const { media, current, sliding, index } = defineProps<{
    media: LoadedMediaListItem;
    current?: boolean;
    sliding?: boolean;
    index: number;
}>();

const emit = defineEmits(['zoomStart', 'zoomEnd']);

const loaded = ref(false);
const mediaSize = ref<Vector2>({ x: 0, y: 0 });
const windowSize = useWindowSize();
const initialRatio = ref(1);
const currentRatio = ref(1);
const panning = ref(false);
const position = ref<Vector2>({ x: 0, y: 0 });
const draggingStartPosition = ref<Vector2>({ x: 0, y: 0 });
const pinching = ref(false);
const zoomedIn = ref(false);
const delayedPanning = useDebounce(panning, 100);

const image = ref<HTMLImageElement>();
const video = ref<typeof VideoPlayer>();

watch(loaded, (loaded) => {
    if (loaded) {
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
    }
});

watch(
    () => current,
    (current) => {
        if (!current) {
            video.value?.pause();
            unzoom();
        }
    },
);

const unzoom = () => {
    currentRatio.value = initialRatio.value;
    position.value = {
        x:
            (windowSize.width.value - mediaSize.value.x * currentRatio.value) /
            2,
        y:
            (windowSize.height.value - mediaSize.value.y * currentRatio.value) /
            2,
    };
    zoomedIn.value = false;
    emit('zoomEnd');
};

const onDoubleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    unzoom();
    return true;
};

const dragHandler = ({
    dragging: draggingGesture,
    delta: [deltaX, deltaY],
    event,
    cancel,
}: FullGestureState<'drag'>) => {
    if (panning.value && !draggingGesture) {
        panning.value = pinching.value = false;

        {
            // constraint image into screen
            const scaledImageWidth = mediaSize.value.x * currentRatio.value;
            const scaledImageHeight = mediaSize.value.y * currentRatio.value;
            const imageRight = position.value.x + scaledImageWidth;
            const imageBottom = position.value.y + scaledImageHeight;

            if (scaledImageWidth > windowSize.width.value) {
                if (position.value.x > 0) {
                    position.value.x = 0;
                } else if (
                    imageRight < windowSize.width.value
                ) {
                    position.value.x =
                        windowSize.width.value - scaledImageWidth;
                }
            } else {
                if (position.value.x < 0) {
                    position.value.x = 0;
                } else if (
                    imageRight > windowSize.width.value
                ) {
                    position.value.x =
                        windowSize.width.value - scaledImageWidth;
                }
            }

            if (scaledImageHeight > windowSize.height.value) {
                if (position.value.y > 0) {
                    position.value.y = 0;
                } else if (
                    imageBottom < windowSize.height.value
                ) {
                    position.value.y =
                        windowSize.height.value - scaledImageHeight;
                }
            } else {
                if (position.value.y < 0) {
                    position.value.y = 0;
                } else if (
                    imageBottom > windowSize.height.value
                ) {
                    position.value.y =
                        windowSize.height.value - scaledImageHeight;
                }
            }
        }
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

const pinchData = reactive({
    pinchInitialDistance: 0,
    pinchStartRatio: 0,
    previousCenter: { x: 0, y: 0 } satisfies Vector2,
});

const pinchHandler = ({
    da: [distance],
    pinching: pinchingGesture,
    origin: [ox, oy],
    event,
}: FullGestureState<'pinch'>) => {
    event?.preventDefault();
    if (!pinching.value && pinchingGesture) {
        // pinch start
        pinching.value = true;
        panning.value = true;
        zoomedIn.value = true;
        draggingStartPosition.value = position.value;
        pinchData.pinchInitialDistance = distance;
        pinchData.pinchStartRatio = currentRatio.value;
        pinchData.previousCenter = { x: ox, y: oy };
        emit('zoomStart');
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

const wheelHandler = ({ delta: [x, y], event }: FullGestureState<'wheel'>) => {
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
    emit('zoomStart');
};

const onWindowResize = () => {
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
    if (!loaded.value || resetPosition) {
        position.value = {
            x: windowSize.width.value / 2,
            y: windowSize.height.value / 2,
        };
        const mediaElement = image.value || video.value;
        if (resetPosition && mediaElement) {
            position.value.x -= (currentRatio.value * mediaSize.value.x) / 2;
            position.value.y -= (currentRatio.value * mediaSize.value.y) / 2;
        }
    }
};
watch([windowSize.width, windowSize.height], onWindowResize);

const onImageLoad = () => {
    if (!image.value) return;
    mediaSize.value = {
        x: image.value.naturalWidth || 0,
        y: image.value.naturalHeight || 0,
    };
    loaded.value = true;
    onWindowResize();
};

const onVideoLoad = (videoWidth: number, videoHeight: number) => {
    if (!video.value) return;
    mediaSize.value = {
        x: videoWidth || 0,
        y: videoHeight || 0,
    };
    loaded.value = true;
    onWindowResize();
};
</script>

<template>
    <div :class="`slide-${index}`">
        <loading-placeholder v-if="!loaded">
            Loading media...
        </loading-placeholder>
        <div
            v-drag="dragHandler"
            v-pinch="pinchHandler"
            v-wheel="wheelHandler"
            :data-loaded="loaded"
            :data-panning="panning"
            :data-panning-delayed="delayedPanning"
            class="content"
            @dblclick="onDoubleClick"
        >
            <img
                v-if="media.item.type === MediaType.Image"
                ref="image"
                class="image"
                :src="media.item.src"
                draggable="false"
                unselectable="on"
                crossorigin=""
                :style="{
                    width: `${mediaSize.x * currentRatio}px`,
                    height: `${mediaSize.y * currentRatio}px`,
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                }"
                @load="onImageLoad"
            />

            <video-player
                v-else-if="media.item.type === MediaType.Video"
                ref="video"
                :panning="panning"
                :showing="current"
                :style="{
                    width: `${mediaSize.x * currentRatio}px`,
                    height: `${mediaSize.y * currentRatio}px`,
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                }"
                @loaded-metadata="onVideoLoad"
            >
                <source :src="media.item.src" />
            </video-player>
        </div>
    </div>
</template>

<style scoped lang="css">
@reference "@/assets/tailwind.css";

@layer components {
    .content {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        transition: opacity var(--default-transition-duration) var(--default-transition-timing-function);
        cursor: grab;
        opacity: 0;

        &[data-panning="true"] {
            cursor: grabbing;

            .image, .video {
                transition: none;
            }
        }

        &[data-panning-delayed="true"] {
            .video {
                pointer-events: none;
            }
        }

        &[data-loaded="true"] {
            opacity: 1;
        }

        .image, .video {
            position: absolute;
            max-width: unset;
            transition-property: width, height, top, left;
            transition-duration: var(--default-transition-duration);
            transition-timing-function: var(--default-transition-timing-function);
        }
    }
}
</style>
