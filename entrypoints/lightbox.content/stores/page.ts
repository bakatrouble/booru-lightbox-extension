import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { useViewerStore } from '~lightbox/stores/viewer';

// Arrow-key stepping with cross-page navigation: pressing past either end
// twice jumps to the neighbouring gallery page (the slide hash tells the
// fresh page which end to open on).
export const usePageStore = defineStore('page', () => {
    const viewer = useViewerStore();

    const prevPageCounter = ref(0);
    const nextPageCounter = ref(0);

    watch([() => viewer.currentIdx === 0, prevPageCounter], () => {
        if (viewer.currentIdx !== 0 && prevPageCounter.value > 0) {
            prevPageCounter.value = 0;
        }
    });

    watch(
        [
            () => viewer.currentIdx === viewer.imageList.length - 1,
            nextPageCounter,
        ],
        () => {
            if (
                viewer.currentIdx !== viewer.imageList.length - 1 &&
                nextPageCounter.value > 0
            ) {
                nextPageCounter.value = 0;
            }
        },
    );

    const stepPrev = async () => {
        if (viewer.currentIdx !== 0) {
            await viewer.runWithoutAnimation(() => viewer.slideBy(-1));
        } else if (++prevPageCounter.value > 1) {
            const newUrl = viewer.mod?.getPrevPageUrl?.();
            if (newUrl) location.href = `${newUrl}#slide=last`;
        }
    };

    const stepNext = async () => {
        if (viewer.currentIdx !== viewer.imageList.length - 1) {
            await viewer.runWithoutAnimation(() => viewer.slideBy(1));
        } else if (++nextPageCounter.value > 1) {
            const newUrl = viewer.mod?.getNextPageUrl?.();
            if (newUrl) location.href = `${newUrl}#slide=0`;
        }
    };

    return { nextPageCounter, prevPageCounter, stepNext, stepPrev };
});
