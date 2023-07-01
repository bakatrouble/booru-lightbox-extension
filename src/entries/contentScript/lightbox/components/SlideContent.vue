<script setup lang="ts">
import { PropType, reactive, defineProps, watch, ref, onMounted, onUnmounted } from 'vue'
import LoadingPlaceholder from '~/entries/contentScript/lightbox/components/LoadingPlaceholder.vue';
import VideoPlayer from '~/entries/contentScript/lightbox/components/VideoPlayer.vue';
import { LoadedMediaListItem, MediaType, Vector2 } from '~/entries/contentScript/types';

const props = defineProps({
    media: {
        type: Object as PropType<LoadedMediaListItem>,
        required: true,
    },
    isCurrent: Boolean,
    index: {
        type: Number,
        required: true,
    },
});

const emit = defineEmits(['pinchStarted']);

const data = reactive({
    loaded: false,
    mediaSize: { x: 0, y: 0 } satisfies Vector2,
    screenSize: { x: 0, y: 0 } satisfies Vector2,
    initialRatio: 1,
    currentRatio: 1,
    dragging: false,
    position: { x: 0, y: 0 } satisfies Vector2,
    draggingStartPosition: { x: 0, y: 0 } satisfies Vector2,
    draggingStart: { x: 0, y: 0 } satisfies Vector2,
});

const image = ref<HTMLImageElement>();

watch(() => data.loaded, (loaded) => {
    if (loaded) {
        data.position = {
            x: (data.screenSize.x - data.mediaSize.x * data.currentRatio) / 2,
            y: (data.screenSize.y - data.mediaSize.y * data.currentRatio) / 2,
        }
    }
});

onMounted(() => {
    onWindowResize();
    window.addEventListener('resize', onWindowResize);
});

onUnmounted(() => {
    window.removeEventListener('resize', onWindowResize);
});

const onDoubleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    data.currentRatio = data.initialRatio;
    data.position = {
        x: (data.screenSize.x - data.mediaSize.x * data.currentRatio) / 2,
        y: (data.screenSize.y - data.mediaSize.y * data.currentRatio) / 2,
    };
};

const onWheel = (e: WheelEvent) => {
    e.stopPropagation();
    const direction = Math.sign(-e.deltaY || e.deltaX);
    const delta = direction * .25;
    const newRatio = data.currentRatio * (1 + delta);
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const mouseXInImageSpace = mouseX - data.position.x;
    const mouseYInImageSpace = mouseY - data.position.y;
    const newMouseXInImageSpace = mouseXInImageSpace * newRatio / data.currentRatio;
    const newMouseYInImageSpace = mouseYInImageSpace * newRatio / data.currentRatio;
    data.position = {
        x: mouseX - newMouseXInImageSpace,
        y: mouseY - newMouseYInImageSpace,
    }
    data.currentRatio = newRatio;
};

const onGestureGrab = (clientX: number, clientY: number, secondTouchStarted: boolean) => {
    if (data.currentRatio === data.initialRatio && !secondTouchStarted)
        return;
    data.dragging = true;
    data.draggingStart = {
        x: clientX,
        y: clientY,
    };
    data.draggingStartPosition = data.position;
    return true;
}

const onGestureDrag = (clientX: number, clientY: number) => {
    if (!data.dragging)
        return;

    data.position = {
        x: data.draggingStartPosition.x + clientX - data.draggingStart.x,
        y: data.draggingStartPosition.y + clientY - data.draggingStart.y,
    };
}

