import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import VideoPlayer from '~lightbox/components/VideoPlayer.vue';
import { useVideoPlayback } from '~lightbox/composables/useVideoPlayback';
import { useVideoToolbar } from '~lightbox/composables/useVideoToolbar';
import { useViewerStore } from '~lightbox/stores/viewer';

// The toolbar owns no DOM: every test below mounts a stub host and drives
// document-level events. Each test unmounts — the listeners under test live
// on `document`, so a leak would pollute the rest of the file.
const mountToolbar = (current: boolean) => {
    const onTogglePlay = vi.fn();
    const isCurrent = ref(current);
    const wrapper = mount(
        defineComponent({
            setup() {
                return useVideoToolbar({
                    isCurrent: () => isCurrent.value,
                    onTogglePlay,
                });
            },
            render() {
                return h('div');
            },
        }),
        { attachTo: document.body },
    );
    return { isCurrent, onTogglePlay, wrapper };
};

const idleHideMs = 450;

afterEach(() => {
    document.body.innerHTML = '';
});

describe('video toolbar', () => {
    it('hides after the idle timeout', async () => {
        const { wrapper } = mountToolbar(true);
        try {
            expect(wrapper.vm.toolbar).toBe(true);
            await new Promise((r) => setTimeout(r, idleHideMs));
            expect(wrapper.vm.toolbar).toBe(false);
        } finally {
            wrapper.unmount();
        }
    });

    it('mousemove shows the toolbar and reschedules hiding', async () => {
        const { wrapper } = mountToolbar(true);
        try {
            await new Promise((r) => setTimeout(r, idleHideMs));
            expect(wrapper.vm.toolbar).toBe(false);

            document.dispatchEvent(new Event('mousemove'));
            expect(wrapper.vm.toolbar).toBe(true);
            await new Promise((r) => setTimeout(r, 150));
            expect(wrapper.vm.toolbar).toBe(true);
            await new Promise((r) => setTimeout(r, 300));
            expect(wrapper.vm.toolbar).toBe(false);
        } finally {
            wrapper.unmount();
        }
    });

    it('lock prevents hiding until unlocked', async () => {
        const { wrapper } = mountToolbar(true);
        try {
            wrapper.vm.toolbarLock = true;
            await new Promise((r) => setTimeout(r, idleHideMs));
            expect(wrapper.vm.toolbar).toBe(true);

            wrapper.vm.toolbarLock = false;
            document.dispatchEvent(new Event('mousemove'));
            await new Promise((r) => setTimeout(r, idleHideMs));
            expect(wrapper.vm.toolbar).toBe(false);
        } finally {
            wrapper.unmount();
        }
    });

    it('ignores mousemove and Space while not current', async () => {
        const { onTogglePlay, wrapper } = mountToolbar(false);
        try {
            await new Promise((r) => setTimeout(r, idleHideMs));
            expect(wrapper.vm.toolbar).toBe(false);

            document.dispatchEvent(new Event('mousemove'));
            document.dispatchEvent(
                new KeyboardEvent('keydown', { code: 'Space' }),
            );
            await nextTick();
            expect(wrapper.vm.toolbar).toBe(false);
            expect(onTogglePlay).not.toHaveBeenCalled();
        } finally {
            wrapper.unmount();
        }
    });

    it('Space toggles playback while current', async () => {
        const { onTogglePlay, wrapper } = mountToolbar(true);
        try {
            document.dispatchEvent(
                new KeyboardEvent('keydown', { code: 'Space' }),
            );
            expect(onTogglePlay).toHaveBeenCalledTimes(1);
        } finally {
            wrapper.unmount();
        }
    });

    it('detaches listeners on slide-away', async () => {
        const { isCurrent, wrapper } = mountToolbar(true);
        try {
            await new Promise((r) => setTimeout(r, idleHideMs));
            expect(wrapper.vm.toolbar).toBe(false);

            isCurrent.value = false;
            await nextTick();
            document.dispatchEvent(new Event('mousemove'));
            await nextTick();
            // with the old always-attached listener this would show again
            expect(wrapper.vm.toolbar).toBe(false);
        } finally {
            wrapper.unmount();
        }
    });
});

