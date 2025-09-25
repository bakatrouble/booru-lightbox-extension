<script setup lang="ts">
import { FullGestureState } from '@vueuse/gesture';
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
import Panel from '@/entrypoints/lightbox.content/atoms/Panel.vue';
import { MediaType } from '../../lightbox.content';
import Btn from '../atoms/Btn.vue';
import { resolveScalarOrFunction } from '../utils';
import LoadingPlaceholder from './LoadingPlaceholder.vue';
import SlideContent from './SlideContent.vue';

const { show, currentIdx, imageList, collectImagesModule } = defineProps<{
    show: boolean;
    currentIdx: number;
    imageList: MediaListItem[];
    collectImagesModule: CollectImagesOptions;
}>();

const emit = defineEmits(['slide', 'slideDelta', 'close']);

const $el = ref<HTMLElement>();
const dragging = ref(false);
const pinching = ref(false);
const noAnimations = ref(false);
const exitDirection = ref<'up' | 'down' | null>(null);
const draggingOffset = ref<Vector2>({ x: 0, y: 0 });
const loadedImages = ref<(LoadedMediaListItem | false | undefined)[]>([]);
const uploadLinks = ref<UploadLink[]>([]);
const pressedKeys = ref(new Set<string>());
const copiedFeedback = ref(false);

const prevPageCounter = ref(0);
const nextPageCounter = ref(0);

const prevIdx = computed(() => currentIdx - 1);
const nextIdx = computed(() => currentIdx + 1);
const isFirstIdx = computed(() => currentIdx === 0);
const isLastIdx = computed(() => currentIdx === imageList.length - 1);
const currentMedia = computed(() => {
    if (loadedImages.value[currentIdx])
        return (loadedImages.value[currentIdx] as LoadedMediaListItem).item;
    return undefined;
});
const isHorizontalSlide = computed(
    () =>
        Math.abs(draggingOffset.value.x * 2) > Math.abs(draggingOffset.value.y),
);

watch([isFirstIdx, prevPageCounter], () => {
    if (!isFirstIdx.value && prevPageCounter.value > 0) {
        prevPageCounter.value = 0;
    }
});

watch([isLastIdx, nextPageCounter], () => {
    if (!isLastIdx.value && nextPageCounter.value > 0) {
        nextPageCounter.value = 0;
    }
});

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
            if (
                typeof (event as MouseEvent).button !== 'undefined' &&
                (event as MouseEvent).button !== 0
            ) {
                cancel();
                return;
            }
            dragging.value = true;
        } else if (!pinching.value) {
            draggingOffset.value = { x, y };
        }
    } else if (!gestureDragging && dragging.value) {
        if (swipeX > 0) {
            if (!isFirstIdx.value) emit('slideDelta', -1);
        } else if (swipeX < 0) {
            if (!isLastIdx.value) emit('slideDelta', +1);
        } else if (swipeY !== 0) {
            close();
        }
        dragging.value = false;
        draggingOffset.value = { x: 0, y: 0 };
    }
};

watch(
    () => imageList,
    (val) => {
        loadedImages.value = new Array(val!.length).fill(undefined);
    },
);

const loadImage = async (idx: number) => {
    if (
        idx < 0 ||
        idx >= loadedImages.value.length ||
        loadedImages.value[idx] !== undefined
    )
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
    };
};

const loadImages = async (baseIdx: number) => {
    await Promise.all([
        loadImage(baseIdx - 1),
        loadImage(baseIdx),
        loadImage(baseIdx + 1),
    ]);
};

watch(
    () => show,
    async (val, oldVal) => {
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
    },
);

watch(
    () => currentIdx,
    (val) => {
        loadImages(val!);
    },
);

onMounted(async () => {
    document.addEventListener('keydown', onKeyPress, { capture: true });
    document.addEventListener('keyup', onKeyRelease, { capture: true });
    try {
        uploadLinks.value =
            (await browser.runtime.sendMessage('uploader@bakatrouble.me', {
                type: 'getUploadLinks',
            })) || [];
    } catch (e) {}
});

onUnmounted(() => {
    document.removeEventListener('keydown', onKeyPress);
    document.removeEventListener('keyup', onKeyRelease);
});

const onKeyPress = async (e: KeyboardEvent) => {
    if (!show) return;

    if (['Escape', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
    }

    pressedKeys.value.add(e.key);
    for (const uploadLink of uploadLinks.value) {
        const hotkeyKeys = uploadLink.hotkey;
        const pressedKeysArray = [...pressedKeys.value];
        const keysDiff = hotkeyKeys
            .filter((x) => !pressedKeysArray.includes(x))
            .concat(pressedKeysArray.filter((x) => !hotkeyKeys.includes(x)));
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
                if (newUrl) location.href = `${newUrl}#slide=last`;
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
                if (newUrl) location.href = `${newUrl}#slide=0`;
            }
        }
    } else {
        return;
    }
};

const onKeyRelease = (e: KeyboardEvent) => {
    if (!show) return;

    pressedKeys.value.delete(e.key);
};

const close = () => {
    if (draggingOffset.value.y > 0) {
        exitDirection.value = 'down';
    } else if (draggingOffset.value.y < 0) {
        exitDirection.value = 'up';
    }
    emit('close');
    setTimeout(() => {
        exitDirection.value = null;
    }, 300);

    document.removeEventListener('wheel', cancelEvent);
    document.removeEventListener('gesturestart', cancelEvent);
    document.removeEventListener('gesturechange', cancelEvent);
};

