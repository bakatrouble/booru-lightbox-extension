<script setup lang="ts">
import { Portal } from 'portal-vue';
import { HTMLAttributes } from 'vue';
import Btn from '@/entrypoints/lightbox.content/atoms/Btn.vue';
import Panel from '@/entrypoints/lightbox.content/atoms/Panel.vue';
import Slider from '@/entrypoints/lightbox.content/atoms/Slider.vue';
import { useDebounceFnStoppable } from '@/entrypoints/lightbox.content/composables/useDebounceFnStoppable';
import { formatDuration } from '../utils';

interface VideoPlayerProps extends /* @vue-ignore */ HTMLAttributes {
    panning: boolean;
    showing?: boolean;
}

const {
    panning,
    showing,
    class: className,
    ...props
} = defineProps<VideoPlayerProps>();

const emit = defineEmits(['loadedMetadata']);

const loaded = ref(false);
const volume = ref(0);
const muted = ref(false);
const currentTime = ref(0);
const paused = ref(true);
const toolbar = ref(true);
const blurToolbar = ref(true);
const duration = ref(0);
const toolbarLock = ref(false);
const buffered = ref<TimeRanges>();
const mouseDownLocation = ref<Vector2>({ x: 0, y: 0 });

const formattedTime = computed(() => formatDuration(currentTime.value));
const formattedLength = computed(() => formatDuration(duration.value));
const bufferedSegments = computed(() =>
    [...new Array(buffered.value?.length || 0).keys()].map((i) => ({
        start: buffered.value!.start(i),
        end: buffered.value!.end(i),
    })),
);

const video = ref<HTMLVideoElement>();

watch(
    () => video.value,
    (video) => {
        if (video) {
            volume.value = video.volume;
            muted.value = video.muted;
        }
    },
);

const hideToolbar = useDebounceFnStoppable(() => {
    if (!toolbarLock.value) {
        toolbar.value = false;
    }
}, 300);

onMounted(() => {
    hideToolbar();
    document.addEventListener('mousemove', onMouseMove);
    document.documentElement.addEventListener('mouseleave', hideToolbar);
});

onUnmounted(() => {
    hideToolbar.cancel();
    document.removeEventListener('mousemove', onMouseMove);
    document.documentElement.removeEventListener('mouseleave', hideToolbar);
});

const onLoadedMetadata = () => {
    loaded.value = true;
    duration.value = video.value!.duration;
    emit('loadedMetadata', video.value!.videoWidth, video.value!.videoHeight);
};

const onMouseMove = () => {
    if (!showing) return;
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
        if (video.value!.paused) video.value!.play();
        else video.value!.pause();
    }
};

const pause = () => {
    video.value?.pause();
};

watch(
    () => showing,
    () => {
        if (!showing) {
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
        :class="['video-player', 'group', className]"
        :data-panning="panning"
        :data-paused="paused"
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
            @volumechange="volume = video?.volume; muted = video?.muted"
            @timeupdate="currentTime = video?.currentTime"
            @pause="paused = true"
            @play="paused = false"
            @progress="buffered = video?.buffered"
        >
            <slot />
        </video>

        <div class="shade">
            <btn icon="play" class="play-btn" />
        </div>

        <portal to="video-toolbar" :disabled="!showing || !loaded">
            <div class="absolute bottom-5 left-0 right-0 flex flex-row justify-center items-center">
                <panel
                    class="video-toolbar w-1/2 blur-out !transition-opacity-interactive"
                    :data-visible="toolbar && showing"
                    :data-blur="blurToolbar"
                    @mouseenter="toolbarLock = true"
                    @mouseleave="toolbarLock = false"
                    @mousedown.stop
                >
                    <btn
                        class="play-btn"
                        @click="video!.paused ? video!.play() : video!.pause()"
                        :icon="paused ? 'play' : 'pause'"
                    />
                    <div class="flex flex-row items-center overflow-hidden w-10 hover:w-30 transition-all">
                        <btn
                            @click="video!.muted = !video!.muted"
                            :icon="muted ? 'volumeOff' : 'volumeHigh'"
                        />
                        <slider
                            class="w-24"
                            :model-value="volume"
                            :max="1"
                            @update:model-value="video!.volume = $event!"
                        />
                    </div>
                    <span class="mx-4">{{ formattedTime }}</span>
                    <slider
                        :model-value="currentTime"
                        class="progress-slider flex-grow-1"
                        :max="duration"
                        :buffers="bufferedSegments"
                        @update:model-value="video!.currentTime = $event!"
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
    .video-player {
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
