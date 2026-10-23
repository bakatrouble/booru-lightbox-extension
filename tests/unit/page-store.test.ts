import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { MediaType } from '~lightbox/mediaType';
import { usePageStore } from '~lightbox/stores/page';
import { useViewerStore } from '~lightbox/stores/viewer';

const seedList = (viewer: ReturnType<typeof useViewerStore>, n: number) => {
    viewer.imageList = Array.from({ length: n }, (_, i) => ({
        el: document.createElement('a'),
        item: {
            src: `https://media.test/${i}.jpg`,
            type: MediaType.Image,
        },
    }));
};

const makeMod = (over: Partial<CollectImagesOptions> = {}) => ({
    callback: vi.fn(async () => []),
    domains: 'test',
    ...over,
});

beforeEach(() => {
    setActivePinia(createPinia());
});

describe('page store', () => {
    it('steps within the list with animation', async () => {
        const viewer = useViewerStore();
        usePageStore();
        seedList(viewer, 3);
        viewer.configure(makeMod());
        viewer.openAt(0);

        const page = usePageStore();
        await page.stepNext();
        expect(viewer.currentIdx).toBe(1);
        expect(viewer.noAnimations).toBe(false);

        await page.stepPrev();
        expect(viewer.currentIdx).toBe(0);
        expect(viewer.noAnimations).toBe(false);
    });

    it('counts past-end presses and resets on slide', async () => {
        const viewer = useViewerStore();
        usePageStore();
        seedList(viewer, 2);
        viewer.configure(makeMod());
        viewer.openAt(1);

        const page = usePageStore();
        await page.stepNext();
        expect(viewer.currentIdx).toBe(1);
        expect(page.nextPageCounter).toBe(1);

        viewer.slideTo(0);
        await nextTick();
        expect(page.nextPageCounter).toBe(0);
    });

    it('jumps to the neighbouring page on a repeated past-end press', async () => {
        const viewer = useViewerStore();
        usePageStore();
        seedList(viewer, 2);
        // fragment-only "page" URL: jsdom performs hash navigation without
        // the "not implemented" error a real page change would raise
        viewer.configure(makeMod({ getNextPageUrl: () => '#page2' }));
        viewer.openAt(1);

        const page = usePageStore();
        await page.stepNext();
        await page.stepNext();
        expect(location.hash).toBe('#page2#slide=0');
    });
});
