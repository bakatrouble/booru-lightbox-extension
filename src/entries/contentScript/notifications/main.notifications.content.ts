import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import Notifications from './Notifications.vue';
import renderContent from '~/entries/contentScript/renderContent';
import 'vuetify/lib/styles/main.sass';
import { createHead } from '@vueuse/head';

const vuetify = createVuetify({
    icons: {
        defaultSet: 'mdi',
        aliases,
        sets: { mdi },
    },
    theme: {
        defaultTheme: 'dark',
        cspNonce: 'notifications',
    },
});
renderContent(
    'notifications',
    import.meta.PLUGIN_WEB_EXT_CHUNK_CSS_PATHS,
    (appRoot: HTMLElement) => {
        const elementToBackup = document.querySelector('#vuetify-theme-stylesheet');
        if (elementToBackup) {
            elementToBackup.id = 'vuetify-theme-stylesheet-backup';
        }
        createApp(Notifications)
            .use(vuetify)
            .mount(appRoot);
        const themeStylesheet = document.querySelector('#vuetify-theme-stylesheet[nonce=notifications]') as HTMLLinkElement;
        themeStylesheet.id = 'vuetify-theme-stylesheet-notifications';
        appRoot.appendChild(themeStylesheet.cloneNode(true));
        themeStylesheet.remove();
        if (elementToBackup) {
            elementToBackup.id = 'vuetify-theme-stylesheet';
        }
    },
).then(() => {
})
