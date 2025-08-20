<script setup lang="ts">
import { HTMLAttributes } from 'vue';

interface BtnProps extends /* @vue-ignore */ HTMLAttributes {
    icon?: string;
    prependIcon?: string;
    iconSize?: string | number;
    component?: string | VNode;
}

const {
    icon,
    prependIcon,
    iconSize,
    class: className,
    component,
    ...props
} = defineProps<BtnProps>();
</script>

<template>
<component
    :is="component || 'button'"
    v-bind="props"
    :class="['button', { 'icon': !!icon }, className]"
>
    <mdicon v-if="icon" :name="icon" :size="iconSize" />
    <template v-else>
        <mdicon v-if="prependIcon" :name="prependIcon" :size="iconSize" />
        <span class="content">
            <slot />
        </span>
    </template>
</component>
</template>

<style lang="css" scoped>
@reference "@/assets/tailwind.css";

@layer components {
    .button {
        @apply p-2
               cursor-pointer
               transition-[background-color,opacity]
               flex
               flex-row
               gap-1
               uppercase
               rounded-lg;

        &:hover {
            background-color: var(--color-button-hover);

            &:active {
                background-color: var(--color-button-active);
            }
        }

        &:disabled {
            @apply opacity-30
                   pointer-events-none;
        }

        &.icon {
            @apply rounded-full
                   aspect-square;
        }
    }
}
</style>
