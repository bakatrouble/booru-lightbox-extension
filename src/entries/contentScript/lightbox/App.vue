<script setup lang="ts">
import { defineComponent, onMounted, provide, reactive, ref, watch } from 'vue';
import type { PropType } from 'vue';
import qs from 'qs';
import Fade from '~/entries/contentScript/lightbox/components/Fade.vue';
import LightBox from '~/entries/contentScript/lightbox/components/LightBox.vue';
import Locate from '~/entries/contentScript/lightbox/components/Locate.vue';
import ScrollLock from '~/entries/contentScript/lightbox/components/ScrollLock.vue';
import { CollectImagesOptions, MediaListItem } from '~/entries/contentScript/types';

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
    url.hash = `#${qs.stringify(parsedQs)}`;
    location.replace(url);
}

watch([() => data.currentIdx, () => data.show], updateLocationHash);

const openLightbox = (idx: number) => {
    data.currentIdx = idx;
    data.show = true;
};

onMounted(async () => {
    data.imageList = await props.collectImagesModule!.callback();
    data.imageList.forEach(({ el }, i) => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            openLightbox(i);
        });
    })
    const parsedQs = qs.parse(location.hash.slice(1));
    if (parsedQs.slide) {
        data.currentIdx = parseInt(parsedQs.slide as string);
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
