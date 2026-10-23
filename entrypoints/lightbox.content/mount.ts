import {
    mdiCheck,
    mdiChevronLeft,
    mdiChevronRight,
    mdiClose,
    mdiContentCopy,
    mdiFullscreen,
    mdiMagnify,
    mdiOpenInNew,
    mdiPause,
    mdiPlay,
    mdiUpload,
    mdiVolumeHigh,
    mdiVolumeOff,
} from '@mdi/js';
import { GesturePlugin } from '@vueuse/gesture';
import mdiVue from 'mdi-vue/v3';
import { createPinia } from 'pinia';
import PortalVue from 'portal-vue';
import { createApp } from 'vue';
import styles from '~/assets/tailwind.css?inline';
import Primary from '~lightbox/App.vue';
import { useMediaStore } from '~lightbox/stores/media';
import { usePageStore } from '~lightbox/stores/page';
import { useUploadStore } from '~lightbox/stores/upload';
import { useViewerStore } from '~lightbox/stores/viewer';

export const mountApp = (
    mod: CollectImagesOptions,
    container: HTMLElement | string,
) => {
    const pinia = createPinia();
    const app = createApp(Primary, { mod })
        .use(pinia)
        .use(PortalVue)
        .use(GesturePlugin)
        .use(mdiVue, {
            icons: {
                mdiContentCopy,
                mdiCheck,
                mdiOpenInNew,
                mdiUpload,
                mdiMagnify,
                mdiClose,
                mdiChevronLeft,
                mdiChevronRight,
                mdiFullscreen,
                mdiPause,
                mdiPlay,
                mdiVolumeOff,
                mdiVolumeHigh,
            },
        });
    app.mount(container);
    if (import.meta.env.DEV) {
        // Debug hook: inspect and drive viewer state from the DevTools
        // console. Select the content script's execution context (not top)
        // — the isolated world has its own window. Never runs in
        // production builds. E.g. `__booruLightbox.viewer.openAt(3)`.
        (window as any).__booruLightbox = {
            app,
            pinia,
            get viewer() {
                return useViewerStore(pinia);
            },
            get media() {
                return useMediaStore(pinia);
            },
            get upload() {
                return useUploadStore(pinia);
            },
            get page() {
                return usePageStore(pinia);
            },
        };
    }
    return app;
};

export { styles };
