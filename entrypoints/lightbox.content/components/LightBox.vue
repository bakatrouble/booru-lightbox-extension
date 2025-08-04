<script setup lang="ts">
import {
    mdiCheck,
    mdiChevronLeft,
    mdiChevronRight,
    mdiClose,
    mdiContentCopy,
    mdiMagnify,
    mdiOpenInNew,
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
    ref,
    watch,
} from 'vue';
import LoadingPlaceholder from './LoadingPlaceholder.vue';
import SlideContent from './SlideContent.vue';
import { resolveScalarOrFunction } from '../utils';
import { getImageBase64 } from '@/utils/getImageBase64';
import { FullGestureState } from '@vueuse/gesture';
import { MediaType } from '..';

const {
    show,
    currentIdx,
    imageList,
    collectImagesModule,
} = defineProps<{
    show: boolean,
    currentIdx: number,
    imageList: MediaListItem[],
    collectImagesModule: CollectImagesOptions,
}>();

const emit = defineEmits(['slide', 'slideDelta', 'close']);

const $el = ref<HTMLElement>();
const dragging = ref(false);
const pinching = ref(false);
const noAnimations = ref(false);
const exitDirection = ref(0);
const draggingOffset = ref<Vector2>({ x: 0, y: 0 });
const loadedImages = ref<(LoadedMediaListItem | false | undefined)[]>([]);
const uploadLinks = ref<UploadLink[]>([]);
const pressedKeys = ref(new Set<string>());
const isCopied = ref(false);

const prevPageCounter = ref(0);
const nextPageCounter = ref(0);

const prevIdx = computed(() => currentIdx - 1);
const nextIdx = computed(() => currentIdx + 1);
const isFirstIdx = computed(() => currentIdx === 0);
const isLastIdx = computed(() => currentIdx === (imageList.length - 1));
const currentMedia = computed(() => {
    if (loadedImages.value[currentIdx])
        return (loadedImages.value[currentIdx] as LoadedMediaListItem).item;
    return undefined;
});
const isHorizontalSlide = computed(() => Math.abs(draggingOffset.value.x * 2) > Math.abs(draggingOffset.value.y));

watch([isFirstIdx, prevPageCounter], () => {
    if (!isFirstIdx.value && prevPageCounter.value > 0) {
        prevPageCounter.value = 0;
    }
});

watch([isLastIdx, nextPageCounter], () => {
    if (!isLastIdx.value && nextPageCounter.value > 0) {
        nextPageCounter.value = 0;
    }
})

const cancelEvent = (e: Event) => e.preventDefault();

const dragHandler = ({
    movement: [x, y],
    dragging: gestureDragging,
    swipe: [swipeX, swipeY],
    event,
    cancel,
}: FullGestureState<'drag'>) => {
    if (gestureDragging) {
        if (!dragging.value && !pinching.value) {
            if (typeof (event as MouseEvent).button !== 'undefined' && (event as MouseEvent).button !== 0) {
                cancel();
                return;
            }
            dragging.value = true;
        } else if (!pinching.value) {
            draggingOffset.value = { x, y };
        }
    } else if (!gestureDragging && dragging.value) {
        if (swipeX > 0) {
            if (!isFirstIdx.value)
                emit('slideDelta', -1);
        } else if (swipeX < 0) {
            if (!isLastIdx.value)
                emit('slideDelta', +1);
        } else if (swipeY !== 0) {
            close();
        }
        dragging.value = false;
        draggingOffset.value = { x: 0, y: 0 };
    }
};

watch(() => imageList, (val) => {
    loadedImages.value = new Array(val!.length).fill(undefined);
});

