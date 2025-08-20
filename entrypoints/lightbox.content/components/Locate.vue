<script setup lang="ts">
import { ref, computed } from 'vue';
import Timeout from 'await-timeout';
import { useAnimate, useElementBounding, useWindowScroll } from '@vueuse/core';

const locateEl = ref<HTMLElement>();
const locateElRect = useElementBounding(locateEl);
const scroll = useWindowScroll();
const box = ref<HTMLElement>();
const animationDuration = 500;
useAnimate(box, [{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }], {
    duration: animationDuration,
    iterations: Infinity,
});

const locateBoxRect = computed(() => {
    if (!locateEl.value && !locateElRect.left.value)
        return { left: 0, top: 0, width: 0, height: 0 };
    return {
        left: `${locateElRect.left.value + scroll.x.value - 5}px`,
        top: `${locateElRect.top.value + scroll.y.value - 5}px`,
        width: `${locateElRect.width.value + 10}px`,
        height: `${locateElRect.height.value + 10}px`,
    };
});

const locate = async (el: HTMLElement) => {
    el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
    });
    locateEl.value = el;
    await Timeout.set(5000 - animationDuration / 2); // should stop mid-animation at opacity 0
    locateEl.value = undefined;
};

defineExpose({
    locate,
});
</script>

<template>
    <teleport to="body" :disabled="!locateEl">
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
                v-if="locateEl"
                ref="box"
                :style="[
                    console.log(locateBoxRect),
                    locateBoxRect,
                    'border-radius: 5px; position: absolute; background: #f006; pointer-events: none',
                ]"
            />
        </div>
    </teleport>
</template>
