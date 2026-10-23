import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useViewerStore } from '~lightbox/stores/viewer';
import { resolveScalarOrFunction } from '~lightbox/utils';

// Resolved metadata for the slides around the current index, plus per-slide
// preview visibility. Entries for elements that survive a list replacement
// are kept, so a rescan doesn't re-resolve metadata that is already known.
export const useMediaStore = defineStore('media', () => {
    const viewer = useViewerStore();

    const loadedImages = ref<(LoadedMediaListItem | false | undefined)[]>([]);
    const previewShown = ref<boolean[]>([]);
    // Full-image data arrived per slide (set by SlideContent on main-image
    // load). Unlike previewShown this is meaningful for items without a
    // preview too; the upload queue reads it to decide queue-vs-send.
    const fullLoaded = ref<boolean[]>([]);

    watch(
        () => viewer.imageList,
        (val) => {
            const prev = new Map<HTMLElement, LoadedMediaListItem>();
            for (const entry of loadedImages.value) {
                if (entry) prev.set(entry.el, entry);
            }
            loadedImages.value = val.map((item) => prev.get(item.el));
        },
    );

    const loadImage = async (idx: number) => {
        if (
            idx < 0 ||
            idx >= loadedImages.value.length ||
            loadedImages.value[idx] !== undefined
        )
            return;
        loadedImages.value[idx] = false;
        const { el, item: itemData } = viewer.imageList[idx]!;
        const item = await resolveScalarOrFunction(itemData);
        loadedImages.value[idx] = {
            el,
            item: {
                preview: await resolveScalarOrFunction(item.preview),
                src: await resolveScalarOrFunction(item.src),
                label: await resolveScalarOrFunction(item.label),
                type: await resolveScalarOrFunction(item.type),
                pageUrl: await resolveScalarOrFunction(item.pageUrl),
            },
        };
    };

    const loadImages = async (baseIdx: number) => {
        await Promise.all([
            loadImage(baseIdx - 1),
            loadImage(baseIdx),
            loadImage(baseIdx + 1),
        ]);
    };

    watch(
        () => viewer.currentIdx,
        (val) => {
            loadImages(val);
        },
    );

    const currentMedia = computed(() => {
        const loaded = loadedImages.value[viewer.currentIdx];
        if (loaded) return loaded.item;
        return undefined;
    });

    return { currentMedia, fullLoaded, loadedImages, loadImages, previewShown };
});
