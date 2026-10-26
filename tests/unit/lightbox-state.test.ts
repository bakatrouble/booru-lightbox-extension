import { flushPromises, mount } from '@vue/test-utils';
import { GesturePlugin } from '@vueuse/gesture';
import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it, type Mock, vi } from 'vitest';
import { nextTick } from 'vue';
import LightBox from '~lightbox/components/LightBox.vue';
import { MediaType } from '~lightbox/mediaType';
import { useMediaStore } from '~lightbox/stores/media';
import { useUploadStore } from '~lightbox/stores/upload';
import { useViewerStore } from '~lightbox/stores/viewer';
import { stubBrowser } from './setup';

// Pinned Track 1 regressions. Each test below FAILS on the current code and
// PASSES once the defect is fixed; they are flipped to `it.fails` after the
// failure reason is verified, so the suite stays green until the fix lands
// (vitest then reports "unexpected pass" as a reminder to drop the marker).

const FULL_SRC = 'https://media.test/full.jpg';
const PREVIEW_SRC = 'https://media.test/preview.jpg';

const uploadLink = {
    id: 'test',
    name: 'Test uploader',
    shortName: 'UPL',
    apiKey: 'test-key',
    hotkey: ['u'],
};

const makeItem = () => ({
    el: document.createElement('a'),
    item: {
        src: FULL_SRC,
        preview: PREVIEW_SRC,
        type: MediaType.Image,
        pageUrl: 'https://media.test/post/1',
    },
});

const sendMessage = () => stubBrowser.runtime.sendMessage as unknown as Mock;

const mountViewer = () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    sendMessage().mockResolvedValue([uploadLink]);
    const viewer = useViewerStore(pinia);
    viewer.configure({ callback: async () => [], domains: 'test' });
    // NOTE: imageList starts empty and is filled via the store, mirroring
    // production (App.vue scans after mount). Seeding items before mount
    // would skip the imageList watcher that sizes the load window, so
    // nothing would ever load.
    // `as any`: test-utils cannot infer <script setup> props; the mount
    // options are verified by the tests themselves, not the compiler.
    const wrapper = mount(LightBox as any, {
        attachTo: document.body,
        global: {
            plugins: [pinia, GesturePlugin],
            stubs: { mdicon: true },
            provide: { locate: () => {} },
        },
    });
    return { pinia, viewer, wrapper };
};

type ViewerCtx = ReturnType<typeof mountViewer>;

const openViewer = async ({ viewer }: ViewerCtx) => {
    viewer.imageList = [makeItem()];
    await flushPromises();
    viewer.show = true;
    // the show watcher awaits nextTick + 100ms + metadata load
    await new Promise((r) => setTimeout(r, 300));
    await flushPromises();
};

const closeViewer = async ({ viewer }: ViewerCtx) => {
    viewer.show = false;
    await nextTick();
    await flushPromises();
};

const uploadButton = ({ wrapper }: ViewerCtx) => {
    const btn = wrapper
        .findAll('button')
        .find((b) => (b.text() || '').includes('UPL'));
    if (!btn)
        throw new Error('upload button did not render (media not loaded?)');
    return btn;
};

const uploadCalls = () =>
    sendMessage().mock.calls.filter((c) => (c[1] as any)?.type === 'upload');

const noticeCalls = () =>
    sendMessage().mock.calls.filter((c) =>
        ['notification', 'remove-notification'].includes((c[1] as any)?.type),
    );

// jsdom never loads images by itself; dispatching `load` drives the
// component handlers (and the fullLoaded flag the upload queue reads).
const loadMainImage = async ({ wrapper }: ViewerCtx) => {
    wrapper
        .find('.slide-0 img.image.main')
        .element.dispatchEvent(new Event('load'));
    await nextTick();
    await flushPromises();
};

