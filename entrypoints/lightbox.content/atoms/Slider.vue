<script setup lang="ts">
import { HTMLAttributes } from 'vue';

interface SliderProps extends /* @vue-ignore */ HTMLAttributes {
    max: number;
    buffers?: { start: number; end: number }[];
}

const modelValue = defineModel<number>('modelValue');

const seeking = ref(false);
const slider = ref<HTMLDivElement>();

const { max, class: className, buffers, ...props } = defineProps<SliderProps>();

const onDragMove = (e: MouseEvent | TouchEvent) => {
    if (!seeking.value) return;
    const rect = slider.value!.getBoundingClientRect();
    const offsetX =
        e instanceof MouseEvent
            ? e.clientX - rect.left
            : e.touches[0].clientX - rect.left;
    const percentage = Math.min(Math.max(offsetX / rect.width, 0), 1);
    modelValue.value = percentage * max;
};

const onDragStop = () => {
    seeking.value = false;
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('touchmove', onDragMove);
    document.removeEventListener('mouseup', onDragStop);
    document.removeEventListener('touchend', onDragStop);
};

const onDragStart = (e: MouseEvent | TouchEvent) => {
    seeking.value = true;
    const target = e.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    const offsetX =
        e instanceof MouseEvent
            ? e.clientX - rect.left
            : e.touches[0].clientX - rect.left;
    const percentage = Math.min(Math.max(offsetX / rect.width, 0), 1);
    modelValue.value = Math.round(percentage * max);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('touchmove', onDragMove, { passive: true });
    document.addEventListener('mouseup', onDragStop);
    document.addEventListener('touchend', onDragStop);
};
</script>

<template>
<div
    ref="slider"
    :class="['slider', className]"
    v-bind="props"
    @mousedown.stop="onDragStart"
    @touchstart.stop="onDragStart"
>
    <div
        v-if="buffers"
        v-for="(buffer, i) in buffers"
        :key="i"
        class="buffer"
        :style="{
            left: `${((buffer.start || 0) / max * 100)}%`,
            width: `${((buffer.end || 0) - (buffer.start || 0)) / max * 100}%`,
        }"
    />
    <div
        class="progress"
        :style="{
            width: `${((modelValue || 0) / max * 100)}%`,
        }"
    />
</div>
</template>

<style scoped lang="css">
@reference "@/assets/tailwind.css";

@layer components {
    .slider {
        @apply h-2
               relative
               bg-gray-700
               cursor-pointer;

        .progress, .buffer {
            @apply h-2
                   absolute
                   left-0;
        }

        .progress {
            @apply bg-blue-500
                   z-1;
        }

        .buffer {
            @apply bg-gray-500
                   z-0;
        }
    }
}
</style>
