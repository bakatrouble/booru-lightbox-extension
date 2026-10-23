<script setup lang="ts">
import qs from 'qs';
import { onMounted, provide, reactive, ref, watch } from 'vue';
import ScrollLock from '~lightbox/atoms/ScrollLock.vue';
import LightBox from '~lightbox/components/LightBox.vue';
import Locate from '~lightbox/components/Locate.vue';

const { mod } = defineProps<{
    mod: CollectImagesOptions;
}>();

const imageList = ref<MediaListItem[]>([]);
const currentIdx = ref(0);
const show = ref(false);

const updateLocationHash = () => {
    const url = new URL(location.href);
    const parsedQs = qs.parse(location.hash.slice(1));
    if (!show.value) {
        parsedQs.slide = undefined;
    } else {
        parsedQs.slide = currentIdx.value.toString();
    }
    const stringifiedQs = qs.stringify(parsedQs);
    url.hash = stringifiedQs === '' ? '' : `#${stringifiedQs}`;
    history.replaceState('', '', url);
};

watch([currentIdx, show], updateLocationHash);

const openLightbox = (idx: number) => {
    currentIdx.value = idx;
    show.value = true;
};

const scanImages = async () => {
    const newImageList = await mod.callback();
    if (
        newImageList
            .map(({ el }) => el.hasAttribute('data-lightbox-attached'))
            .every(Boolean)
    )
        return;
    imageList.value = newImageList;
    imageList.value.forEach(({ el }, i) => {
        if (el.hasAttribute('data-lightbox-attached')) return;
        el.addEventListener('click', (e) => {
            e.preventDefault();
            openLightbox(i);
        });
        el.setAttribute('data-lightbox-attached', '');
    });
    show.value = false;
};

onMounted(async () => {
    await scanImages();
    if (mod.rescanInterval) {
        setInterval(scanImages, mod.rescanInterval);
    }
    const parsedQs = qs.parse(location.hash.slice(1));
    if (parsedQs.slide) {
        if (parsedQs.slide === 'last') {
            currentIdx.value = imageList.value.length - 1;
            updateLocationHash();
        } else {
            currentIdx.value = parseInt(parsedQs.slide as string, 10);
        }
        show.value = true;
    }
});

const locate = ref<InstanceType<typeof Locate>>();

// @ts-expect-error
provide('locate', (el: HTMLElement) => locate.value?.locate(el));
</script>

<template>
    <scroll-lock v-if="show" />
    <light-box
        :show="show"
        :image-list="imageList as any"
        :current-idx="currentIdx"
        :collect-images-module="mod"
        @slide="currentIdx = $event"
        @slide-delta="currentIdx += $event"
        @close="show = false"
    />
    <locate ref="locate" />
</template>

<style lang="css">
@layer theme, base, components, utitlities;
</style>
