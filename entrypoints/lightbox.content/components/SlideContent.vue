<script setup lang="ts">
import { reactive, defineProps, watch, ref, onMounted, onUnmounted, ComponentPublicInstance } from 'vue'
import LoadingPlaceholder from './LoadingPlaceholder.vue';
import VideoPlayer from './VideoPlayer.vue';
import { FullGestureState } from '@vueuse/gesture';
import { MediaType } from '../index';

const {
    media,
    isCurrent,
    index,
} = defineProps< {
    media: LoadedMediaListItem,
    isCurrent? : boolean,
    index: number,
}>();

const emit = defineEmits(['zoomStart', 'zoomEnd']);

const loaded = ref(false);
const mediaSize = ref<Vector2>({ x: 0, y: 0 });
const screenSize = ref<Vector2>({ x: 0, y: 0 });
const initialRatio = ref(1);
const currentRatio = ref(1);
const dragging = ref(false);
const position = ref<Vector2>({ x: 0, y: 0 });
const draggingStartPosition = ref<Vector2>({ x: 0, y: 0 });
const pinching = ref(false);
const zoomedIn = ref(false);

const image = ref<HTMLImageElement>();
const video = ref<ComponentPublicInstance<typeof VideoPlayer>>();

watch(loaded, (loaded) => {
    if (loaded) {
        position.value = {
            x: (screenSize.value.x - mediaSize.value.x * currentRatio.value) / 2,
            y: (screenSize.value.y - mediaSize.value.y * currentRatio.value) / 2,
        }
    }
});

watch(() => isCurrent, isCurrent => {
    if (!isCurrent) {
        video.value?.pause();
        unzoom();
    }
})

onMounted(() => {
    onWindowResize();
    window.addEventListener('resize', onWindowResize);
});

onUnmounted(() => {
    window.removeEventListener('resize', onWindowResize);
});

const unzoom = () => {
    currentRatio.value = initialRatio.value;
    position.value = {
        x: (screenSize.value.x - mediaSize.value.x * currentRatio.value) / 2,
        y: (screenSize.value.y - mediaSize.value.y * currentRatio.value) / 2,
    };
    zoomedIn.value = false;
    emit('zoomEnd');
}

const onDoubleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    unzoom();
    return true;
};

const dragHandler = ({ dragging: draggingGesture, delta: [deltaX, deltaY], event, cancel }: FullGestureState<'drag'>) => {
    if (dragging.value && !draggingGesture) {
        dragging.value = pinching.value = false;

        {
            // constraint image into screen
            const scaledImageWidth = mediaSize.value.x * currentRatio.value;
            const scaledImageHeight = mediaSize.value.y * currentRatio.value;

            if (scaledImageWidth > screenSize.value.x) {
                if (position.value.x > 0) {
                    position.value.x = 0;
                } else if (position.value.x + scaledImageWidth < screenSize.value.x) {
                    position.value.x = screenSize.value.x - scaledImageWidth;
                }
            } else {
                if (position.value.x < 0) {
                    position.value.x = 0;
                } else if (position.value.x + scaledImageWidth > screenSize.value.x) {
                    position.value.x = screenSize.value.x - scaledImageWidth;
                }
            }

            if (scaledImageHeight > screenSize.value.y) {
                if (position.value.y > 0) {
                    position.value.y = 0;
                } else if (position.value.y + scaledImageHeight < screenSize.value.y) {
                    position.value.y = screenSize.value.y - scaledImageHeight;
                }
            } else {
                if (position.value.y < 0) {
                    position.value.y = 0;
                } else if (position.value.y + scaledImageHeight > screenSize.value.y) {
                    position.value.y = screenSize.value.y - scaledImageHeight;
                }
            }
        }
        return;
    }

    if (pinching.value || !zoomedIn.value)
        return;

    if (!dragging.value && draggingGesture) {
        if (typeof (event as MouseEvent).button !== 'undefined' && (event as MouseEvent).button !== 0) {
            cancel();
            return;
        }
        dragging.value = true;
    } else if (dragging.value && draggingGesture) {
        position.value.x = position.value.x + deltaX;
        position.value.y = position.value.y + deltaY;
    }
}

const pinchData = reactive({
    pinchInitialDistance: 0,
    pinchStartRatio: 0,
    previousCenter: { x: 0, y: 0 } satisfies Vector2,
});

