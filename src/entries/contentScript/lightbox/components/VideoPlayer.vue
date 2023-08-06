<script setup lang="ts">
import { mdiFullscreen, mdiPause, mdiPlay, mdiVolumeHigh, mdiVolumeLow, mdiVolumeOff } from '@mdi/js';
import _ from 'lodash';
import { Portal } from 'portal-vue';
import { computed, defineComponent, onMounted, onUnmounted, PropType, reactive, ref, watch } from 'vue'
import { Vector2 } from '~/entries/contentScript/types';
import { formatDuration } from '../utils';

const props = defineProps({
    dragging: {
        type: Boolean,
        required: true,
    },
    mediaSize: {
        type: Object as PropType<Vector2>,
        required: true,
    },
    position: {
        type: Object as PropType<Vector2>,
        required: true,
    },
    currentRatio: {
        type: Number,
        required: true,
    },
    isShowing: Boolean,
});

const emit = defineEmits(['loadedMetadata']);

const data = reactive({
    loaded: false,
    volume: 0,
    isMute: false,
    time: 0,
    isPlaying: false,
    showToolbar: true,
    length: 0,
    toolbarLock: false,
    mouseDownLocation: { x: 0, y: 0 } satisfies Vector2,
});

const formattedTime = computed(() => formatDuration(data.time));
const formattedLength = computed(() => formatDuration(data.length));

const video = ref<HTMLVideoElement>();

watch(() => video.value, (video) => {
    if (video) {
        data.volume = video.volume;
        data.isMute = video.muted;
    }
});

const hideToolbar = _.debounce(() => {
    if (!data.toolbarLock) {
        data.showToolbar = false;
    }
}, 2000);

onMounted(() => {
    hideToolbar();
    onVolumeChange();
    document.addEventListener('mousemove', onMouseMove);
});

onUnmounted(() => {
    hideToolbar.cancel();
    document.removeEventListener('mousemove', onMouseMove);
});

const onLoadedMetadata = () => {
    data.loaded = true;
    data.length = video.value!.duration;
    emit('loadedMetadata', video.value!.videoWidth, video.value!.videoHeight);
}

const onVolumeChange = () => {
    data.volume = video.value!.volume;
    data.isMute = video.value!.muted;
}

const onTimeUpdate = () => {
    data.time = video.value!.currentTime;
}

const onPause = () => {
    data.isPlaying = false;
}

const onPlay = () => {
    data.isPlaying = true;
}

const onMouseMove = () => {
    data.showToolbar = true;
    hideToolbar();
}

const onMouseDown = (e: MouseEvent) => {
    data.mouseDownLocation = {
        x: e.clientX,
        y: e.clientY,
    };
}

const onMouseUp = (e: MouseEvent) => {
    if (data.mouseDownLocation.x === e.clientX && data.mouseDownLocation.y === e.clientY) {
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
    if (!data.isPlaying)
        video.value!.play();
    else
        video.value!.pause();
}

const pause = () => {
    video.value!.pause();
}

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

        <div :class="[ 'pause-shade', { 'playing': data.isPlaying } ]">
            <v-btn :icon="mdiPlay" class="play-btn" :ripple="false" />
        </div>

        <portal to="video-toolbar" :disabled="!isShowing || !data.loaded">
            <div class="video-toolbar-wrapper">
                <v-sheet
                    :class="[ 'pa-2', 'video-toolbar', { visible: data.showToolbar } ]"
                    rounded
                    @mouseenter="data.toolbarLock = true"
                    @mouseleave="data.toolbarLock = false"
                    @mousedown="$event.stopPropagation()"
                >
                    <div class="d-flex flex-column align-center pa-4">
                        <div class="d-flex flex-row align-center">
                            <v-btn
                                :icon="data.isPlaying ? mdiPause : mdiPlay"
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
                            :model-value="data.time"
                            :class="['progress-slider', `length-${data.length}`]"
                            :min="0"
                            :max="data.length"
                            @update:model-value="updateVideoTime"
                            @mousedown="$event.stopPropagation()"
                        />
                        <div class="d-flex flex-row justify-space-between align-self-stretch">
                            <span>{{ formattedTime }}</span>
                            <span>{{ formattedLength }}</span>
                        </div>
                        <div class="d-flex flex-row align-center" style="width: 300px">
                            <v-btn
                                :icon="data.isMute ? mdiVolumeOff : mdiVolumeHigh"
                                variant="text"
                                @click="toggleMuted"
                            />
                            <v-slider
                                :model-value="data.volume"
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
        opacity: 1
        pointer-events: all

    .progress-slider
        width: 100%
</style>