describe('video press-to-toggle', () => {
    const mountPlayback = () => {
        const wrapper = mount(
            defineComponent({
                setup() {
                    return { pb: useVideoPlayback() };
                },
                render() {
                    return h('div');
                },
            }),
            { attachTo: document.body },
        );
        return wrapper;
    };

    const press = (x: number, y: number) =>
        ({ clientX: x, clientY: y }) as MouseEvent;

    it('click toggles playback, drag does not', async () => {
        const wrapper = mountPlayback();
        try {
            const { pb } = wrapper.vm as unknown as {
                pb: ReturnType<typeof useVideoPlayback>;
            };
            expect(pb.playing.value).toBe(false);

            pb.onPressStart(press(10, 10));
            pb.onPressEnd(press(10, 10));
            expect(pb.playing.value).toBe(true);

            pb.onPressStart(press(10, 10));
            pb.onPressEnd(press(30, 10));
            expect(pb.playing.value).toBe(true);
        } finally {
            wrapper.unmount();
        }
    });

    it('release without a press never toggles', async () => {
        const wrapper = mountPlayback();
        try {
            const { pb } = wrapper.vm as unknown as {
                pb: ReturnType<typeof useVideoPlayback>;
            };
            pb.onPressEnd(press(0, 0));
            expect(pb.playing.value).toBe(false);
        } finally {
            wrapper.unmount();
        }
    });
});

describe('video buffered ranges', () => {
    const mountPlaybackWithVideo = () => {
        // NOTE: `video` must be top-level setup state. `proxyRefs` is
        // shallow: assigning through the nested `pb` object (`vm.pb.video`)
        // would *replace* the ref instead of setting `.value`, silently
        // disconnecting the composable's closure (reads still look right).
        // SFC `ref="video"` templates are unaffected — only manual render
        // functions hit this.
        const wrapper = mount(
            defineComponent({
                setup() {
                    const pb = useVideoPlayback();
                    return { pb, video: pb.video };
                },
                render() {
                    const vm = this as unknown as {
                        video: HTMLVideoElement;
                    };
                    return h('video', {
                        ref: (el: unknown) => {
                            vm.video = el as HTMLVideoElement;
                        },
                    });
                },
            }),
            { attachTo: document.body },
        );
        return wrapper;
    };

    const setBuffered = (el: HTMLVideoElement, ranges: [number, number][]) => {
        Object.defineProperty(el, 'buffered', {
            configurable: true,
            value: {
                length: ranges.length,
                start: (i: number) => ranges[i]![0],
                end: (i: number) => ranges[i]![1],
            },
        });
    };

    const stubMedia = () => {
        const proto = HTMLMediaElement.prototype as unknown as Record<
            string,
            unknown
        >;
        const origPlay = proto.play;
        const origPause = proto.pause;
        proto.play = vi.fn().mockResolvedValue(undefined);
        proto.pause = vi.fn();
        return () => {
            proto.play = origPlay;
            proto.pause = origPause;
        };
    };

    it('reports ranges that arrive without a progress event', async () => {
        const restore = stubMedia();
        const wrapper = mountPlaybackWithVideo();
        try {
            // useEventListener registers in a post-flush watcher
            await nextTick();
            const { pb } = wrapper.vm as unknown as {
                pb: ReturnType<typeof useVideoPlayback>;
            };
            const el = wrapper.find('video').element as HTMLVideoElement;

            setBuffered(el, [[0, 10]]);
            el.dispatchEvent(new Event('progress'));
            await nextTick();
            expect(pb.bufferedSegments.value).toEqual([{ end: 10, start: 0 }]);

            // seek tail from cache: no `progress` follows, only `seeked`.
            // The old progress-only sync never reported this range.
            setBuffered(el, [
                [0, 10],
                [20, 30],
            ]);
            el.dispatchEvent(new Event('seeked'));
            await nextTick();
            expect(pb.bufferedSegments.value).toEqual([
                { end: 10, start: 0 },
                { end: 30, start: 20 },
            ]);
        } finally {
            wrapper.unmount();
            restore();
        }
    });
});

describe('video toolbar teleport', () => {
    it('renders in place until loaded, then moves to the store target', async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const viewer = useViewerStore(pinia);
        const target = document.createElement('div');
        document.body.appendChild(target);
        viewer.toolbarTarget = target;
        // `as any`: test-utils cannot infer <script setup> props.
        const wrapper = mount(VideoPlayer as any, {
            attachTo: document.body,
            props: { isCurrent: true, panning: false },
            global: {
                plugins: [pinia],
                stubs: { Btn: true, Panel: true, Slider: true },
            },
        });
        try {
            expect(target.querySelector('.video-toolbar')).toBeNull();
            wrapper
                .find('video')
                .element.dispatchEvent(new Event('loadedmetadata'));
            await nextTick();
            await flushPromises();
            expect(target.querySelector('.video-toolbar')).not.toBeNull();
        } finally {
            wrapper.unmount();
            target.remove();
        }
    });
});
