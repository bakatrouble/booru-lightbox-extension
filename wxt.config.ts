import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig, type WxtViteConfig } from 'wxt';

export const updateManifestUrl =
    'https://raw.githubusercontent.com/bakatrouble/booru-lightbox-extension/refs/heads/manifest';
export const extensionSlug = 'booru@bakatrouble.me';

export default defineConfig({
    modules: ['@wxt-dev/module-vue'],
    zip: {
        excludeSources: ['web-ext-artifacts/**/*'],
    },
    filterEntrypoints: ['lightbox', 'background', 'options'].concat(process.env.NODE_ENV === 'development' ? ['test-page'] : []),
    vite: (): WxtViteConfig => ({
        build: {
            sourcemap: false,
            minify: false,
            cssMinify: false,
        },
        plugins: [tailwindcss(), tsconfigPaths()],
    }),
    manifest: {
        browser_specific_settings: {
            gecko: {
                id: extensionSlug,
                update_url: `${updateManifestUrl}/manifest.json`,
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
