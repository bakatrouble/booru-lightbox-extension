<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

onMounted(() => {
    document.querySelector('html')!.classList.add('image-galleries-overflow');
});

onUnmounted(() => {
    document.querySelector('html')!.classList.remove('image-galleries-overflow');
});
</script>
