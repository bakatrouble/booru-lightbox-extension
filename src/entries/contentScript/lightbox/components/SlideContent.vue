<script setup lang="ts">
import { PropType, reactive, defineProps, watch, ref, onMounted, onUnmounted, ComponentPublicInstance } from 'vue'
import LoadingPlaceholder from './LoadingPlaceholder.vue';
import VideoPlayer from './VideoPlayer.vue';
import { LoadedMediaListItem, MediaType, Vector2 } from '~/entries/contentScript/types';
import browser from 'webextension-polyfill';

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
    zoomRatio: .25,
});

const image = ref<HTMLImageElement>();
const video = ref<ComponentPublicInstance<typeof VideoPlayer>>();

watch(() => data.loaded, (loaded) => {
    if (loaded) {
        data.position = {
            x: (data.screenSize.x - data.mediaSize.x * data.currentRatio) / 2,
            y: (data.screenSize.y - data.mediaSize.y * data.currentRatio) / 2,
        }
    }
});

watch(() => props.isCurrent, isCurrent => {
    if (!props.isCurrent)
        video.value?.pause();
})

onMounted(() => {
    onWindowResize();
    window.addEventListener('resize', onWindowResize);
    browser.storage.sync.get([
        'zoomRatio',
    ]).then(({ zoomRatio }) => console.log('loaded zoomRatio', data.zoomRatio = zoomRatio || .25));
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
    return true;
};

const onWheel = (e: WheelEvent) => {
    e.stopPropagation();
    const direction = Math.sign(-e.deltaY || e.deltaX);
    const delta = direction * data.zoomRatio;
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

const onMouseDown = (e: MouseEvent) => {
    if (data.currentRatio === data.initialRatio || e.button !== 0)
        return;
    e.preventDefault();
    e.stopPropagation();
    data.dragging = true;
    data.draggingStart = {
        x: e.clientX,
        y: e.clientY,
    };
    data.draggingStartPosition = data.position;
}

const onMouseMove = (e: MouseEvent) => {
    if (!data.dragging)
        return;
    data.position = {
        x: data.draggingStartPosition.x + e.clientX - data.draggingStart.x,
        y: data.draggingStartPosition.y + e.clientY - data.draggingStart.y,
    }
}

const onMouseUp = (e: MouseEvent) => {
    if (!data.dragging || e.button !== 0)
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
                ref="video"
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
