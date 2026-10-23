import { onUnmounted, ref, watch } from 'vue';
import { useDebounceFnStoppable } from '~lightbox/composables/useDebounceFnStoppable';

interface VideoToolbarOptions {
    isCurrent: () => boolean | undefined;
    onTogglePlay: () => void;
}

// Toolbar auto-hide state plus the document listeners that drive it
// (mousemove to show, mouseleave to schedule hiding, Space to toggle).
// Listeners attach only while the slide is current, so background slides
// cost nothing — previously every mounted player listened forever.
export function useVideoToolbar(opts: VideoToolbarOptions) {
    const toolbar = ref(true);
    const blurToolbar = ref(true);
    const toolbarLock = ref(false);

    const hideToolbar = useDebounceFnStoppable(() => {
        if (!toolbarLock.value) {
            toolbar.value = false;
        }
    }, 300);

    // One rAF per frame at most: a mousemove storm must not queue one
    // callback per event.
    let blurQueued = false;
    const onMouseMove = () => {
        if (!opts.isCurrent()) return;
        toolbar.value = true;
        blurToolbar.value = false;
        if (!blurQueued) {
            blurQueued = true;
            window.requestAnimationFrame(() => {
                blurQueued = false;
                blurToolbar.value = true;
            });
        }
        hideToolbar();
    };

    const onKeyDown = (e: KeyboardEvent) => {
        if (!opts.isCurrent()) return;
        if (e.code === 'Space') {
            e.preventDefault();
            opts.onTogglePlay();
        }
    };

    const attach = () => {
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('mousemove', onMouseMove);
        document.documentElement.addEventListener('mouseleave', hideToolbar);
    };
    const detach = () => {
        hideToolbar.cancel();
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('mousemove', onMouseMove);
        document.documentElement.removeEventListener('mouseleave', hideToolbar);
    };

    watch(
        () => opts.isCurrent(),
        (current) => {
            if (current) attach();
            else detach();
        },
        { immediate: true },
    );
    onUnmounted(detach);

    // Start the idle-hide timer on mount, as before.
    hideToolbar();

    return {
        blurToolbar,
        hideToolbar,
        onMouseMove,
        toolbar,
        toolbarLock,
    };
}
