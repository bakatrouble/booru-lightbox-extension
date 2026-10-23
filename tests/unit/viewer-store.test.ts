import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaType } from '~lightbox/mediaType';
import { useViewerStore } from '~lightbox/stores/viewer';

const makeThumbs = (n: number): MediaListItem[] =>
    Array.from({ length: n }, (_, i) => {
        const el = document.createElement('a');
        el.href = `#t${i}`;
        el.textContent = `thumb-${i}`;
        document.body.appendChild(el);
        return {
            el,
            item: {
                src: `https://media.test/${i}.jpg`,
                type: MediaType.Image,
                pageUrl: `https://media.test/post/${i}`,
            },
        };
    });

const makeMod = (items: MediaListItem[]): CollectImagesOptions => ({
    callback: vi.fn(async () => items),
    domains: 'test',
});

beforeEach(() => {
    setActivePinia(createPinia());
});

describe('viewer store', () => {
    it('opens, slides, and closes', () => {
        const viewer = useViewerStore();
        expect(viewer.show).toBe(false);
        expect(viewer.currentIdx).toBe(0);

        viewer.openAt(2);
        expect(viewer.currentIdx).toBe(2);
        expect(viewer.show).toBe(true);

        viewer.slideTo(0);
        expect(viewer.currentIdx).toBe(0);
        expect(viewer.show).toBe(true);

        viewer.slideBy(1);
        expect(viewer.currentIdx).toBe(1);

        viewer.closeViewer();
        expect(viewer.show).toBe(false);
        expect(viewer.currentIdx).toBe(1);
    });

    it('scans thumbnails, binds clicks, and opens on click', async () => {
        const viewer = useViewerStore();
        const items = makeThumbs(3);
        await viewer.scanImages(makeMod(items));

        expect(viewer.imageList).toHaveLength(3);
        for (const { el } of items) {
            expect(el.hasAttribute('data-lightbox-attached')).toBe(true);
        }

        items[1]!.el.dispatchEvent(
            new MouseEvent('click', { bubbles: true, cancelable: true }),
        );
        expect(viewer.show).toBe(true);
        expect(viewer.currentIdx).toBe(1);
    });

    it('skips rescan when every thumbnail is already bound', async () => {
        const viewer = useViewerStore();
        const items = makeThumbs(2);
        const mod = makeMod(items);
        await viewer.scanImages(mod);

        viewer.openAt(0);
        await viewer.scanImages(mod);
        // nothing new: list untouched, viewer stays open
        expect(viewer.imageList).toHaveLength(2);
        expect(viewer.show).toBe(true);
        expect(mod.callback).toHaveBeenCalledTimes(2);
    });

    it('replaces the list and closes on fresh scan results (by design)', async () => {
        const viewer = useViewerStore();
        await viewer.scanImages(makeMod(makeThumbs(2)));
        viewer.openAt(1);

        await viewer.scanImages(makeMod(makeThumbs(3)));
        expect(viewer.imageList).toHaveLength(3);
        expect(viewer.show).toBe(false);
    });

    it('stores the site module and suspends animations around a step', async () => {
        const viewer = useViewerStore();
        expect(viewer.mod).toBeNull();

        const mod = makeMod([]);
        viewer.configure(mod);
        // NOTE: toEqual, not toBe — Pinia exposes state through reactive
        // proxies, so identity never survives a store round-trip
        expect(viewer.mod).toEqual(mod);

        expect(viewer.noAnimations).toBe(false);
        await viewer.runWithoutAnimation(() => viewer.slideBy(2));
        expect(viewer.currentIdx).toBe(2);
        expect(viewer.noAnimations).toBe(false);
    });
});
