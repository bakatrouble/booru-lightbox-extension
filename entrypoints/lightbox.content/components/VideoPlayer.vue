<script setup lang="ts">
import { useFullscreen } from '@vueuse/core';
import type { HTMLAttributes } from 'vue';
import { ref, watch } from 'vue';
import Btn from '~lightbox/atoms/Btn.vue';
import Panel from '~lightbox/atoms/Panel.vue';
import Slider from '~lightbox/atoms/Slider.vue';
import { useVideoPlayback } from '~lightbox/composables/useVideoPlayback';
import { useVideoToolbar } from '~lightbox/composables/useVideoToolbar';
import { useViewerStore } from '~lightbox/stores/viewer';

interface VideoPlayerProps extends /* @vue-ignore */ HTMLAttributes {
    panning: boolean;
    isCurrent?: boolean;
}

const {
    panning,
    isCurrent,
    class: className,
    ...props
} = defineProps<VideoPlayerProps>();

const emit = defineEmits(['loadedMetadata']);

const viewer = useViewerStore();

const loaded = ref(false);
const videoContainer = ref<HTMLElement>();
const fullscreenToolbarTarget = ref<HTMLElement>();
const {
    isFullscreen,
    isSupported: isFullscreenSupported,
    toggle: fullscreenToggle,
} = useFullscreen(videoContainer);

const {
    video,
    playing,
    currentTime,
    duration,
    volume,
    muted,
    formattedTime,
    formattedLength,
    bufferedSegments,
    togglePlay,
    pause,
    onPressStart: onMouseDown,
    onPressEnd: onMouseUp,
} = useVideoPlayback();

const { toolbar, blurToolbar, toolbarLock, hideToolbar } = useVideoToolbar({
    isCurrent: () => isCurrent,
    onTogglePlay: togglePlay,
});

const onLoadedMetadata = () => {
    loaded.value = true;
    emit('loadedMetadata', video.value!.videoWidth, video.value!.videoHeight);
};

watch(
    () => isCurrent,
    () => {
        if (!isCurrent) {
            hideToolbar();
        }
    },
);

defineExpose({
    pause,
});
</script>

<template>
    <div
        v-bind="props"
        ref="videoContainer"
        :class="['group', className]"
        :data-panning="panning"
        :data-paused="!playing"
        @mousedown="onMouseDown"
        @mouseup="onMouseUp"
    >
        <video
            ref="video"
            :controls="false"
            :draggable="false"
            :loop="true"
            unselectable="on"
            @loadedmetadata="onLoadedMetadata"
        >
            <slot />
        </video>

        <div class="shade">
            <btn icon="play" class="play-btn" />
        </div>

        <div ref="fullscreenToolbarTarget" />

        <Teleport
            :to="isFullscreen ? fullscreenToolbarTarget : viewer.toolbarTarget"
            :disabled="!isCurrent || !loaded || !viewer.toolbarTarget"
        >
            <div class="absolute bottom-5 left-0 right-0 flex flex-row justify-center items-center">
                <panel
                    class="video-toolbar w-1/2 blur-out transition-opacity-interactive!"
                    :data-visible="toolbar && isCurrent"
                    :data-blur="blurToolbar"
                    @mouseenter="toolbarLock = true"
                    @mouseleave="toolbarLock = false"
                    @mousedown.stop
                >
                    <btn
                        class="play-btn"
                        @click="playing = !playing"
                        :icon="playing ? 'pause' : 'play'"
                    />
                    <div class="flex flex-row items-center overflow-hidden w-10 hover:w-30 transition-all">
                        <btn
                            @click="muted = !muted"
                            :icon="muted ? 'volumeOff' : 'volumeHigh'"
                        />
                        <slider
                            class="w-24"
                            :model-value="volume"
                            :max="1"
                            @update:model-value="volume = $event!"
                        />
                    </div>
                    <span class="mx-4">{{ formattedTime }}</span>
                    <slider
                        :model-value="currentTime"
                        class="progress-slider grow"
                        :max="duration"
                        :buffers="bufferedSegments"
                        @update:model-value="currentTime = $event!"
                    />
                    <span class="mx-4">{{ formattedLength }}</span>
                    <btn
                        v-if="isFullscreenSupported"
                        @click="fullscreenToggle()"
                        icon="fullscreen"
                    />
                </panel>
            </div>
        </Teleport>
    </div>
</template>

<style scoped lang="css">
@reference "~/assets/tailwind.css";

@layer components {
    .video {
        @apply
            absolute
            overflow-hidden
            data-[panning="false"]:transition-[width,height,top,left];

        video {
            @apply
                pointer-events-none
                w-full
                h-full;
        }

        .shade {
            @apply
                absolute
                top-0
                left-0
                right-0
                bottom-0
                flex
                justify-center
                items-center
                transition-opacity
                bg-black/60
                group-data-[paused="false"]:opacity-0;

            .play-btn {
                @apply
                    transition-[scale]
                    group-data-[paused="false"]:scale-200;
            }
        }
    }

    .video-toolbar {
        @apply
            pointer-events-auto
            flex
            flex-row
            items-center;
    }
}
</style>
