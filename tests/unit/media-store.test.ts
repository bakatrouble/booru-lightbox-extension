import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { MediaType } from '~lightbox/mediaType';
import { useMediaStore } from '~lightbox/stores/media';
import { useViewerStore } from '~lightbox/stores/viewer';

const item = (id: string, el?: HTMLElement): MediaListItem => ({
    el: el ?? document.createElement('a'),
    item: {
        src: `https://media.test/${id}.jpg`,
        type: MediaType.Image,
        pageUrl: `https://media.test/post/${id}`,
    },
});

beforeEach(() => {
    setActivePinia(createPinia());
});

describe('media store', () => {
    it('loads the window around the current index', async () => {
        const viewer = useViewerStore();
        const media = useMediaStore();
        viewer.imageList = [item('a'), item('b'), item('c')];
        await nextTick();

        await media.loadImages(1);
        expect(media.loadedImages).toHaveLength(3);
        expect(media.loadedImages.map((l) => (l ? l.item.src : l))).toEqual([
            'https://media.test/a.jpg',
            'https://media.test/b.jpg',
            'https://media.test/c.jpg',
        ]);
        expect(media.currentMedia?.src).toBe('https://media.test/a.jpg');
    });

    it('preserves resolved entries for surviving elements', async () => {
        const viewer = useViewerStore();
        const media = useMediaStore();
        const shared = document.createElement('a');
        viewer.imageList = [item('a'), item('b', shared)];
        await nextTick();
        await media.loadImages(1);

        const kept = media.loadedImages[1];
        if (!kept) throw new Error('setup failed');
        expect(kept.item.src).toBe('https://media.test/b.jpg');

        viewer.imageList = [item('b2', shared), item('c')];
        await nextTick();
        // same element object → same entry object, no reload
        expect(media.loadedImages[0]).toBe(kept);
        expect(media.loadedImages[1]).toBeUndefined();
    });

    it('tracks per-slide preview visibility', () => {
        const media = useMediaStore();
        media.previewShown[0] = true;
        expect(media.previewShown[0]).toBe(true);
        expect(media.previewShown[1]).toBeUndefined();
    });
});
