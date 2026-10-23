import { useElementBounding, useWindowScroll } from '@vueuse/core';
import Timeout from 'await-timeout';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

const animationDuration = 500;

export const useLocateStore = defineStore('locate', () => {
    const locateTarget = ref<HTMLElement>();
    const locateTargetRect = useElementBounding(locateTarget);
    const scroll = useWindowScroll();

    const locateBoxRect = computed(() => {
        if (!locateTarget.value && !locateTargetRect.left.value)
            return undefined;
        return {
            left: `${locateTargetRect.left.value + scroll.x.value - 5}px`,
            top: `${locateTargetRect.top.value + scroll.y.value - 5}px`,
            width: `${locateTargetRect.width.value + 10}px`,
            height: `${locateTargetRect.height.value + 10}px`,
        };
    });

    const setLocateTarget = async (el: HTMLElement) => {
        el.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center',
        });
        locateTarget.value = el;
        await Timeout.set(5000 - animationDuration / 2);
        locateTarget.value = undefined;
    };

    return {
        locateTarget,
        locateTargetRect,
        scroll,
        locateBoxRect,
        setLocateTarget,
        animationDuration,
    };
});
