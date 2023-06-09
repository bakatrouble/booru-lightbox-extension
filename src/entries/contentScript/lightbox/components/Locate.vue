<script setup lang="ts">
import Timeout from 'await-timeout';
import { onMounted, reactive } from 'vue';

const w = window;

const data = reactive({
    locateEl: undefined as HTMLElement | undefined,
});

onMounted(() => {
    document.querySelector('.lightbox-locate-wrapper')?.remove();
    document.querySelector('.lightbox-locate-wrapper')?.remove();

    const styleEl = document.createElement('style');
    styleEl.setAttribute('type', 'text/css');
    styleEl.classList.add('lightbox-locate-style');
    styleEl.innerHTML = `
            .lightbox-locate-wrapper {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
            }
            .lightbox-locate-rect {
                position: absolute;
                border: 5px solid #ff0000;
                pointer-events: none;
                animation: lightbox-locate-blink 2s ease infinite;
            }

            @keyframes lightbox-locate-blink {
                0% {
                    opacity: 1;
                }
                50% {
                    opacity: 0;
                }
                100% {
                    opacity: 1;
                }
            }
        `;
    document.head.appendChild(styleEl);
});

const locate = async (el: HTMLElement) => {
    el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
    });
    data.locateEl = el;
    await Timeout.set(5000);
    data.locateEl = undefined;
}

defineExpose({
    locate,
});
</script>

<template>
    <Teleport to="body" :disabled="!data.locateEl">
        <div class="lightbox-locate-wrapper">
            <div
                v-if="data.locateEl"
                class="lightbox-locate-rect"
                :style="{
                    left: `${data.locateEl.getBoundingClientRect().left + w.scrollX - 5}px`,
                    top: `${data.locateEl.getBoundingClientRect().top + w.scrollY - 5}px`,
                    width: `${data.locateEl.clientWidth}px`,
                    height: `${data.locateEl.clientHeight}px`,
                }"
            />
        </div>
    </Teleport>
</template>
