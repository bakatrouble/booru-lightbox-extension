<script setup lang="ts">
import {
    mdiChevronLeft,
    mdiChevronRight,
    mdiClose,
    mdiMagnify,
    mdiUpload,
} from '@mdi/js';
import Timeout from 'await-timeout';
import { PortalTarget } from 'portal-vue';
import {
    computed,
    inject,
    nextTick,
    onMounted,
    onUnmounted,
    PropType,
    reactive,
    ref,
    watch,
} from 'vue';
import browser from 'webextension-polyfill';
import LoadingPlaceholder from '~/entries/contentScript/lightbox/components/LoadingPlaceholder.vue';
import SlideContent from '~/entries/contentScript/lightbox/components/SlideContent.vue';
import { resolveScalarOrFunction } from '~/entries/contentScript/lightbox/utils';
import {
    LoadedMediaListItem,
    MediaListItem,
    MediaType,
    NotificationLevel,
    Vector2,
} from '~/entries/contentScript/types';
import { getImageBase64 } from '~/entries/shared/getImageBase64';
import { FullGestureState } from '@vueuse/gesture';

const props = defineProps({
    show: {
        type: Boolean,
        required: true,
    },
    currentIdx: {
        type: Number,
        required: true,
    },
    imageList: {
        type: Object as PropType<MediaListItem[]>,
        required: true,
    },
});

const emit = defineEmits(['slide', 'slideDelta', 'close']);

const $el = ref<HTMLElement>();

const data = reactive({
    dragging: false,
    pinching: false,
    noAnimations: false,
    exitDirection: 0,
    draggingOffset: { x: 0, y: 0 } satisfies Vector2,
    draggingStart: { x: 0, y: 0 } satisfies Vector2,
    loadedImages: [] as (LoadedMediaListItem | false | undefined)[],
    uploadLinks: [] as UploadLink[],
    pressedKeys: new Set<string>(),
    contentPosition: { x: 0, y: 0 } satisfies Vector2,
});

const prevIdx = computed(() => props.currentIdx - 1);
const nextIdx = computed(() => props.currentIdx + 1);
const currentMedia = computed(() => {
    if (data.loadedImages[props.currentIdx])
        return (data.loadedImages[props.currentIdx] as LoadedMediaListItem).item;
    return undefined;
});
const isHorizontalSlide = computed(() => Math.abs(data.draggingOffset.x * 2) > Math.abs(data.draggingOffset.y));

const cancelEvent = (e: Event) => e.preventDefault();

const dragHandler = ({ movement: [x, y], dragging, swipe: [swipeX, swipeY] }: FullGestureState<'drag'>) => {
    if (dragging) {
        if (!data.dragging && !data.pinching) {
            data.dragging = true;
        } else if (!data.pinching) {
            data.draggingOffset = { x, y };
        }
    } else if (!dragging && data.dragging) {
        if (swipeX > 0) {
            if (props.currentIdx > 0)
                emit('slideDelta', -1);
        } else if (swipeX < 0) {
            if (props.currentIdx < props.imageList!.length - 1)
                emit('slideDelta', +1);
        } else if (swipeY !== 0) {
            close();
        }
        data.dragging = false;
        data.draggingOffset = { x: 0, y: 0 };
    }
};

watch(() => props.imageList, (val) => {
    data.loadedImages = new Array(val!.length).fill(undefined);
});

const loadImage = async (idx: number) => {
    if (idx < 0 || idx >= data.loadedImages.length || data.loadedImages[idx] !== undefined)
        return;
    data.loadedImages[idx] = false;
    const { el, item: itemData } = props.imageList![idx];
    const item = await resolveScalarOrFunction(itemData);
    data.loadedImages[idx] = {
        el,
        item: {
            src: await resolveScalarOrFunction(item.src),
            label: await resolveScalarOrFunction(item.label),
            type: await resolveScalarOrFunction(item.type),
        },
    }
}

const loadImages = async (baseIdx: number) => {
    await Promise.all([
        loadImage(baseIdx - 1),
        loadImage(baseIdx),
        loadImage(baseIdx + 1),
    ]);
}

