<script setup lang="ts">
import type { FullGestureState } from '@vueuse/gesture';
import Timeout from 'await-timeout';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import Btn from '~lightbox/atoms/Btn.vue';
import Panel from '~lightbox/atoms/Panel.vue';
import Spinner from '~lightbox/atoms/Spinner.vue';
import LoadingPlaceholder from '~lightbox/components/LoadingPlaceholder.vue';
import SlideContent from '~lightbox/components/SlideContent.vue';
import { useKeyboardNavigation } from '~lightbox/composables/useKeyboardNavigation';
import { MediaType } from '~lightbox/mediaType';
import { useLocateStore } from '~lightbox/stores/locate';
import { useMediaStore } from '~lightbox/stores/media';
import { useUploadStore } from '~lightbox/stores/upload';
import { useViewerStore } from '~lightbox/stores/viewer';

const viewer = useViewerStore();
const mediaStore = useMediaStore();
const uploadStore = useUploadStore();
const locateStore = useLocateStore();

const $el = ref<HTMLElement>();
const toolbarTarget = ref<HTMLElement>();
const dragging = ref(false);
const pinching = ref(false);
const exitDirection = ref<'up' | 'down' | null>(null);
const draggingOffset = ref<Vector2>({ x: 0, y: 0 });
const copiedFeedback = ref(false);

const prevIdx = computed(() => viewer.currentIdx - 1);
const nextIdx = computed(() => viewer.currentIdx + 1);
const isFirstIdx = computed(() => viewer.currentIdx === 0);
const isLastIdx = computed(
    () => viewer.currentIdx === viewer.imageList.length - 1,
);
const isHorizontalSlide = computed(
    () =>
        Math.abs(draggingOffset.value.x * 2) > Math.abs(draggingOffset.value.y),
);

const close = () => {
    if (draggingOffset.value.y > 0) {
        exitDirection.value = 'down';
    } else if (draggingOffset.value.y < 0) {
        exitDirection.value = 'up';
    }
    viewer.closeViewer();
    uploadStore.clearKeys();
    setTimeout(() => {
        exitDirection.value = null;
    }, 300);
};

useKeyboardNavigation({
    getRoot: () => $el.value,
    onEscape: () => close(),
});

onMounted(() => {
    viewer.toolbarTarget = toolbarTarget.value;
    uploadStore.fetchLinks();
});

const cancelEvent = (e: Event) => e.preventDefault();

const dragHandler = ({
    movement: [x, y],
    dragging: gestureDragging,
    swipe: [swipeX, swipeY],
    event,
    cancel,
}: FullGestureState<'drag'>) => {
    if (gestureDragging) {
        if (!dragging.value && !pinching.value) {
            if (
                typeof (event as MouseEvent).button !== 'undefined' &&
                (event as MouseEvent).button !== 0
            ) {
                cancel();
                return;
            }
            dragging.value = true;
        } else if (!pinching.value) {
            draggingOffset.value = { x, y };
        }
    } else if (!gestureDragging && dragging.value) {
        if (swipeX > 0) {
            if (!isFirstIdx.value) viewer.slideBy(-1);
        } else if (swipeX < 0) {
            if (!isLastIdx.value) viewer.slideBy(1);
        } else if (swipeY !== 0) {
            close();
        }
        dragging.value = false;
        draggingOffset.value = { x: 0, y: 0 };
    }
};

watch(
    () => viewer.show,
    async (val, oldVal) => {
        if (val) {
            if (val !== oldVal) {
                viewer.noAnimations = true;
                await nextTick();
                await Timeout.set(100);
                viewer.noAnimations = false;
            }
            await mediaStore.loadImages(viewer.currentIdx);

            document.addEventListener('wheel', cancelEvent, { passive: false });
            document.addEventListener('gesturestart', cancelEvent);
            document.addEventListener('gesturechange', cancelEvent);
        } else {
            document.removeEventListener('wheel', cancelEvent);
            document.removeEventListener('gesturestart', cancelEvent);
            document.removeEventListener('gesturechange', cancelEvent);
        }
    },
);

const copyPageUrl = async () => {
    if (mediaStore.currentMedia?.pageUrl) {
        await navigator.clipboard.writeText(mediaStore.currentMedia?.pageUrl);

        copiedFeedback.value = true;
        await Timeout.set(1000 * 2);
        copiedFeedback.value = false;
    }
};

const locate = () => {
    close();
    locateStore.setLocateTarget(viewer.imageList[viewer.currentIdx].el);
};
</script>

