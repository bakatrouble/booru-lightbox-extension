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
import PortalVue from 'portal-vue';
import { createApp } from 'vue';
import styles from '~/assets/tailwind.css?inline';
import Primary from '~lightbox/App.vue';

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

export { styles };
