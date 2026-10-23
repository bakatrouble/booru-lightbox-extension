import {
    mdiArrowDown,
    mdiArrowUp,
    mdiClose,
    mdiKeyboard,
    mdiPlus,
} from '@mdi/js';
import mdiVue from 'mdi-vue/v3';
import { createApp } from 'vue';
import App from '~options/App.vue';

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
    .mount('#app');
