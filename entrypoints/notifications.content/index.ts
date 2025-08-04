import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import Notifications from './Notifications.vue';
import 'vuetify/lib/styles/main.sass';
import Timeout from 'await-timeout';

export default defineContentScript({
    matches: ['*://*/*>'],
    main: async (ctx) => {
        const ui = await createShadowRootUi(ctx, {
            name: 'booru-notifications-ui',
            position: 'inline',
            anchor: 'body',
            onMount: async container => {
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
                createApp(Notifications)
                    .use(vuetify)
                    .mount(container);
            }
        });
        ui.mount();
    },
})