watch(() => props.show, async (val, oldVal) => {
    if (val) {
        if (val !== oldVal) {
            data.noAnimations = true;
            await nextTick();
            await Timeout.set(100);
            data.noAnimations = false;
        }
        await loadImages(props.currentIdx!);

        document.addEventListener('wheel', cancelEvent, { passive: false });
        document.addEventListener('gesturestart', cancelEvent);
        document.addEventListener('gesturechange', cancelEvent);
    }
});

watch(() => props.currentIdx, (val) => {
    loadImages(val!);
});

onMounted(async () => {
    document.addEventListener('keydown', onKeyPress, { capture: true });
    document.addEventListener('keyup', onKeyRelease, { capture: true });
    data.uploadLinks = (await browser.storage.sync.get('uploadLinks')).uploadLinks || [];
});

onUnmounted(() => {
    document.removeEventListener('keydown', onKeyPress);
    document.removeEventListener('keyup', onKeyRelease);
});

const onKeyPress = async (e: KeyboardEvent) => {
    if (!props.show)
        return;

    if (['Escape', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
    }

    data.pressedKeys.add(e.key);
    for (const uploadLink of data.uploadLinks) {
        const hotkeyKeys = uploadLink.hotkey;
        const pressedKeys = [...data.pressedKeys];
        const keysDiff = hotkeyKeys.filter(x => !pressedKeys.includes(x))
            .concat(pressedKeys.filter(x => !hotkeyKeys.includes(x)));
        if (keysDiff.length === 0) {
            e.preventDefault();
            e.stopPropagation();
            await upload(uploadLink);
            return;
        }
    }

    if (e.key === 'Escape') {
        close();
    } else if (e.key === 'ArrowLeft') {
        if (props.currentIdx > 0) {
            data.noAnimations = true;
            await nextTick();
            emit('slideDelta', -1);
            await nextTick();
            await Timeout.set(100);
            data.noAnimations = false;
        }
    } else if (e.key === 'ArrowRight') {
        if (props.currentIdx < props.imageList!.length - 1) {
            data.noAnimations = true;
            await nextTick();
            emit('slideDelta', +1);
            await nextTick();
            await Timeout.set(100);
            data.noAnimations = false;
        }
    } else {
        return;
    }
};

const onKeyRelease = (e: KeyboardEvent) => {
    if (!props.show)
        return;

    data.pressedKeys.delete(e.key);
}

const close = () => {
    data.exitDirection = Math.sign(data.draggingOffset.y);
    emit('close');
    setTimeout(() => data.exitDirection = 0, 300);

    document.removeEventListener('wheel', cancelEvent);
    document.removeEventListener('gesturestart', cancelEvent);
    document.removeEventListener('gesturechange', cancelEvent);
};

const locateFunc: (el: HTMLElement) => void = inject('locate') as any;

const locate = () => {
    close();
    locateFunc(props.imageList![props.currentIdx].el);
};

const upload = async (uploadLink: UploadLink) => {
    const notificationId = window.galleryExtension?.pushNotification({
        level: NotificationLevel.Loading,
        title: 'Uploading',
        message: 'Uploading picture...',
    });

    const el = $el.value!.querySelector(`.slide-${props.currentIdx} .content`)!.querySelector('img') as HTMLImageElement;
    const dataUrl = await getImageBase64(el);
    const fetchParams = {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        method: "POST",
        body: JSON.stringify({
            "method": "post_photo",
            "params": [dataUrl, true],
            "jsonrpc": "2.0",
            "id": 0,
        }),
    };
    const r = await fetch(uploadLink.url, fetchParams);
    const response = await r.json();
    if (response.result === true) {
        window.galleryExtension?.updateNotification({
            id: notificationId!,
            level: NotificationLevel.Success,
            title: 'Success',
            message: 'Picture was sent successfully',
        });
    } else if (response.result === 'duplicate') {
        window.galleryExtension?.updateNotification({
            id: notificationId!,
            level: NotificationLevel.Error,
            title: 'Duplicate',
            message: 'This image was sent before',
        });
    } else {
        console.error(uploadLink.url, fetchParams, response);
        window.galleryExtension?.updateNotification({
            id: notificationId!,
            level: NotificationLevel.Error,
            title: 'Error',
            message: 'An error has occurred while sending picture',
        });
    }
};
</script>

<template>
    <div ref="$el" :class="[ 'lightbox', { show } ]">
        <div
            v-drag="dragHandler"
            :class="[
                'wrapper',
                `current${currentIdx}`,
                {
                    'wrapper-dragging': data.dragging,
                    'wrapper-anim': !data.noAnimations,
                    'wrapper-exit-down': data.exitDirection > 0,
                    'wrapper-exit-up': data.exitDirection < 0
                }
            ]"
            :style="{
                left: data.dragging && isHorizontalSlide ? `calc(-100vw * ${currentIdx} + ${data.draggingOffset.x}px)` : `calc(-100vw * ${currentIdx})`,
                top: data.dragging && !isHorizontalSlide ? `${data.draggingOffset.y}px` : 0,
            }"
        >
            <div
                v-for="(item, idx) in data.loadedImages"
                :key="idx"
                :class="[
                    'slide',
                    `slide${idx}`
                ]"
            >
                <template v-if="idx >= prevIdx && idx <= nextIdx && item">
                    <slide-content
                        :media="item as any"
                        :index="idx"
                        :is-current="show && idx === currentIdx"
                        @zoom-start="() => data.pinching = true"
                        @zoom-end="() => data.pinching = false"
                    />
                </template>
                <loading-placeholder v-else>Loading metadata...</loading-placeholder>
            </div>
        </div>
        <v-sheet v-if="currentMedia?.label" class="pa-2 label" border rounded>
            <component :is="currentMedia.label" />
        </v-sheet>
        <v-sheet class="pa-2 count-label" border rounded>
            {{ currentIdx + 1 }} / {{ data.loadedImages.length }}
        </v-sheet>
        <v-toolbar class="toolbar" density="compact" border rounded>
            <template v-if="currentMedia?.type === MediaType.Image">
                <template v-for="item in data.uploadLinks" :key="item.id">
                    <v-btn
                        variant="text"
                        :prepend-icon="mdiUpload"
                        @click="upload(item)"
                    >
                        {{ item.shortName }}
                    </v-btn>
                </template>
            </template>
            <v-btn
                variant="text"
                density="comfortable"
                :icon="mdiMagnify"
                @click="locate"
            />
            <v-btn
                variant="text"
                density="comfortable"
                :icon="mdiClose"
                @click="close()"
            />
        </v-toolbar>
        <v-btn
            :disabled="currentIdx === 0"
            :class="[ 'switch', 'switch-prev' ]"
            :icon="mdiChevronLeft"
            variant="text"
            @click="$emit('slideDelta', -1)"
        />
        <v-btn
            :icon="mdiChevronRight"
            :disabled="currentIdx === data.loadedImages.length - 1"
            :class="[ 'switch', 'switch-next' ]"
            variant="text"
            @click="$emit('slideDelta', +1)"
        />
        <portal-target name="video-toolbar" />
    </div>
