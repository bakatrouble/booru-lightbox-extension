import vue from '@vitejs/plugin-vue';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [vue(), tsconfigPaths()],
    test: {
        environment: 'jsdom',
        globals: false,
        setupFiles: ['tests/unit/setup.ts'],
        include: ['tests/unit/**/*.test.{ts,tsx}'],
        css: false,
        server: {
            deps: {
                inline: [/@vueuse/, /portal-vue/, /mdi-vue/],
            },
        },
    },
});
