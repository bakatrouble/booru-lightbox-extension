import { createApp } from "vue";
import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import App from "./App.vue";
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
createApp(App)
    .use(vuetify)
    .mount("#app");