const pinchHandler = ({ da: [distance], pinching: pinchingGesture, origin: [ox, oy], event }: FullGestureState<'pinch'>) => {
    event?.preventDefault();
    if (!pinching.value && pinchingGesture) {
        // pinch start
        pinching.value = true;
        dragging.value = true;
        zoomedIn.value = true;
        draggingStartPosition.value = position.value;
        pinchData.pinchInitialDistance = distance;
        pinchData.pinchStartRatio = currentRatio.value;
        pinchData.previousCenter = { x: ox, y: oy };
        emit('zoomStart');
    } else if (pinching.value && pinchingGesture) {
        const newRatio = pinchData.pinchStartRatio * distance / pinchData.pinchInitialDistance;
        const originXInImageSpace = ox - position.value.x;
        const originYInImageSpace = oy - position.value.y;
        const newCenterXInImageSpace = originXInImageSpace * newRatio / currentRatio.value;
        const newCenterYInImageSpace = originYInImageSpace * newRatio / currentRatio.value;
        position.value = {
            x: ox - newCenterXInImageSpace + (ox - pinchData.previousCenter.x) * newRatio / currentRatio.value,
            y: oy - newCenterYInImageSpace + (oy - pinchData.previousCenter.y) * newRatio / currentRatio.value,
        };
        pinchData.previousCenter = { x: ox, y: oy };
        currentRatio.value = newRatio;
    }
}

const wheelHandler = ({ delta: [x, y], event }: FullGestureState<'wheel'>) => {
    const newRatio = Math.max(initialRatio.value * .1, currentRatio.value * (1 + Math.max(-1, (-y || x) / 500)));
    const mouseX = (event as WheelEvent).clientX;
    const mouseY = (event as WheelEvent).clientY;
    const mouseXInImageSpace = mouseX - position.value.x;
    const mouseYInImageSpace = mouseY - position.value.y;
    const newMouseXInImageSpace = mouseXInImageSpace * newRatio / currentRatio.value;
    const newMouseYInImageSpace = mouseYInImageSpace * newRatio / currentRatio.value;
    position.value = {
        x: mouseX - newMouseXInImageSpace,
        y: mouseY - newMouseYInImageSpace,
    }
    currentRatio.value = newRatio;
    zoomedIn.value = true;
    emit('zoomStart');
}

const onWindowResize = () => {
    screenSize.value = {
        x: window.innerWidth,
        y: window.innerHeight,
    };
    let newInitialRatio = 1;
    let resetPosition = false;
    if (mediaSize.value.x && mediaSize.value.y && (mediaSize.value.x > screenSize.value.x || mediaSize.value.y > screenSize.value.y))
        newInitialRatio = Math.min(screenSize.value.x / mediaSize.value.x, screenSize.value.y / mediaSize.value.y);
    if (initialRatio.value === currentRatio.value) {
        currentRatio.value = newInitialRatio;
        resetPosition = true;
    }
    initialRatio.value = newInitialRatio;
    if (!loaded.value || resetPosition) {
        position.value = {
            x: screenSize.value.x / 2,
            y: screenSize.value.y / 2,
        };
        if (resetPosition && image.value) {
            position.value.x -= currentRatio.value * image.value.naturalWidth / 2;
            position.value.y -= currentRatio.value * image.value.naturalHeight / 2;
        }
    }
}

const onImageLoad = () => {
    if (!image.value)
        return;
    mediaSize.value = {
        x: image.value.naturalWidth || 0,
        y: image.value.naturalHeight || 0,
    };
    loaded.value = true;
    onWindowResize();
}

const onVideoLoad = (width: number, height: number) => {
    mediaSize.value = {
        x: width || 0,
        y: height || 0,
    };
    loaded.value = true;
    onWindowResize();
}
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
            :class="[ 'content', { dragging: dragging, loaded: loaded } ]"
            @dblclick="onDoubleClick"
        >
            <img
                v-if="media.item.type === MediaType.Image"
                ref="image"
                :class="[ 'image', { dragging: dragging, showing: isCurrent } ]"
                :src="media.item.src"
                draggable="false"
                unselectable="on"
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
                :dragging="dragging"
                :position="position"
                :current-ratio="currentRatio"
                :media-size="mediaSize"
                :is-showing="isCurrent"
                @loaded-metadata="onVideoLoad"
            >
                <source :src="media.item.src" />
            </video-player>
        </div>
    </div>
</template>

<style lang="sass" scoped>
.content
    position: absolute
    top: 0
    left: 0
    right: 0
    bottom: 0
    transition: opacity .3s
    cursor: grab
    opacity: 0

    &.dragging
        cursor: grabbing

    &.loaded
        opacity: 1

    .image
        position: absolute

        &:not(.dragging)
            transition: width .3s ease, height .3s ease, top .3s ease, left .3s ease

</style>