const copyPageUrl = async () => {
    if (currentMedia?.value?.pageUrl) {
        await navigator.clipboard.writeText(currentMedia?.value?.pageUrl);

        copiedFeedback.value = true;
        await Timeout.set(1000 * 2);
        copiedFeedback.value = false;
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
    if (currentMedia.value!.type === MediaType.Video) {
        return uploadVideo(uploadLink);
    }

    const el = $el
        .value!.querySelector(`.slide-${currentIdx} .content`)!
        .querySelector('img') as HTMLImageElement;

    const canvas = document.createElement('canvas');
    canvas.width = el.naturalWidth;
    canvas.height = el.naturalHeight;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.rect(0, 0, el.naturalWidth, el.naturalHeight);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.drawImage(el, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 1);
    canvas.remove();

    await browser.runtime.sendMessage('uploader@bakatrouble.me', {
        type: 'upload',
        method: 'photoBase64',
        endpoint: uploadLink.url,
        data: dataUrl,
    });
};

const uploadGif = async (uploadLink: UploadLink) => {
    await browser.runtime.sendMessage('uploader@bakatrouble.me', {
        type: 'upload',
        method: 'gif',
        endpoint: uploadLink.url,
        url: currentMedia.value!.src,
    });
};

const uploadVideo = async (uploadLink: UploadLink) => {
    await browser.runtime.sendMessage('uploader@bakatrouble.me', {
        type: 'upload',
        method: 'video',
        endpoint: uploadLink.url,
        url: currentMedia.value!.src,
    });
};
</script>

<template>
    <div ref="$el" class="lightbox transition-opacity-interactive" :data-visible="show">
        <div
            v-drag="dragHandler"
            class="lightbox-content-wrapper"
            :data-anim="!noAnimations"
            :data-dragging="dragging"
            :data-exit-direction="exitDirection"
            :data-current-idx="currentIdx"
            :style="{
                left: `calc(-100vw * ${currentIdx} + ${dragging && isHorizontalSlide ? draggingOffset.x : 0}px)`,
                top: `${dragging && !isHorizontalSlide ? draggingOffset.y : 0}px`,
            }"
        >
            <div
                v-for="(item, idx) in loadedImages"
                :key="idx"
                class="lightbox-content-item"
            >
                <slide-content
                    v-if="idx >= prevIdx && idx <= nextIdx && item"
                    :media="item as any"
                    :index="idx"
                    :current="show && idx === currentIdx"
                    :sliding="dragging"
                    @zoom-start="() => pinching = true"
                    @zoom-end="() => pinching = false"
                />
                <loading-placeholder v-else>
                    Loading metadata...
                </loading-placeholder>
            </div>
        </div>
        <panel v-if="currentMedia?.label" class="colored-links absolute bottom-4 left-4">
            <template v-if="typeof currentMedia.label === 'string'">
                {{ currentMedia.label }}
            </template>
            <component :is="currentMedia.label" v-else />
        </panel>
        <panel class="absolute top-2 left-2">
            {{ currentIdx + 1 }} / {{ loadedImages.length }}
        </panel>
        <panel class="blur-out absolute top-2 right-2 flex flex-row gap-2">
            <btn
                v-if="currentMedia?.type === MediaType.Image"
                v-for="item in uploadLinks"
                :key="item.id"
                @click="upload(item)"
                prepend-icon="upload"
            >
                {{ item.shortName }}
            </btn>
            <btn
                class="data-[feedback=true]:text-green-400"
                v-if="currentMedia?.pageUrl"
                :data-feedback="copiedFeedback"
                @click="copiedFeedback ? undefined : copyPageUrl()"
                :icon="copiedFeedback ? 'check' : 'contentCopy'"
            />
            <btn
                component="a"
                v-if="currentMedia?.pageUrl"
                :href="currentMedia?.pageUrl"
                target="_blank"
                icon="openInNew"
            />
            <btn
                class="icon button"
                @click="locate()"
                icon="magnify"
            />
            <btn
                class="icon button"
                @click="close()"
                icon="close"
            />
        </panel>
        <btn
            :disabled="currentIdx === 0"
            class="left page icon button"
            @click="emit('slideDelta', -1)"
            icon="chevronLeft"
            icon-size="30"
        />
        <btn
            :disabled="currentIdx === loadedImages.length - 1"
            class="right page icon button"
            @click="emit('slideDelta', +1)"
            icon="chevronRight"
            icon-size="30"
        />
        <portal-target name="video-toolbar" />
    </div>
</template>

<style scoped lang="css">
@reference "@/assets/tailwind.css";

@layer components {
    .lightbox {
        @apply
            z-(--base-z-index)
            fixed
            top-0
            left-0
            w-full
            h-full
            select-none
            bg-black/85
            text-(--color-text);
    }

    .lightbox-content-wrapper {
        @apply
            absolute
            flex
            transition-[top,left];

        &[data-anim="false"] {
            @apply
                transition-[top];
        }

        &[data-dragging="true"] {
            @apply
                transition-none;
        }

        &[data-exit-direction="up"] {
            top: -100vh !important;
        }

        &[data-exit-direction="down"] {
            top: 100vh !important;
        }
    }

    .lightbox-content-item {
        @apply
            relative
            h-screen
            w-screen
            flex
            items-center
            justify-center;
    }

    .button {
        &.page {
            @apply absolute
                top-1/2
                -translate-y-1/2;

            &.left {
                @apply left-3;
            }

            &.right {
                @apply right-3;
            }
        }
    }
}
</style>
