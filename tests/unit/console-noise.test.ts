import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import backgroundDef from '~/entrypoints/background';
import Slider from '~lightbox/atoms/Slider.vue';
import Locate from '~lightbox/components/Locate.vue';
import { useLocateStore } from '~lightbox/stores/locate';
import { stubBrowser } from './setup';

// Track 1 console-noise guards (plan 1.8). These started as failing pins,
// but the defects were fixed before the pins landed (the logs are now gone
// from Slider.vue, Locate.vue, and background.ts), so they stand as plain
// regression guards: if a stray log is reintroduced, the suite goes red.

// jsdom has no layout, so useElementBounding always reports zeros and the
// Slider's drag guard would return before reaching its console.log. A static
// non-zero rect lets the test exercise the real drag path.
vi.mock('@vueuse/core', async (importOriginal) => {
    const mod = await importOriginal<typeof import('@vueuse/core')>();
    return {
        ...mod,
        useElementBounding: () => ({
            left: ref(100),
            width: ref(200),
            top: ref(0),
            height: ref(0),
            right: ref(300),
            bottom: ref(0),
            x: ref(100),
            y: ref(0),
            update: vi.fn(),
        }),
    };
});

describe('Track 1 console-noise pins (1.8)', () => {
    it('background CSP rewrite logs nothing', () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        try {
            (backgroundDef as unknown as { main: () => void }).main();
            const addListener =
                stubBrowser.webRequest.onHeadersReceived.addListener;
            expect(addListener).toHaveBeenCalledTimes(1);
            const call = addListener.mock.calls[0];
            if (!call) throw new Error('listener was not registered');
            const [listener] = call as any[];
            // control: the rewrite itself works (validates the harness)
            const out = listener({
                responseHeaders: [
                    {
                        name: 'Content-Security-Policy',
                        value: "default-src 'self'",
                    },
                    { name: 'X-Other', value: 'y' },
                ],
                url: 'https://e621.net/post',
            });
            expect(out).toEqual({
                responseHeaders: [
                    { name: 'X-Other', value: 'y' },
                    { name: 'content-security-policy', value: '*' },
                ],
            });
            expect(logSpy).not.toHaveBeenCalled();
        } finally {
            logSpy.mockRestore();
        }
    });

    it('Slider drag logs nothing', async () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const wrapper = mount(Slider, {
            attachTo: document.body,
            props: { modelValue: 0, max: 100 },
        });
        try {
            await wrapper
                .find('.slider-area')
                .trigger('mousedown', { clientX: 150 });
            document.dispatchEvent(
                new MouseEvent('mousemove', { clientX: 160 }),
            );
            await flushPromises();
            expect(logSpy).not.toHaveBeenCalled();
        } finally {
            wrapper.unmount();
            logSpy.mockRestore();
        }
    });

    it('Locate render logs nothing', async () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        // the box (and its :style binding) only renders once a target is
        // set; drive the store directly (the component exposes no API)
        const scrollIntoView = vi.fn();
        Element.prototype.scrollIntoView = scrollIntoView as any;
        vi.useFakeTimers();
        setActivePinia(createPinia());
        const wrapper = mount(Locate, { attachTo: document.body });
        try {
            const target = document.createElement('div');
            document.body.appendChild(target);
            const locating = useLocateStore().setLocateTarget(target);
            await vi.advanceTimersByTimeAsync(5000);
            await locating;
            expect(logSpy).not.toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
            delete (Element.prototype as any).scrollIntoView;
            wrapper.unmount();
            logSpy.mockRestore();
        }
    });
});
