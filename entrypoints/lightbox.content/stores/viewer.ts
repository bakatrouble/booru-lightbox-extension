import Timeout from 'await-timeout';
import { defineStore } from 'pinia';
import { nextTick, ref } from 'vue';

// Global viewer state: the scanned thumbnail list, the open slide, whether
// the lightbox is visible, which site module produced the list, and the
// animation gate. Owns the DOM scan and the click bindings; page integration
// (URL hash, rescan timer) stays in App.vue.
export const useViewerStore = defineStore('viewer', () => {
    const imageList = ref<MediaListItem[]>([]);
    const currentIdx = ref(0);
    const show = ref(false);

    // Anchor for the video toolbar Teleport. It must be the element itself,
    // not a selector: the app lives in a shadow root, which
    // document.querySelector cannot pierce. Set by LightBox on mount.
    const toolbarTarget = ref<HTMLElement>();
    const mod = ref<CollectImagesOptions | null>(null);
    const noAnimations = ref(false);

    const configure = (m: CollectImagesOptions) => {
        mod.value = m;
    };

    const openAt = (idx: number) => {
        currentIdx.value = idx;
        show.value = true;
    };

    const closeViewer = () => {
        show.value = false;
    };

    const slideTo = (idx: number) => {
        currentIdx.value = idx;
    };

    const slideBy = (delta: number) => {
        currentIdx.value += delta;
    };

    const runWithoutAnimation = async (fn: () => void) => {
        noAnimations.value = true;
        await nextTick();
        fn();
        await nextTick();
        await Timeout.set(100);
        noAnimations.value = false;
    };

    const scanImages = async (m: CollectImagesOptions) => {
        const newImageList = await m.callback();
        if (
            newImageList
                .map(({ el }) => el.hasAttribute('data-lightbox-attached'))
                .every(Boolean)
        )
            return;
        imageList.value = newImageList;
        imageList.value.forEach(({ el }, i) => {
            if (el.hasAttribute('data-lightbox-attached')) return;
            el.addEventListener('click', (e) => {
                e.preventDefault();
                openAt(i);
            });
            el.setAttribute('data-lightbox-attached', '');
        });
        show.value = false;
    };

    return {
        closeViewer,
        configure,
        currentIdx,
        imageList,
        mod,
        noAnimations,
        openAt,
        runWithoutAnimation,
        scanImages,
        show,
        slideBy,
        slideTo,
        toolbarTarget,
    };
});
