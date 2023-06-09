<template>
    <div class="d-flex align-center flex-column justify-center">
        <v-progress-circular indeterminate :size="79" :width="10" class="mb-4" />
        <div><slot /></div>
    </div>
</template>
