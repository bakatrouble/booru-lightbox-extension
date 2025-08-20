import { createApp } from "vue";
import App from "./App.vue";
import {mdiArrowDown, mdiArrowUp, mdiClose, mdiKeyboard, mdiPlus} from "@mdi/js";
import mdiVue from 'mdi-vue/v3';

createApp(App)
    .use(mdiVue, {
        icons: {
            mdiPlus,
            mdiArrowUp,
            mdiArrowDown,
            mdiClose,
            mdiKeyboard,
        },
    })
    .mount("#app");
