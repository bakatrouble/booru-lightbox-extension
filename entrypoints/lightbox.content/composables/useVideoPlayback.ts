import {
    useEventListener,
    useLocalStorage,
    useMediaControls,
} from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import { formatDuration } from '~lightbox/utils';

// Media element state for one player: the element ref, play state,
// persisted volume/mute, display-ready time/buffer values, and the
// click-to-toggle press handlers. Toolbar visibility, global listeners,
// and load events stay out (component / useVideoToolbar).
export function useVideoPlayback() {
    const video = ref<HTMLVideoElement>();
    const {
        volume: videoVolume,
        muted: videoMuted,
        currentTime,
        playing,
        duration,
    } = useMediaControls(video);
    const volume = useLocalStorage('lightbox.volume', 1, {
        mergeDefaults: true,
    });
    const muted = useLocalStorage('lightbox.muted', false, {
        mergeDefaults: true,
    });

    const formattedTime = computed(() => formatDuration(currentTime.value));
    const formattedLength = computed(() => formatDuration(duration.value));

    // useMediaControls refreshes its `buffered` on `progress` only, so the
    // newest range silently never shows: seek tails (data from cache fires
    // no `progress`), fully-cached media, and post-completion tails. Read
    // TimeRanges off the element on every event that can change them.
    const bufferedSegments = ref<{ start: number; end: number }[]>([]);
    const refreshBuffered = () => {
        const el = video.value;
        if (!el) {
            bufferedSegments.value = [];
            return;
        }
        const ranges: { start: number; end: number }[] = [];
        for (let i = 0; i < el.buffered.length; i++) {
            ranges.push({
                start: el.buffered.start(i),
                end: el.buffered.end(i),
            });
        }
        bufferedSegments.value = ranges;
    };
    useEventListener(
        video,
        [
            'progress',
            'loadedmetadata',
            'canplaythrough',
            'seeked',
            'timeupdate',
        ],
        refreshBuffered,
    );

    watch(volume, (value) => (videoVolume.value = value), { immediate: true });
    watch(muted, (value) => (videoMuted.value = value), { immediate: true });

    const togglePlay = () => {
        playing.value = !playing.value;
    };
    const pause = () => {
        playing.value = false;
    };

    // Click (press + release at the same spot) toggles playback; a drag
    // must not. The press origin renders nothing, so it is a plain local,
    // not reactive state. A release without a press never toggles.
    let pressOrigin: Vector2 | undefined;
    const onPressStart = (e: MouseEvent) => {
        pressOrigin = { x: e.clientX, y: e.clientY };
    };
    const onPressEnd = (e: MouseEvent) => {
        if (
            pressOrigin &&
            pressOrigin.x === e.clientX &&
            pressOrigin.y === e.clientY
        ) {
            togglePlay();
        }
        pressOrigin = undefined;
    };

    return {
        bufferedSegments,
        currentTime,
        duration,
        formattedLength,
        formattedTime,
        muted,
        onPressEnd,
        onPressStart,
        pause,
        playing,
        togglePlay,
        video,
        volume,
    };
}
