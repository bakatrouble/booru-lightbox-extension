<script setup lang="ts">
import { Portal } from 'portal-vue';
import { HTMLAttributes, ref, computed, watch, onMounted, onUnmounted } from 'vue';
import Btn from '@/entrypoints/lightbox.content/atoms/Btn.vue';
import Panel from '@/entrypoints/lightbox.content/atoms/Panel.vue';
import Slider from '@/entrypoints/lightbox.content/atoms/Slider.vue';
import { useDebounceFnStoppable } from '@/entrypoints/lightbox.content/composables/useDebounceFnStoppable';
import { formatDuration } from '../utils';
import { useLocalStorage, useMediaControls } from "@vueuse/core";

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

const loaded = ref(false);
const toolbar = ref(true);
const blurToolbar = ref(true);
const toolbarLock = ref(false);
const mouseDownLocation = ref<Vector2>({ x: 0, y: 0 });

const video = ref<HTMLVideoElement>();
const { volume: videoVolume, muted: videoMuted, currentTime, playing, duration, buffered } = useMediaControls(video);
const volume = useLocalStorage(`lightbox.volume`, 1, { mergeDefaults: true });
const muted = useLocalStorage(`lightbox.muted`, false, { mergeDefaults: true });

const formattedTime = computed(() => formatDuration(currentTime.value));
const formattedLength = computed(() => formatDuration(duration.value));
const bufferedSegments = computed(() =>
    buffered.value.map((segment) => ({
        start: segment[0],
        end: segment[1],
    })),
);

watch(volume, volume => videoVolume.value = volume, { immediate: true });
watch(muted, muted => videoMuted.value = muted, { immediate: true });

const hideToolbar = useDebounceFnStoppable(() => {
    if (!toolbarLock.value) {
        toolbar.value = false;
    }
}, 300);

const onKeyDown = (e: KeyboardEvent) => {
    if (!isCurrent) return;
    if (e.code === 'Space') {
        e.preventDefault();
        playing.value = !playing.value;
    }
}

onMounted(() => {
    hideToolbar();
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousemove', onMouseMove);
    document.documentElement.addEventListener('mouseleave', hideToolbar);
});

onUnmounted(() => {
    hideToolbar.cancel();
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.documentElement.removeEventListener('mouseleave', hideToolbar);
});

const onLoadedMetadata = () => {
    loaded.value = true;
    emit('loadedMetadata', video.value!.videoWidth, video.value!.videoHeight);
};

const onMouseMove = () => {
    if (!isCurrent) return;
    toolbar.value = true;
    blurToolbar.value = false;
    window.requestAnimationFrame(() => (blurToolbar.value = true));
    hideToolbar();
};

const onMouseDown = (e: MouseEvent) => {
    mouseDownLocation.value = {
        x: e.clientX,
        y: e.clientY,
    };
};

const onMouseUp = (e: MouseEvent) => {
    if (
        mouseDownLocation.value.x === e.clientX &&
        mouseDownLocation.value.y === e.clientY
    ) {
        playing.value = !playing.value;;
    }
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
    pause: () => playing.value = false,
});
</script>

<template>
    <div
        v-bind="props"
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
            <!--            @volumechange="volume = video?.volume || 0; muted = video?.muted || true"-->
            <!--            @timeupdate="currentTime = video?.currentTime || 0"-->
            <!--            @pause="playing = false"-->
            <!--            @play="playing = true"-->
            <!--            @progress="buffered = video?.buffered"-->
            <slot />
        </video>

        <div class="shade">
            <btn icon="play" class="play-btn" />
        </div>

        <portal to="video-toolbar" :disabled="!isCurrent || !loaded">
            <div class="absolute bottom-5 left-0 right-0 flex flex-row justify-center items-center">
                <panel
                    class="video-toolbar w-1/2 blur-out !transition-opacity-interactive"
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
                        class="progress-slider flex-grow-1"
                        :max="duration"
                        :buffers="bufferedSegments"
                        @update:model-value="currentTime = $event!"
                    />
                    <span class="mx-4">{{ formattedLength }}</span>
                    <btn
                        @click="video!.requestFullscreen()"
                        icon="fullscreen"
                    />
                </panel>
            </div>
        </portal>
    </div>
</template>

<style scoped lang="css">
@reference "@/assets/tailwind.css";

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
                transition-[opacity]
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
