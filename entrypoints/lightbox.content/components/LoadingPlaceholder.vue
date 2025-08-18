<template>
    <div class="flex items-center flex-col justify-center">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="25 25 50 50"
            width="100px"
            height="100px"
            class="progress-spinner mb-4"
        >
            <circle
                class="path"
                cx="50"
                cy="50"
                r="20"
                fill="none"
                stroke="currentColor"
                stroke-width="5"
                stroke-miterlimit="10"
            />
        </svg>
        <div><slot /></div>
    </div>
</template>
<script setup lang="ts">
</script>

<style scoped lang="css">
@reference "@/assets/tailwind.css";

@layer components {
    .progress-spinner {
        animation: vue-spinner-spin 2s linear infinite;
        transform-origin: center center;
        color: currentColor;

        & circle {
            stroke-dasharray: 1, 200;
            stroke-dashoffset: 0;
            animation: progress-spinner-dash 1.5s ease-in-out infinite;
        }
    }

    @keyframes progress-spinner-dash {
        0% {
            stroke-dasharray: 1, 200;
            stroke-dashoffset: 0;
        }

        50% {
            stroke-dasharray: 89, 200;
            stroke-dashoffset: -35px;
        }

        100% {
            stroke-dasharray: 89, 200;
            stroke-dashoffset: -124px;
        }
    }

    @keyframes vue-spinner-spin {
        0% {
            transform: rotate3d(0, 0, 1, 0deg);
        }

        100% {
            transform: rotate3d(0, 0, 1, 359deg);
        }
    }
}
</style>