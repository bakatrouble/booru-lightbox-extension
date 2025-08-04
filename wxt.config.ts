import { defineConfig, WxtViteConfig } from 'wxt';
import vuetify from 'vite-plugin-vuetify';
import tsconfigPaths from 'vite-tsconfig-paths';

// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: [
        '@wxt-dev/module-vue',
    ],
    zip: {
        excludeSources: [
            'web-ext-artifacts/**/*',
        ],
    },
    vite: (): WxtViteConfig => ({
        build: {
            sourcemap: 'inline',
            minify: false,
            cssMinify: false,
        },
        plugins: [
            vuetify({
                autoImport: true,
                styles: 'sass',
            }),
            tsconfigPaths(),
        ],
        ssr: {
            noExternal: ['vuetify']
        }
    }),
    manifest: {
        browser_specific_settings: {
            gecko: {
                id: "booru@bakatrouble.me",
                update_url: 'https://booru.drop.bakatrouble.me/manifest.json',
            },
        },
        permissions: [
            'activeTab',
            'storage',
            'menus',
            'tabs',
            'webRequest',
            'webRequestBlocking',
            '<all_urls>',
        ],
    },
});
