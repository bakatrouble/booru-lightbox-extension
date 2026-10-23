import { onMounted, onUnmounted } from 'vue';
import { usePageStore } from '~lightbox/stores/page';
import { useUploadStore } from '~lightbox/stores/upload';
import { useViewerStore } from '~lightbox/stores/viewer';

// Document-level key wiring over the stores. All state lives in Pinia; this
// only attaches listeners and dispatches. `getRoot` is component-owned DOM
// (the slide container the upload renders from) and so stays a callback.
export function useKeyboardNavigation(opts: {
    getRoot: () => HTMLElement | undefined;
    onEscape: () => void;
}) {
    const viewer = useViewerStore();
    const uploads = useUploadStore();
    const page = usePageStore();

    const onKeyPress = async (e: KeyboardEvent) => {
        if (!viewer.show) return;

        if (['Escape', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
        }

        uploads.addKey(e.key);
        const hotlink = uploads.matchHotkey();
        if (hotlink) {
            e.preventDefault();
            e.stopPropagation();
            await uploads.upload(hotlink, opts.getRoot());
            return;
        }

        if (e.key === 'Escape') {
            opts.onEscape();
        } else if (e.key === 'ArrowLeft') {
            await page.stepPrev();
        } else if (e.key === 'ArrowRight') {
            await page.stepNext();
        } else {
            return;
        }
    };

    const onKeyRelease = (e: KeyboardEvent) => {
        if (!viewer.show) return;
        uploads.releaseKey(e.key);
    };

    // Losing window focus means any held keys will never produce a keyup
    // here (it goes to the newly focused app), so drop the whole set.
    const onBlur = () => {
        uploads.clearKeys();
    };

    onMounted(() => {
        document.addEventListener('keydown', onKeyPress, { capture: true });
        document.addEventListener('keyup', onKeyRelease, { capture: true });
        window.addEventListener('blur', onBlur);
    });

    onUnmounted(() => {
        document.removeEventListener('keydown', onKeyPress);
        document.removeEventListener('keyup', onKeyRelease);
        window.removeEventListener('blur', onBlur);
    });
}
