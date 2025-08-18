import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig, type WxtViteConfig } from 'wxt';

export const updateManifestUrl =
    'https://raw.githubusercontent.com/bakatrouble/booru-lightbox-extension/refs/heads/manifest/manifest.json';
export const extensionSlug = 'booru@bakatrouble.me';

// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: ['@wxt-dev/module-vue'],
    zip: {
        excludeSources: ['web-ext-artifacts/**/*'],
    },
    vue: {
        vite: {
            template: {
                compilerOptions: {
                    // isCustomElement: (tag) => tag === 'mdicon',
                },
            },
        },
    },
    vite: (): WxtViteConfig => ({
        build: {
            sourcemap: true,
            minify: false,
            cssMinify: false,
        },
        plugins: [tailwindcss(), tsconfigPaths()],
    }),
    manifest: {
        browser_specific_settings: {
            gecko: {
                id: extensionSlug,
                update_url: updateManifestUrl,
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
        web_accessible_resources: [
            {
                resources: ['iframe.html'],
                matches: ['*://*/*'],
            },
        ],
    },
});
