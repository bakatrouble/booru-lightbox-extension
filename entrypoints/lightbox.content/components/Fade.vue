<script setup lang="ts">
import { watch } from 'vue';
import Timeout from 'await-timeout';

const { show } = defineProps<{ show: boolean }>();

const display = ref(false);
const opacity = ref(false);

watch(() => show, async (val) => {
    if (val) {
        display.value = true;
        await Timeout.set(10);
        opacity.value = true;
    } else {
        opacity.value = false;
        await Timeout.set(10);
        display.value = false;
    }
});
</script>

<template>
    <div :class="['fade', { 'fade-display': display, 'fade-opacity': opacity }]" />
</template>

<style lang="sass" scoped>
@use '@/utils/vars' as *

.fade
    position: fixed
    top: 0
    left: 0
    width: 100vw
    height: 100vh
    background: #000c
    transition: opacity .3s ease
    opacity: 0
    pointer-events: none
    z-index: $z-index

    &-display
        pointer-events: all

    &-opacity
        opacity: 1
</style>
