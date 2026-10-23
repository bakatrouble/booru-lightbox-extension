import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [vue(), tailwindcss()],
    resolve: {
        alias: {
            '~': path.resolve(__dirname, '../../..'),
            '~lightbox': path.resolve(
                __dirname,
                '../../../entrypoints/lightbox.content',
            ),
            '~options': path.resolve(__dirname, '../../../entrypoints/options'),
            '~testpage': path.resolve(
                __dirname,
                '../../../entrypoints/test-page',
            ),
        },
    },
    server: {
        port: 5199,
        strictPort: true,
    },
});
