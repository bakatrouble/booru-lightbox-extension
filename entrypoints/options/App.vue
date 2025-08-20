<script setup lang="ts">
import { useStorageAsync } from "@vueuse/core";

const gelbooruApiKey = useStorageAsync<string>('gelbooruApiKey', '', {
    getItem: async key => (await browser.storage.sync.get(key))[key],
    setItem: (key, value) => browser.storage.sync.set({ [key]: value }),
    removeItem: key => browser.storage.sync.remove(key),
});
</script>

<template>
    <div class="p-4 flex flex-col justify-start">
        <h1 class="text-2xl font-bold mb-4">Booru lightbox settings</h1>
        <div class="flex flex-col max-w-4xl">
            <span>Gelbooru API key</span>
            <input type="text" v-model="gelbooruApiKey" />
        </div>
    </div>
</template>

<style lang="css">
@import "../../assets/tailwind.css";

@layer components {
    body {
        @apply
            bg-gray-800
            text-gray-50;
    }

    input[type="text"] {
        @apply
            bg-gray-500
            text-gray-50
            p-2
            rounded-sm
            border-gray-700
            border-1;
    }
}
</style>