const loadImage = async (idx: number) => {
    if (idx < 0 || idx >= loadedImages.value.length || loadedImages.value[idx] !== undefined)
        return;
    loadedImages.value[idx] = false;
    const { el, item: itemData } = imageList[idx];
    const item = await resolveScalarOrFunction(itemData);
    loadedImages.value[idx] = {
        el,
        item: {
            src: await resolveScalarOrFunction(item.src),
            label: await resolveScalarOrFunction(item.label),
            type: await resolveScalarOrFunction(item.type),
            pageUrl: await resolveScalarOrFunction(item.pageUrl),
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

watch(() => show, async (val, oldVal) => {
    if (val) {
        if (val !== oldVal) {
            noAnimations.value = true;
            await nextTick();
            await Timeout.set(100);
            noAnimations.value = false;
        }
        await loadImages(currentIdx);

        document.addEventListener('wheel', cancelEvent, { passive: false });
        document.addEventListener('gesturestart', cancelEvent);
        document.addEventListener('gesturechange', cancelEvent);
    }
});

watch(() => currentIdx, (val) => {
    loadImages(val!);
});

onMounted(async () => {
    document.addEventListener('keydown', onKeyPress, { capture: true });
    document.addEventListener('keyup', onKeyRelease, { capture: true });
    uploadLinks.value = await browser.runtime.sendMessage('uploader@bakatrouble.me', {
        type: 'getUploadLinks',
    }) || [];
});

onUnmounted(() => {
    document.removeEventListener('keydown', onKeyPress);
    document.removeEventListener('keyup', onKeyRelease);
});

const onKeyPress = async (e: KeyboardEvent) => {
    if (!show)
        return;

    if (['Escape', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
    }

    pressedKeys.value.add(e.key);
    for (const uploadLink of uploadLinks.value) {
        const hotkeyKeys = uploadLink.hotkey;
        const pressedKeysArray = [...pressedKeys.value];
        const keysDiff = hotkeyKeys.filter(x => !pressedKeysArray.includes(x))
            .concat(pressedKeysArray.filter(x => !hotkeyKeys.includes(x)));
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
        if (!isFirstIdx.value) {
            noAnimations.value = true;
            await nextTick();
            emit('slideDelta', -1);
            await nextTick();
            await Timeout.set(100);
            noAnimations.value = false;
        } else {
            if (++prevPageCounter.value > 1) {
                const newUrl = collectImagesModule.getPrevPageUrl?.();
                if (newUrl)
                    location.href = `${newUrl}#slide=last`;
            }
        }
    } else if (e.key === 'ArrowRight') {
        if (!isLastIdx.value) {
            noAnimations.value = true;
            await nextTick();
            emit('slideDelta', +1);
            await nextTick();
            await Timeout.set(100);
            noAnimations.value = false;
        } else {
            if (++nextPageCounter.value > 1) {
                const newUrl = collectImagesModule.getNextPageUrl?.();
                if (newUrl)
                    location.href = `${newUrl}#slide=0`;
            }
        }
    } else {
        return;
    }
};

const onKeyRelease = (e: KeyboardEvent) => {
    if (!show)
        return;

    pressedKeys.value.delete(e.key);
}

const close = () => {
    exitDirection.value = Math.sign(draggingOffset.value.y);
    emit('close');
    setTimeout(() => exitDirection.value = 0, 300);

    document.removeEventListener('wheel', cancelEvent);
    document.removeEventListener('gesturestart', cancelEvent);
    document.removeEventListener('gesturechange', cancelEvent);
};

const copyPageUrl = async () => {
    if(currentMedia?.value?.pageUrl) {
        await navigator.clipboard.writeText(currentMedia?.value?.pageUrl);

        isCopied.value = true;
        await Timeout.set(1000 * 2);
        isCopied.value = false;
    }
};

const locateFunc: (el: HTMLElement) => void = inject('locate') as any;

const locate = () => {
    close();
    locateFunc(imageList[currentIdx].el);
};

const upload = async (uploadLink: UploadLink) => {
    if (currentMedia.value!.src.endsWith('.gif')) {
        return uploadGif(uploadLink);
    }

    const el = $el.value!.querySelector(`.slide-${currentIdx} .content`)!.querySelector('img') as HTMLImageElement;
    const dataUrl = await getImageBase64(el);
    await browser.runtime.sendMessage(
        'uploader@bakatrouble.me',
        {
            type: 'upload',
            method: 'photoBase64',
            endpoint: uploadLink.url,
            data: dataUrl,
        },
    );
};

const uploadGif = async (uploadLink: UploadLink) => {
    await browser.runtime.sendMessage(
        'uploader@bakatrouble.me',
        {
            type: 'upload',
            method: 'gif',
            endpoint: uploadLink.url,
            url: currentMedia.value!.src,
        },
    );
}
</script>

<template>
    <div ref="$el" :class="[ 'lightbox', { show } ]">
        <div
            v-drag="dragHandler"
            :class="[
                'wrapper',
                `current${currentIdx}`,
                {
                    'wrapper-dragging': dragging,
                    'wrapper-anim': !noAnimations,
                    'wrapper-exit-down': exitDirection > 0,
                    'wrapper-exit-up': exitDirection < 0
                }
            ]"
            :style="{
                left: dragging && isHorizontalSlide ? `calc(-100vw * ${currentIdx} + ${draggingOffset.x}px)` : `calc(-100vw * ${currentIdx})`,
                top: dragging && !isHorizontalSlide ? `${draggingOffset.y}px` : 0,
            }"
        >
            <div
                v-for="(item, idx) in loadedImages"
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
                        @zoom-start="() => pinching = true"
                        @zoom-end="() => pinching = false"
                    />
                </template>
                <loading-placeholder v-else>Loading metadata...</loading-placeholder>
            </div>
        </div>
        <v-sheet v-if="currentMedia?.label" class="pa-2 label" border rounded>
            <template v-if="typeof currentMedia.label === 'string'">
                {{ currentMedia.label }}
            </template>
            <component :is="currentMedia.label" v-else />
        </v-sheet>
        <v-sheet class="pa-2 count-label" border rounded>
            {{ currentIdx + 1 }} / {{ loadedImages.length }}
        </v-sheet>
        <v-toolbar class="toolbar" density="compact" border rounded>
            <template v-if="currentMedia?.type === MediaType.Image">
                <template v-for="item in uploadLinks" :key="item.id">
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
                v-if="currentMedia?.pageUrl"
                variant="text"
                density="comfortable"
                :color="isCopied ? 'success' : undefined"
                :icon="isCopied ? mdiCheck : mdiContentCopy"
                @click="isCopied ? undefined : copyPageUrl()"
            />
            <v-btn
                v-if="currentMedia?.pageUrl"
                variant="text"
                density="comfortable"
                :icon="mdiOpenInNew"
                :href="currentMedia?.pageUrl"
                target="_blank"
            />
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
            :disabled="currentIdx === loadedImages.length - 1"
            :class="[ 'switch', 'switch-next' ]"
            variant="text"
            @click="$emit('slideDelta', +1)"
        />
        <portal-target name="video-toolbar" />
    </div>
</template>

<style lang="sass" scoped>
@use '@/utils/vars' as *

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
    left: 10px

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
