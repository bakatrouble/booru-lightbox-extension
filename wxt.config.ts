import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type WxtViteConfig } from 'wxt';

export const updateManifestUrl =
    'https://raw.githubusercontent.com/bakatrouble/booru-lightbox-extension/refs/heads/manifest';
export const extensionSlug = 'booru@bakatrouble.me';

export default defineConfig({
    modules: ['@wxt-dev/module-vue'],
    alias: {
        '~lightbox': 'entrypoints/lightbox.content',
        '~options': 'entrypoints/options',
        '~testpage': 'entrypoints/test-page',
    },
    zip: {
        excludeSources: ['web-ext-artifacts/**/*'],
    },
    filterEntrypoints: ['lightbox', 'background', 'options'].concat(
        process.env.NODE_ENV === 'development' ? ['test-page'] : [],
    ),
    vite: (): WxtViteConfig => ({
        build: {
            sourcemap: false,
            minify: false,
            cssMinify: false,
        },
        // NOTE: no vite-tsconfig-paths here — path aliases for the extension
        // build come from WXT's `alias` option above (keep the two in sync
        // when adding a prefix). The plugin is still used by vitest.
        plugins: [tailwindcss()],
    }),
    manifest: {
        browser_specific_settings: {
            gecko: {
                id: extensionSlug,
                update_url: `${updateManifestUrl}/manifest.json`,
                data_collection_permissions: {
                    required: ['none'],
                },
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
