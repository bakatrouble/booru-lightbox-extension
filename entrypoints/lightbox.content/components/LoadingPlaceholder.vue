<script setup lang="ts">
import Spinner from '~lightbox/atoms/Spinner.vue';
</script>

<template>
    <div class="flex items-center flex-col justify-center">
        <spinner class="mb-4" />
        <div><slot /></div>
    </div>
</template>

<style scoped lang="css">
</style>