const mockCanvas = () => {
    const drawImage = vi.fn();
    const proto = HTMLCanvasElement.prototype as any;
    const origGetContext = proto.getContext;
    const origToBlob = proto.toBlob;
    proto.getContext = vi.fn(() => ({
        rect: vi.fn(),
        fill: vi.fn(),
        drawImage,
    }));
    proto.toBlob = vi.fn((cb: (blob: Blob | null) => void) =>
        cb(new Blob(['fake-jpeg-bytes'], { type: 'image/jpeg' })),
    );
    return {
        drawImage,
        restore: () => {
            proto.getContext = origGetContext;
            proto.toBlob = origToBlob;
        },
    };
};

describe('Track 1 viewer-state pins', () => {
    // NOTE: this test runs first on purpose. It asserts global document
    // state (whether a wheel event gets preventDefaulted), and every mount
    // below permanently leaks its own blockers onto document (unmount only
    // removes key listeners) — so this test can only observe its own mount
    // when nothing ran before it in this file.
    it('removes scroll blockers when show flips false without close() (1.2)', async () => {
        // clean-room precondition: no earlier mount may have polluted
        // document, or a failure below would blame the wrong mount
        const baseline = new Event('wheel', { cancelable: true });
        document.dispatchEvent(baseline);
        expect(baseline.defaultPrevented).toBe(false);

        const ctx = mountViewer();
        const { wrapper } = ctx;
        try {
            await openViewer(ctx);
            // simulates the rescan-close path: only the store flag flips,
            // close() (which owns the removeEventListener calls) never runs
            await closeViewer(ctx);
            const evt = new Event('wheel', { cancelable: true });
            document.dispatchEvent(evt);
            expect(evt.defaultPrevented).toBe(false);
        } finally {
            wrapper.unmount();
        }
    });

    it('clears held keys on close so later hotkeys still match (1.4)', async () => {
        const canvas = mockCanvas();
        const ctx = mountViewer();
        const { wrapper } = ctx;
        try {
            await openViewer(ctx);
            await loadMainImage(ctx);
            // control: hotkey works on a fresh open (validates the harness;
            // if THIS fails, the setup below it is meaningless)
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'u' }));
            await flushPromises();
            expect(uploadCalls()).toHaveLength(1);
            document.dispatchEvent(new KeyboardEvent('keyup', { key: 'u' }));
            // scenario: hold 'x' across a close, then press the hotkey
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
            await closeViewer(ctx);
            document.dispatchEvent(new KeyboardEvent('keyup', { key: 'x' }));
            // reopen on the already-loaded list (no reseed needed)
            ctx.viewer.show = true;
            await flushPromises();
            await new Promise((r) => setTimeout(r, 300));
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'u' }));
            await flushPromises();
            await new Promise((r) => setTimeout(r, 50));
            expect(uploadCalls()).toHaveLength(2);
        } finally {
            canvas.restore();
            wrapper.unmount();
        }
    });

    it('clears held keys on window blur so later hotkeys still match (1.4)', async () => {
        const canvas = mockCanvas();
        const ctx = mountViewer();
        const { wrapper } = ctx;
        try {
            await openViewer(ctx);
            await loadMainImage(ctx);
            // hold 'x', lose focus (its keyup goes to another app and never
            // arrives here), refocus, then press the hotkey
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
            window.dispatchEvent(new Event('blur'));
            document.dispatchEvent(new KeyboardEvent('keyup', { key: 'x' }));
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'u' }));
            await flushPromises();
            await new Promise((r) => setTimeout(r, 50));
            expect(uploadCalls()).toHaveLength(1);
        } finally {
            canvas.restore();
            wrapper.unmount();
        }
    });

    it('shows the loading indicator and blocks uploads while the preview shows', async () => {
        const canvas = mockCanvas();
        const ctx = mountViewer();
        const { wrapper } = ctx;
        const media = useMediaStore(ctx.pinia);
        const uploads = useUploadStore(ctx.pinia);
        try {
            await openViewer(ctx);
            const preview = wrapper.find('.slide-0 img.image.preview');
            expect(preview.exists()).toBe(true);
            preview.element.dispatchEvent(new Event('load'));
            await nextTick();
            await flushPromises();

            // the parent learns the preview is showing (the spinner and
            // the upload guard both read this flag)
            expect(media.previewShown[0]).toBe(true);
            expect(
                wrapper.find('.top-2.left-2 svg.progress-spinner').exists(),
            ).toBe(true);

            // uploads queue while the preview shows (one shared loading
            // notice no matter how often it is requested)
            await uploadButton(ctx).trigger('click');
            await uploadButton(ctx).trigger('click');
            await flushPromises();
            expect(uploadCalls()).toHaveLength(0);
            const queued = noticeCalls();
            expect(
                queued.filter((c) => (c[1] as any)?.type === 'notification'),
            ).toHaveLength(1);
            expect((queued[0] as any)?.[1]?.options?.level).toBe('loading');

            // full image arrives: notice removed first, then the two
            // queued uploads send (one per earlier click)
            wrapper
                .find('.slide-0 img.image.main')
                .element.dispatchEvent(new Event('load'));
            await nextTick();
            await flushPromises();
            expect(media.previewShown[0]).toBe(false);
            expect(
                wrapper.find('.top-2.left-2 svg.progress-spinner').exists(),
            ).toBe(false);
            await new Promise((r) => setTimeout(r, 50));
            expect(uploads.pendingUploads).toHaveLength(0);
            expect(uploadCalls()).toHaveLength(2);
            // the loading notice is removed before the requests send
            expect(
                noticeCalls().some(
                    (c) => (c[1] as any)?.type === 'remove-notification',
                ),
            ).toBe(true);
        } finally {
            canvas.restore();
            wrapper.unmount();
        }
    });

    it('queues uploads until the full image arrives, with a loading notice', async () => {
        const canvas = mockCanvas();
        const ctx = mountViewer();
        const { wrapper } = ctx;
        const uploads = useUploadStore(ctx.pinia);
        try {
            await openViewer(ctx);
            // nothing loaded yet: image data is unavailable
            await uploadButton(ctx).trigger('click');
            await flushPromises();
            expect(uploadCalls()).toHaveLength(0);
            expect(uploads.pendingUploads).toHaveLength(1);
            expect(
                noticeCalls().some(
                    (c) => (c[1] as any)?.type === 'notification',
                ),
            ).toBe(true);

            // full image arrives: notice removed first, then the upload sends
            await loadMainImage(ctx);
            await new Promise((r) => setTimeout(r, 50));
            expect(uploads.pendingUploads).toHaveLength(0);
            expect(
                noticeCalls().some(
                    (c) => (c[1] as any)?.type === 'remove-notification',
                ),
            ).toBe(true);
            expect(uploadCalls()).toHaveLength(1);
        } finally {
            canvas.restore();
            wrapper.unmount();
        }
    });

    it('uploads the full-resolution image, not the preview (1.5)', async () => {
        const canvas = mockCanvas();
        const ctx = mountViewer();
        const { wrapper } = ctx;
        try {
            await openViewer(ctx);
            await loadMainImage(ctx);
            const uploadBtn = uploadButton(ctx);
            await uploadBtn.trigger('click');
            await flushPromises();
            const drawn = canvas.drawImage.mock.calls[0]?.[0] as
                | HTMLImageElement
                | undefined;
            expect(drawn?.getAttribute('src')).toBe(FULL_SRC);
            // sent as raw bytes, not a base64 data URL (`sent` is `any`,
            // so direct access is fine — the assertions fail on undefined)
            const sent = uploadCalls()[0]![1] as any;
            expect(sent.method).toBe('photoArrayBuffer');
            expect(sent.apiKey).toBe('test-key');
            expect(sent.data).toBeInstanceOf(ArrayBuffer);
            expect(sent.data.byteLength).toBeGreaterThan(0);
        } finally {
            canvas.restore();
            wrapper.unmount();
        }
    });
});
