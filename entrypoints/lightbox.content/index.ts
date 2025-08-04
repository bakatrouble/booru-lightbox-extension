import { App, createApp } from 'vue';
import { createVuetify } from 'vuetify';
import { getCollectImagesModule } from './websites';
import Primary from "./App.vue";
import 'vuetify/lib/styles/main.sass';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import PortalVue from 'portal-vue';
import { GesturePlugin } from '@vueuse/gesture';

export let app: App;

export enum MediaType {
    Image = 'image',
    Video = 'video',
}

export enum NotificationLevel {
    Success = 'green',
    Loading = 'grey',
    Error = 'red',
}

export default defineContentScript({
    matches: ['*://*/*'],
    cssInjectionMode: 'ui',

    main: async (ctx) => {
        const collectImagesModule = getCollectImagesModule(window.location);
        if (collectImagesModule) {
            const ui = await createShadowRootUi(ctx, {
                name: 'booru-lightbox-ui',
                position: 'inline',
                anchor: 'body',
                async onMount(container) {
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
                    app = createApp(Primary, { collectImagesModule })
                        .use(vuetify)
                        .use(PortalVue)
                        .use(GesturePlugin);
                    app.mount(container);
                }
            });

            ui.mount();
        }
    },
})