</template>

<style lang="sass" scoped>
@import '../../../../vars'
.lightbox
    z-index: calc($z-index + 1)
    position: fixed
    top: 0
    left: 0
    width: 100vw
    height: 100vh
    opacity: 0
    transition: opacity .3s
    pointer-events: none
    display: block !important
    user-select: none

    &.show
        opacity: 1
        pointer-events: all

.wrapper
    display: flex
    position: absolute
    transition: top .3s ease

    &-anim
        transition: top .3s ease, left .3s ease

    &-exit
        &-up
            top: -100vh !important

        &-down
            top: 100vh !important

    &-dragging
        transition: none !important

.label
    position: absolute
    bottom: 10px
    right: 10px

    :global(a)
        color: white
        text-decoration: none

.count-label
    position: absolute
    top: 10px
    left: 10px

.switch
    position: absolute
    top: 50%
    transform: translateY(-50%)
    transition: background-color .3s ease, opacity .3s ease

    &-prev
        left: 10px

    &-next
        right: 10px

.slide
    position: relative
    flex-basis: 100vw
    flex-shrink: 0
    height: 100vh
    display: flex
    justify-content: center
    align-items: center

.toolbar
    position: absolute
    top: 10px
    right: 10px
    z-index: calc($z-index + 2)
    width: auto
</style>
