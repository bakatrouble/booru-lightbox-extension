<script setup lang="ts">
import { ref, watch } from 'vue';
import LoadingPlaceholder from '~lightbox/components/LoadingPlaceholder.vue';
import VideoPlayer from '~lightbox/components/VideoPlayer.vue';
import { useSlideViewport } from '~lightbox/composables/useSlideViewport';
import { MediaType } from '~lightbox/mediaType';
import { useMediaStore } from '~lightbox/stores/media';
import { useUploadStore } from '~lightbox/stores/upload';

const { media, current, index } = defineProps<{
    media: LoadedMediaListItem;
    current?: boolean;
    index: number;
}>();

const mediaStore = useMediaStore();
const uploads = useUploadStore();

const displayingPreview = defineModel<boolean>('displayingPreview', {
    default: false,
});

const emit = defineEmits(['zoomStart', 'zoomEnd']);

const loaded = ref(false);
const previewLoaded = ref(false);

const viewport = useSlideViewport({
    isContentLoaded: () => loaded.value,
    onZoomStart: () => emit('zoomStart'),
    onZoomEnd: () => emit('zoomEnd'),
});
const {
    currentRatio,
    handleDoubleClick: onDoubleClick,
    handleDrag: dragHandler,
    handlePinch: pinchHandler,
    handleWheel: wheelHandler,
    mediaSize,
    panning,
    delayedPanning,
    position,
} = viewport;

const image = ref<HTMLImageElement>();
const preview = ref<HTMLImageElement>();
const video = ref<typeof VideoPlayer>();
const slideRoot = ref<HTMLElement>();

// The store flag resets on mount: a remount starts unloaded even if the
// previous mount of this index finished (cached images re-fire load).
mediaStore.fullLoaded[index] = false;

watch(loaded, (isLoaded) => {
    if (isLoaded) {
        viewport.centerOnScreen();
    }
});

watch(
    () => current,
    (isCurrent) => {
        if (!isCurrent) {
            video.value?.pause();
            viewport.unzoom();
        }
    },
);

const onWindowResize = () => {
    viewport.fitToWindow(loaded.value, !!(image.value || video.value));
};
watch([viewport.windowSize.width, viewport.windowSize.height], onWindowResize);

const onImageLoad = (type: 'main' | 'preview') => {
    const element = type === 'main' ? image : preview;
    if (!element.value) return;
    viewport.mediaSize.value = {
        x: element.value.naturalWidth || 0,
        y: element.value.naturalHeight || 0,
    };
    if (type === 'preview') {
        previewLoaded.value = true;
        if (!loaded.value) {
            displayingPreview.value = true;
        }
    } else {
        loaded.value = true;
        mediaStore.fullLoaded[index] = true;
        displayingPreview.value = false;
        // A queued upload waits exactly for this moment: dismiss its
        // loading notice, then send.
        uploads.flushPending(index, slideRoot.value);
    }
    onWindowResize();
};

const onVideoLoad = (videoWidth: number, videoHeight: number) => {
    if (!video.value) return;
    viewport.mediaSize.value = {
        x: videoWidth || 0,
        y: videoHeight || 0,
    };
    loaded.value = true;
    displayingPreview.value = false;
    onWindowResize();
};
</script>

<template>
    <div :class="`slide-${index}`" ref="slideRoot">
        <loading-placeholder v-if="!(loaded || previewLoaded)">
            Loading media...
        </loading-placeholder>
        <div
            v-drag="dragHandler"
            v-pinch="pinchHandler"
            v-wheel="wheelHandler"
            :data-loaded="loaded"
            :data-preview-loaded="previewLoaded"
            :data-panning="panning"
            :data-panning-delayed="delayedPanning"
            class="content"
            @dblclick="onDoubleClick"
        >
            <img
                v-if="media.item.preview && !loaded"
                ref="preview"
                class="image preview"
                :src="media.item.preview"
                draggable="false"
                unselectable="on"
                crossorigin=""
                :style="{
                    width: `${mediaSize.x * currentRatio}px`,
                    height: `${mediaSize.y * currentRatio}px`,
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                }"
                @load="() => onImageLoad('preview')"
            />

            <img
                v-if="media.item.type === MediaType.Image"
                ref="image"
                class="image main"
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
                @load="() => onImageLoad('main')"
            />

            <video-player
                v-else-if="media.item.type === MediaType.Video"
                ref="video"
                class="video"
                :panning="panning"
                :isCurrent="current"
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
@reference "~/assets/tailwind.css";

@layer components {
    .content {
        @apply
            absolute
            top-0
            left-0
            right-0
            bottom-0
            transition-all
            cursor-grab
            opacity-0;

        &[data-panning="true"] {
            @apply
                cursor-grabbing;

            .image, .video {
                @apply
                    transition-none;
            }
        }

        &[data-panning-delayed="true"] {
            .video {
                @apply
                    pointer-events-none;
            }
        }

        &[data-loaded="true"], &[data-preview-loaded="true"] {
            @apply
                opacity-100;
        }

        &[data-loaded="false"]:not([data-preview-loaded="true"]) {
            .image.main, .video {
                @apply
                    !top-1/2
                    !left-1/2
                    !w-0
                    !h-0;
            }
        }

        &[data-preview-loaded="false"] {
            .image.preview {
                @apply
                    !top-1/2
                    !left-1/2
                    !w-0
                    !h-0;
            }
        }

        &[data-preview-loaded="true"][data-loaded="false"] {
            .image.main {
                @apply !opacity-0;
            }
        }

        .image, .video {
            position: absolute;
            max-width: unset;
            transition-property: width, height, top, left;
            transition-duration: var(--default-transition-duration);
            transition-timing-function: var(--default-transition-timing-function);
            opacity: 100%;
        }
    }
}
</style>
