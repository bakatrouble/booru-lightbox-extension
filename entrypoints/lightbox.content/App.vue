<script setup lang="ts">
import qs from 'qs';
import { onMounted, provide, ref, watch } from 'vue';
import ScrollLock from '~lightbox/atoms/ScrollLock.vue';
import LightBox from '~lightbox/components/LightBox.vue';
import Locate from '~lightbox/components/Locate.vue';
import { useViewerStore } from '~lightbox/stores/viewer';

const { mod } = defineProps<{
    mod: CollectImagesOptions;
}>();

const viewer = useViewerStore();

const updateLocationHash = () => {
    const url = new URL(location.href);
    const parsedQs = qs.parse(location.hash.slice(1));
    if (!viewer.show) {
        parsedQs.slide = undefined;
    } else {
        parsedQs.slide = viewer.currentIdx.toString();
    }
    const stringifiedQs = qs.stringify(parsedQs);
    url.hash = stringifiedQs === '' ? '' : `#${stringifiedQs}`;
    history.replaceState('', '', url);
};

watch([() => viewer.currentIdx, () => viewer.show], updateLocationHash);

onMounted(async () => {
    viewer.configure(mod);
    await viewer.scanImages(mod);
    if (mod.rescanInterval) {
        setInterval(() => viewer.scanImages(mod), mod.rescanInterval);
    }
    const parsedQs = qs.parse(location.hash.slice(1));
    if (parsedQs.slide) {
        if (parsedQs.slide === 'last') {
            viewer.slideTo(viewer.imageList.length - 1);
            updateLocationHash();
        } else {
            viewer.slideTo(parseInt(parsedQs.slide as string, 10));
        }
        viewer.show = true;
    }
});
</script>

<template>
    <scroll-lock v-if="viewer.show" />
    <light-box />
    <locate />
</template>

<style lang="css">
@layer theme, base, components, utitlities;
</style>