const onGestureRelease = () => {
    if (!data.dragging)
        return;

    if (data.position !== data.draggingStartPosition) {
        const scaledImageWidth = data.mediaSize.x * data.currentRatio;
        const scaledImageHeight = data.mediaSize.y * data.currentRatio;

        if (scaledImageWidth > data.screenSize.x) {
            if (data.position.x > 0) {
                data.position.x = 0;
            } else if (data.position.x + scaledImageWidth < data.screenSize.x) {
                data.position.x = data.screenSize.x - scaledImageWidth;
            }
        } else {
            if (data.position.x < 0) {
                data.position.x = 0;
            } else if (data.position.x + scaledImageWidth > data.screenSize.x) {
                data.position.x = data.screenSize.x - scaledImageWidth;
            }
        }

        if (scaledImageHeight > data.screenSize.y) {
            if (data.position.y > 0) {
                data.position.y = 0;
            } else if (data.position.y + scaledImageHeight < data.screenSize.y) {
                data.position.y = data.screenSize.y - scaledImageHeight;
            }
        } else {
            if (data.position.y < 0) {
                data.position.y = 0;
            } else if (data.position.y + scaledImageHeight > data.screenSize.y) {
                data.position.y = data.screenSize.y - scaledImageHeight;
            }
        }
    }

    data.dragging = false;
}

const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0)
        return;

    if (onGestureGrab(e.clientX, e.clientY, false)) {
        e.preventDefault();
        e.stopPropagation();
    }
}

const onTouchStart = (e: TouchEvent) => {
    const secondTouchStarted = e.touches[1] === e.changedTouches[0];
    if (onGestureGrab(e.touches[0].clientX, e.touches[0].clientY, secondTouchStarted)) {
        e.preventDefault();
        e.stopPropagation();
    }
    if (secondTouchStarted)
        emit('pinchStarted');
}

const onMouseMove = (e: MouseEvent) => {
    onGestureDrag(e.clientX, e.clientY);
}

const onTouchMove = (e: TouchEvent) => {
    onGestureDrag(e.touches[0].clientX, e.touches[0].clientY);
}

const onMouseUp = (e: MouseEvent) => {
    if (e.button !== 0)
        return;

    onGestureRelease();
}

const onTouchEnd = () => {
    onGestureRelease();
}

const onWindowResize = () => {
    data.screenSize = {
        x: window.innerWidth,
        y: window.innerHeight,
    };
    let newInitialRatio = 1;
    if (data.mediaSize.x && data.mediaSize.y && (data.mediaSize.x > data.screenSize.x || data.mediaSize.y > data.screenSize.y))
        newInitialRatio = Math.min(data.screenSize.x / data.mediaSize.x, data.screenSize.y / data.mediaSize.y);
    if (data.initialRatio === data.currentRatio)
        data.currentRatio = newInitialRatio;
    data.initialRatio = newInitialRatio;
    if (!data.loaded) {
        data.position = {
            x: data.screenSize.x / 2,
            y: data.screenSize.y / 2,
        };
    }
}

const onImageLoad = () => {
    data.mediaSize = {
        x: image.value!.naturalWidth || 0,
        y: image.value!.naturalHeight || 0,
    };
    data.loaded = true;
    onWindowResize();
}

const onVideoLoad = (width: number, height: number) => {
    data.mediaSize = {
        x: width || 0,
        y: height || 0,
    };
    data.loaded = true;
    onWindowResize();
}
</script>

<template>
    <div :class="`slide-${props.index}`">
        <loading-placeholder v-if="!data.loaded">
            Loading media...
        </loading-placeholder>
        <div
            :class="[ 'content', { dragging: data.dragging, loaded: data.loaded } ]"
            @dblclick="onDoubleClick"
            @wheel="onWheel"
            @mousedown="onMouseDown"
            @mousemove="onMouseMove"
            @mouseup="onMouseUp"
            @touchstart="onTouchStart"
            @touchmove="onTouchMove"
            @touchend="onTouchEnd"
        >
            <img
                v-if="media.item.type === MediaType.Image"
                ref="image"
                :class="[ 'image', { dragging: data.dragging, showing: isCurrent } ]"
                :src="media.item.src"
                draggable="false"
                unselectable="on"
                :style="{
                    width: `${data.mediaSize.x * data.currentRatio}px`,
                    height: `${data.mediaSize.y * data.currentRatio}px`,
                    left: `${data.position.x}px`,
                    top: `${data.position.y}px`,
                }"
                @load="onImageLoad"
            />

            <video-player
                v-else-if="media.item.type === MediaType.Video"
                :dragging="data.dragging"
                :position="data.position"
                :current-ratio="data.currentRatio"
                :media-size="data.mediaSize"
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
