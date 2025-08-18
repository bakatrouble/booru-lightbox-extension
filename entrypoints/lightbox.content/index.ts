import { App, createApp } from 'vue';
import { getCollectImagesModule } from './websites';
import Primary from './App.vue';
import PortalVue from 'portal-vue';
import { GesturePlugin } from '@vueuse/gesture';
import mdiVue from 'mdi-vue/v3';
import {
    mdiContentCopy,
    mdiCheck,
    mdiOpenInNew,
    mdiUpload,
    mdiMagnify,
    mdiClose,
    mdiChevronRight,
    mdiChevronLeft,
    mdiVolumeHigh,
    mdiVolumeOff,
    mdiPlay,
    mdiPause,
    mdiFullscreen,
} from '@mdi/js';
import '../../assets/tailwind.css';

export enum MediaType {
    Image = 'image',
    Video = 'video',
}

export const mountApp = (
    mod: CollectImagesOptions,
    container: HTMLElement | string,
) => {
    const app = createApp(Primary, { mod })
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
    return app;
};

export default defineContentScript({
    matches: ['*://*/*'],
    cssInjectionMode: 'ui',

    main: async (ctx) => {
        const existingUi = document.querySelector('booru-lightbox-ui');
        if (existingUi) {
            existingUi.remove();
            document
                .querySelectorAll('[data-lightbox-attached]')
                .forEach((el) => {
                    el.removeAttribute('data-lightbox-attached');
                });
        }

        const mod = getCollectImagesModule(window.location);
        if (mod) {
            const ui = await createShadowRootUi(ctx, {
                name: 'booru-lightbox-ui',
                position: 'inline',
                anchor: 'body',
                css: '@layer theme, base, properties, components, utilities;',
                onMount(container) {
                    return mountApp(mod, container);
                },
                onRemove: (app) => {
                    app?.unmount();
                },
            });
            ui.mount();
        }
    },
});
