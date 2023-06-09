import vueJsxPlugin from '@vitejs/plugin-vue-jsx';
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import webExtension from "@samrum/vite-plugin-web-extension";
import path from "path";
import vuetify from 'vite-plugin-vuetify';
import { getManifest } from "./src/manifest";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    return {
        server: {
            port: parseInt(process.env.PORT, 10) || 3033,
        },
        plugins: [
            vue(),
            vueJsxPlugin(),
            vuetify({
                autoImport: true,
                styles: 'sass',
            }),
            webExtension({
                manifest: getManifest(Number(env.MANIFEST_VERSION)),
            }),
        ],
        resolve: {
            alias: {
                "~": path.resolve(__dirname, "./src"),
            },
        },
    };
});
