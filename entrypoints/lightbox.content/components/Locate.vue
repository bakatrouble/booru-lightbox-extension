<script setup lang="ts">
import { useAnimate } from '@vueuse/core';
import { ref } from 'vue';
import { useLocateStore } from '~lightbox/stores/locate.ts';

const locateStore = useLocateStore();

const box = ref<HTMLElement>();
useAnimate(box, [{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }], {
    duration: locateStore.animationDuration,
    iterations: Infinity,
});
</script>

<template>
    <teleport to="body" :disabled="!locateStore.locateBoxRect">
        <div
            style="
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none; 
            "
        >
            <div
                v-if="!!locateStore.locateBoxRect"
                ref="box"
                :style="[
                    locateStore.locateBoxRect,
                    'border-radius: 5px; position: absolute; background: #f006; pointer-events: none',
                ]"
            />
        </div>
    </teleport>
</template>
