<script setup lang="ts">
import { onMounted, provide, reactive, ref, watch } from 'vue';
import type { PropType } from 'vue';
import qs from 'qs';
import Fade from './components/Fade.vue';
import LightBox from './components/LightBox.vue';
import Locate from './components/Locate.vue';
import ScrollLock from './components/ScrollLock.vue';

const props = defineProps({
    collectImagesModule: {
        type: Object as PropType<CollectImagesOptions>,
        required: true,
    },
});

const data = reactive({
    imageList: [] as MediaListItem[],
    currentIdx: 0,
    show: false,
});

const updateLocationHash = () => {
    const url = new URL(location.href);
    const parsedQs = qs.parse(location.hash.slice(1));
    if (!data.show) {
        parsedQs.slide = undefined;
    } else {
        parsedQs.slide = data.currentIdx.toString();
    }
    const stringifiedQs = qs.stringify(parsedQs);
    url.hash = stringifiedQs === '' ? '' : `#${stringifiedQs}`;
    history.replaceState('', '', url);
}

watch([() => data.currentIdx, () => data.show], updateLocationHash);

const openLightbox = (idx: number) => {
    data.currentIdx = idx;
    data.show = true;
};

const scanImages = async () => {
    const newImageList = await props.collectImagesModule!.callback();
    if (newImageList.map(({ el }) => el.hasAttribute('data-lightbox-attached')).every(Boolean))
        return;
    data.imageList = newImageList;
    data.imageList.forEach(({ el }, i) => {
        if (el.hasAttribute('data-lightbox-attached'))
            return;
        el.addEventListener('click', (e) => {
            e.preventDefault();
            openLightbox(i);
        });
        el.setAttribute('data-lightbox-attached', '');
    })
    data.show = false;
}

onMounted(async () => {
    await scanImages();
    if (props.collectImagesModule!.rescanInterval) {
        setInterval(scanImages, props.collectImagesModule.rescanInterval);
    }
    const parsedQs = qs.parse(location.hash.slice(1));
    if (parsedQs.slide) {
        if (parsedQs.slide === 'last') {
            data.currentIdx = data.imageList.length - 1;
            updateLocationHash();
        } else {
            data.currentIdx = parseInt(parsedQs.slide as string);
        }
        data.show = true;
    }
    console.log('App mounted');
});

const locate = ref<InstanceType<typeof Locate>>();

// @ts-ignore
provide('locate', (el: HTMLElement) => locate.value?.locate(el))
</script>

<template>
    <v-theme-provider>
        <v-locale-provider ltr>
            <scroll-lock v-if="data.show" />
            <fade :show="data.show" />
            <light-box
                :show="data.show"
                :image-list="data.imageList as any"
                :current-idx="data.currentIdx"
                :collect-images-module="props.collectImagesModule"
                @slide="data.currentIdx = $event"
                @slide-delta="data.currentIdx += $event"
                @close="data.show = false"
            />
            <locate ref="locate" />
        </v-locale-provider>
    </v-theme-provider>
</template>

<style lang="sass">
\:host
    --v-theme-overlay-multiplier: 1
    --v-scrollbar-offset: 0px

.v-slider
    .v-input__details
        display: none
</style>
