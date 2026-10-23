import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { MediaType } from '~lightbox/mediaType';
import { useMediaStore } from '~lightbox/stores/media';
import { useViewerStore } from '~lightbox/stores/viewer';

// Upload targets from the external uploader extension, the currently held
// keys for hotkey matching, and the upload itself. Images go as base64 JPEG
// rendered from the slide's <img>; GIFs and videos go as URLs.
export const useUploadStore = defineStore('upload', () => {
    const viewer = useViewerStore();
    const media = useMediaStore();

    const uploadLinks = ref<UploadLink[]>([]);
    const pressedKeys = ref(new Set<string>());

    // A key held across a close would otherwise stay in the set forever
    // (its keyup is ignored while closed), corrupting later hotkey matches.
    // Clearing on close covers every close path, including rescan.
    watch(
        () => viewer.show,
        (show) => {
            if (!show) clearKeys();
        },
    );

    const fetchLinks = async () => {
        try {
            uploadLinks.value =
                (await browser.runtime.sendMessage('uploader@bakatrouble.me', {
                    type: 'getUploadLinks',
                })) || [];
        } catch {
            // uploader extension not installed - no upload buttons
        }
    };

    const addKey = (key: string) => {
        pressedKeys.value.add(key);
    };

    const releaseKey = (key: string) => {
        pressedKeys.value.delete(key);
    };

    const clearKeys = () => {
        pressedKeys.value.clear();
    };

    const matchHotkey = (): UploadLink | undefined => {
        const pressedKeysArray = [...pressedKeys.value];
        return uploadLinks.value.find((uploadLink) => {
            const hotkeyKeys = uploadLink.hotkey;
            const keysDiff = hotkeyKeys
                .filter((x) => !pressedKeysArray.includes(x))
                .concat(
                    pressedKeysArray.filter((x) => !hotkeyKeys.includes(x)),
                );
            return keysDiff.length === 0;
        });
    };

    const uploadGif = async (uploadLink: UploadLink) => {
        await browser.runtime.sendMessage('uploader@bakatrouble.me', {
            type: 'upload',
            method: 'gif',
            endpoint: uploadLink.url,
            url: media.currentMedia!.src,
        });
    };

    const uploadVideo = async (uploadLink: UploadLink) => {
        await browser.runtime.sendMessage('uploader@bakatrouble.me', {
            type: 'upload',
            method: 'video',
            endpoint: uploadLink.url,
            url: media.currentMedia!.src,
        });
    };

    const upload = async (
        uploadLink: UploadLink,
        root: HTMLElement | undefined,
    ) => {
        const currentIdx = viewer.currentIdx;
        if (media.previewShown[currentIdx]) {
            return;
        }

        const currentMedia = media.currentMedia;
        if (currentMedia!.src.endsWith('.gif')) {
            return uploadGif(uploadLink);
        }
        if (currentMedia!.type === MediaType.Video) {
            return uploadVideo(uploadLink);
        }

        const el = root
            ?.querySelector(`.slide-${currentIdx} .content`)
            ?.querySelector('img.main') as HTMLImageElement;

        if (!el) {
            return;
        }

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

    return {
        addKey,
        fetchLinks,
        matchHotkey,
        pressedKeys,
        releaseKey,
        clearKeys,
        upload,
        uploadLinks,
    };
});
