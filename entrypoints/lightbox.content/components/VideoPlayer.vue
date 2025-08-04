<script setup lang="ts">
import { mdiFullscreen, mdiPause, mdiPlay, mdiVolumeHigh, mdiVolumeLow, mdiVolumeOff } from '@mdi/js';
import _ from 'lodash';
import { Portal } from 'portal-vue';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { formatDuration } from '../utils';

const {
    dragging,
    mediaSize,
    position,
    currentRatio,
    isShowing,
} = defineProps<{
    dragging: boolean;
    mediaSize: Vector2;
    position: Vector2;
    currentRatio: number;
    isShowing?: boolean;
}>();

const emit = defineEmits(['loadedMetadata']);

const loaded = ref(false);
const volume = ref(0);
const isMute = ref(false);
const time = ref(0);
const isPlaying = ref(false);
const showToolbar = ref(true);
const length = ref(0);
const toolbarLock = ref(false);
const mouseDownLocation = ref<Vector2>({ x: 0, y: 0 });

const formattedTime = computed(() => formatDuration(time.value));
const formattedLength = computed(() => formatDuration(length.value));

const video = ref<HTMLVideoElement>();

watch(() => video.value, (video) => {
    if (video) {
        volume.value = video.volume;
        isMute.value = video.muted;
    }
});

const hideToolbarImmediately = () => {
    if (!toolbarLock.value) {
        showToolbar.value = false;
    }
};

const hideToolbar = _.debounce(hideToolbarImmediately, 2000);

onMounted(() => {
    hideToolbar();
    onVolumeChange();
    document.addEventListener('mousemove', onMouseMove);
    document.documentElement.addEventListener('mouseleave', hideToolbarImmediately);
});

onUnmounted(() => {
    hideToolbar.cancel();
    document.removeEventListener('mousemove', onMouseMove);
    document.documentElement.removeEventListener('mouseleave', hideToolbarImmediately);
});

const onLoadedMetadata = () => {
    loaded.value = true;
    length.value = video.value!.duration;
    emit('loadedMetadata', video.value!.videoWidth, video.value!.videoHeight);
}

const onVolumeChange = () => {
    volume.value = video.value!.volume;
    isMute.value = video.value!.muted;
}

const onTimeUpdate = () => {
    time.value = video.value!.currentTime;
}

const onPause = () => {
    isPlaying.value = false;
}

const onPlay = () => {
    isPlaying.value = true;
}

const onMouseMove = () => {
    if (!isShowing)
        return;
    showToolbar.value = true;
    hideToolbar();
}

const onMouseDown = (e: MouseEvent) => {
    mouseDownLocation.value = {
        x: e.clientX,
        y: e.clientY,
    };
}

const onMouseUp = (e: MouseEvent) => {
    if (mouseDownLocation.value.x === e.clientX && mouseDownLocation.value.y === e.clientY) {
        if (video.value!.paused)
            video.value!.play();
        else
            video.value!.pause();
    }
}

const onToolbarVolumeChange = (volume: number) => {
    video.value!.volume = volume;
}

const toggleMuted = () => {
    video.value!.muted = !video.value!.muted;
}

const requestFullscreen = () => {
    video.value!.requestFullscreen();
}

const updateVideoTime = (value: number) => {
    video.value!.currentTime = value;
}

const togglePlaying = () => {
    if (!isPlaying.value)
        video.value!.play();
    else
        video.value!.pause();
}

const pause = () => {
    video.value!.pause();
}

watch(() => isShowing, () => {
    if (!isShowing) {
        hideToolbar();
    }
});

defineExpose({
    pause,
});
</script>

<template>
    <div
        :class="[ 'video-player', { dragging } ]"
        :style="{
            width: `${mediaSize.x * currentRatio}px`,
            height: `${mediaSize.y * currentRatio}px`,
            left: `${position.x}px`,
            top: `${position.y}px`,
        }"
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
            @volumechange="onVolumeChange"
            @timeupdate="onTimeUpdate"
            @pause="onPause"
            @play="onPlay"
        >
            <slot />
        </video>

        <div :class="[ 'pause-shade', { 'playing': isPlaying } ]">
            <v-btn :icon="mdiPlay" class="play-btn" :ripple="false" />
        </div>

        <portal to="video-toolbar" :disabled="!isShowing || !loaded">
            <div :class="['video-toolbar-wrapper']">
                <v-sheet
                    :class="[ 'pa-2', 'video-toolbar', { visible: showToolbar && isShowing } ]"
                    rounded
                    @mouseenter="toolbarLock = true"
                    @mouseleave="toolbarLock = false"
                    @mousedown="$event.stopPropagation()"
                >
                    <div class="d-flex flex-column align-center pa-4">
                        <div class="d-flex flex-row align-center">
                            <v-btn
                                :icon="isPlaying ? mdiPause : mdiPlay"
                                variant="text"
                                size="x-large"
                                @click="togglePlaying"
                            />
                            <v-btn
                                :icon="mdiFullscreen"
                                variant="text"
                                size="large"
                                @click="requestFullscreen"
                            />
                        </div>
                        <v-slider
                            :model-value="time"
                            :class="['progress-slider', `length-${length}`]"
                            :min="0"
                            :max="length"
                            @update:model-value="updateVideoTime"
                            @mousedown="$event.stopPropagation()"
                        />
                        <div class="d-flex flex-row justify-space-between align-self-stretch">
                            <span>{{ formattedTime }}</span>
                            <span>{{ formattedLength }}</span>
                        </div>
                        <div class="d-flex flex-row align-center" style="width: 300px">
                            <v-btn
                                :icon="isMute ? mdiVolumeOff : mdiVolumeHigh"
                                variant="text"
                                @click="toggleMuted"
                            />
                            <v-slider
                                :model-value="volume"
                                :min="0"
                                :max="1"
                                @mousedown="$event.stopPropagation()"
                                @update:model-value="onToolbarVolumeChange"
                            >
                                <template v-slot:prepend>
                                    <v-icon color="#fff7" :icon="mdiVolumeLow" />
                                </template>
                                <template v-slot:append>
                                    <v-icon color="#fff7" :icon="mdiVolumeHigh" />
                                </template>
                            </v-slider>
                        </div>
                    </div>
                </v-sheet>
            </div>
        </portal>
    </div>
</template>

<style scoped lang="sass">
.video-player
    position: absolute
    overflow: hidden

    &:not(.dragging)
        transition: width .3s ease, height .3s ease, top .3s ease, left .3s ease

    video
        pointer-events: none
        width: 100%
        height: 100%

    .pause-shade
        position: absolute
        top: 0
        left: 0
        right: 0
        bottom: 0
        display: flex
        justify-content: center
        align-items: center
        transition: background-color ease .3s
        background-color: #0006

        .play-btn
            opacity: 1
            transform: scale(1)
            transition: opacity ease .3s, transform ease .3s

        &.playing
            background-color: #0000

            .play-btn
                opacity: 0
                transform: scale(2)

.video-toolbar
    width: 500px
    opacity: 0
    transition: opacity .3s ease

    &-wrapper
        position: absolute
        bottom: 20px
        left: 0
        right: 0
        display: flex
        justify-content: center
        pointer-events: none

    &.visible
        opacity: .5
        pointer-events: all

    .progress-slider
        width: 100%
</style>
