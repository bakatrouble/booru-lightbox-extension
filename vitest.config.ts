import path from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [vue()],
    resolve: {
        // NOTE: Vite 8 resolves tsconfig `paths` natively. The
        // vite-tsconfig-paths plugin is obsolete here and mis-resolves
        // `~`-style aliases imported from inside .vue SFC scripts.
        tsconfigPaths: true,
        // Explicit regex aliases take precedence over the converted
        // tsconfig patterns and are unambiguous for `~`-prefixed imports
        // (no overlap between the bare `~` and the longer prefixes).
        alias: [
            {
                find: /^~lightbox\//,
                replacement: `${path.resolve(__dirname, 'entrypoints/lightbox.content')}/`,
            },
            {
                find: /^~options\//,
                replacement: `${path.resolve(__dirname, 'entrypoints/options')}/`,
            },
            {
                find: /^~testpage\//,
                replacement: `${path.resolve(__dirname, 'entrypoints/test-page')}/`,
            },
            {
                find: /^~\//,
                replacement: `${path.resolve(__dirname)}/`,
            },
        ],
    },
    test: {
        environment: 'jsdom',
        globals: false,
        setupFiles: ['tests/unit/setup.ts'],
        include: ['tests/unit/**/*.test.{ts,tsx}'],
        css: false,
        server: {
            deps: {
                inline: [/@vueuse/, /mdi-vue/],
            },
        },
    },
});