<template>
    <div ref="$el" class="lightbox transition-opacity-interactive" :data-visible="viewer.show">
        <div
            v-drag="dragHandler"
            class="lightbox-content-wrapper"
            :data-anim="!viewer.noAnimations"
            :data-dragging="dragging"
            :data-exit-direction="exitDirection"
            :data-current-idx="viewer.currentIdx"
            :style="{
                left: `calc(-100vw * ${viewer.currentIdx} + ${dragging && isHorizontalSlide ? draggingOffset.x : 0}px)`,
                top: `${dragging && !isHorizontalSlide ? draggingOffset.y : 0}px`,
            }"
        >
            <div
                v-for="(item, idx) in mediaStore.loadedImages"
                :key="idx"
                class="lightbox-content-item"
            >
                <slide-content
                    v-if="idx >= prevIdx && idx <= nextIdx && item"
                    :media="item as any"
                    :index="idx"
                    :current="viewer.show && idx === viewer.currentIdx"
                    @zoom-start="() => pinching = true"
                    @zoom-end="() => pinching = false"
                    v-model:displaying-preview="mediaStore.previewShown[idx]"
                />
                <loading-placeholder v-else>
                    Loading metadata...
                </loading-placeholder>
            </div>
        </div>
        <panel v-if="mediaStore.currentMedia?.label" class="colored-links absolute bottom-4 left-4">
            <template v-if="typeof mediaStore.currentMedia.label === 'string'">
                {{ mediaStore.currentMedia.label }}
            </template>
            <component :is="mediaStore.currentMedia.label" v-else />
        </panel>
        <panel class="absolute top-2 left-2 flex flex-row items-center">
            {{ viewer.currentIdx + 1 }} / {{ mediaStore.loadedImages.length }}
            <div :class="['transition-all overflow-hidden', mediaStore.previewShown[viewer.currentIdx] ? 'w-7' : 'w-0']">
                <spinner v-if="mediaStore.previewShown[viewer.currentIdx]" size="calc(var(--spacing) * 5)" class="ml-2" />
            </div>
        </panel>
        <panel class="blur-out absolute top-2 right-2 flex flex-row gap-2 z-1">
            <btn
                v-if="mediaStore.currentMedia?.type === MediaType.Image"
                v-for="item in uploadStore.uploadLinks"
                :key="item.id"
                @click="uploadStore.upload(item, $el)"
                prepend-icon="upload"
            >
                {{ item.shortName }}
            </btn>
            <btn
                class="data-[feedback=true]:text-green-400"
                v-if="mediaStore.currentMedia?.pageUrl"
                :data-feedback="copiedFeedback"
                @click="copiedFeedback ? undefined : copyPageUrl()"
                :icon="copiedFeedback ? 'check' : 'contentCopy'"
            />
            <btn
                component="a"
                v-if="mediaStore.currentMedia?.pageUrl"
                :href="mediaStore.currentMedia?.pageUrl"
                target="_blank"
                icon="openInNew"
            />
            <btn
                class="icon button"
                @click="locate()"
                icon="magnify"
            />
            <btn
                class="icon button"
                @click="close()"
                icon="close"
            />
        </panel>
        <button
            class="left page button-activator"
            @click="!isFirstIdx && viewer.slideBy(-1)"
            :disabled="isFirstIdx"
        >
            <btn
                class="icon button"
                icon="chevronLeft"
                icon-size="30"
            />
        </button>
        <button
            class="right page button-activator"
            @click="!isLastIdx && viewer.slideBy(1)"
            :disabled="isLastIdx"
        >
            <btn
                class="icon button"
                icon="chevronRight"
                icon-size="30"
            />
        </button>
        <div ref="toolbarTarget" class="video-toolbar-target" />
    </div>
</template>

<style scoped lang="css">
@reference "~/assets/tailwind.css";

@layer components {
    .lightbox {
        /* Do not use var() here, with or without a fallback: the build
           leaves `var(--base-z-index)` as-is, and `:root` custom properties
           do not apply inside shadow DOM, so the z-index would collapse to
           `auto` and paint order would decide stacking. Hardcoded to match
           the uploader's notifications contract (viewer 100000000,
           notifications exactly one above). */
        z-index: 100000000;
        @apply
            fixed
            top-0
            left-0
            w-full
            h-full
            select-none
            bg-black/85
            text-(--color-text);
    }

    .lightbox-content-wrapper {
        @apply
            absolute
            flex
            transition-[top,left];

        &[data-anim="false"] {
            @apply
                transition-[top];
        }

        &[data-dragging="true"] {
            @apply
                transition-none;
        }

        &[data-exit-direction="up"] {
            top: -100vh !important;
        }

        &[data-exit-direction="down"] {
            top: 100vh !important;
        }
    }

    .lightbox-content-item {
        @apply
            relative
            h-screen
            w-screen
            flex
            items-center
            justify-center;
    }

    .page {
        @apply absolute
            top-0 bottom-0
            p-3
            flex justify-center items-center;

        &:not(:disabled) {
            @apply cursor-pointer;
        }

        &.left {
            @apply left-0;
        }

        &.right {
            @apply right-0;
        }
    }
}
</style>
