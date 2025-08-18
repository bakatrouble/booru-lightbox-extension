<script setup lang="ts">
import { HTMLAttributes } from 'vue';

interface PanelProps extends /* @vue-ignore */ HTMLAttributes {}

const props = defineProps<PanelProps>();
</script>

<template>
<div class="panel" v-bind="props">
    <slot />
</div>
</template>

<style lang="css">
@reference "@/assets/tailwind.css";

@layer components {
    .panel {
        @apply p-2
               rounded-default
               bg-background
               border-1
               border-(--color-border);
    }

    .colored-links {
        a {
            color: var(--color-text);
            text-decoration: none;
            transition: color var(--default-transition-duration) var(--default-transition-timing-function);

            &:hover {
                color: var(--color-link-hover);
            }
        }
    }
}
</style>
