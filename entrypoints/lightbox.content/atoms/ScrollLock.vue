<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

const overflowBackup = ref('');
const touchActionBackup = ref('');

onMounted(() => {
    overflowBackup.value = document.documentElement.style.overflow;
    touchActionBackup.value = document.documentElement.style.touchAction;
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.touchAction = 'none';
});

onUnmounted(() => {
    document.documentElement.style.overflow = overflowBackup.value;
    document.documentElement.style.touchAction = touchActionBackup.value;
});
</script>

<template />
