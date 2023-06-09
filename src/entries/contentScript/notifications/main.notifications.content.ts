import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import Notifications from './Notifications.vue';
import renderContent from '~/entries/contentScript/renderContent';
import 'vuetify/lib/styles/main.sass';

const vuetify = createVuetify({
    icons: {
        defaultSet: 'mdi',
        aliases,
        sets: { mdi },
    },
    theme: {
        defaultTheme: 'dark',
    },
});
renderContent(
    'notifications',
    import.meta.PLUGIN_WEB_EXT_CHUNK_CSS_PATHS,
    (appRoot: HTMLElement) => {
        createApp(Notifications)
            .use(vuetify)
            .mount(appRoot);
        const themeStylesheet = document.querySelector('#vuetify-theme-stylesheet') as HTMLLinkElement;
        themeStylesheet.id = 'vuetify-theme-stylesheet-notifications';
        appRoot.appendChild(themeStylesheet.cloneNode(true));
        themeStylesheet.remove();
    },
).then(() => {
})
