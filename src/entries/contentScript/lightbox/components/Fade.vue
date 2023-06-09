<script setup lang="ts">
import { defineComponent, reactive, watch } from 'vue';
import Timeout from 'await-timeout';

const props = defineProps({
    show: {
        type: Boolean,
        required: true,
    },
});

const data = reactive({
    display: false,
    opacity: false,
});

watch(() => props.show, async (val) => {
    if (val) {
        data.display = true;
        await Timeout.set(10);
        data.opacity = true;
    } else {
        data.opacity = false;
        await Timeout.set(10);
        data.display = false;
    }
});
</script>

<template>
    <div :class="['fade', { 'fade-display': data.display, 'fade-opacity': data.opacity }]" />
</template>

<style lang="sass" scoped>
@import '../../../../vars'

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
