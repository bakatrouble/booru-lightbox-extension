import { App, createApp } from 'vue';
import { createVuetify } from 'vuetify';
import { getCollectImagesModule } from '~/entries/contentScript/lightbox/websites';
import renderContent from "../renderContent";
import Primary from "./App.vue";
import 'vuetify/lib/styles/main.sass';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import PortalVue from 'portal-vue';

export let app: App;

const collectImagesModule = getCollectImagesModule(window.location);
if (collectImagesModule) {
    const vuetify = createVuetify({
        icons: {
            defaultSet: 'mdi',
            aliases,
            sets: { mdi },
        },
        theme: {
            defaultTheme: 'dark',
            cspNonce: 'lightbox',
        },
    });
    renderContent(
        'lightbox',
        import.meta.PLUGIN_WEB_EXT_CHUNK_CSS_PATHS,
        (appRoot: HTMLElement) => {
            const elementToBackup = document.querySelector('#vuetify-theme-stylesheet');
            if (elementToBackup) {
                elementToBackup.id = 'vuetify-theme-stylesheet-backup';
            }
            app = createApp(Primary, { collectImagesModule })
                .use(vuetify)
                .use(PortalVue);
            app.mount(appRoot);
            const themeStylesheet = document.querySelector('#vuetify-theme-stylesheet[nonce=lightbox]') as HTMLLinkElement;
            themeStylesheet.id = 'vuetify-theme-stylesheet-lightbox';
            appRoot.appendChild(themeStylesheet.cloneNode(true));
            themeStylesheet.remove();
            if (elementToBackup) {
                elementToBackup.id = 'vuetify-theme-stylesheet';
            }
        },
    );
}
