import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { renderSlideToBytes } from '~lightbox/imageEncoder';
import { MediaType } from '~lightbox/mediaType';
import { useMediaStore } from '~lightbox/stores/media';
import { useViewerStore } from '~lightbox/stores/viewer';

// Upload targets from the external uploader extension, the currently held
// keys for hotkey matching, and the upload itself. Images go as base64 JPEG
// rendered from the slide's <img>; GIFs and videos go as URLs.
const UPLOADER_ID = 'uploader@bakatrouble.me';

export const useUploadStore = defineStore('upload', () => {
    const viewer = useViewerStore();
    const media = useMediaStore();

    const uploadLinks = ref<UploadLink[]>([]);
    const pressedKeys = ref(new Set<string>());

    // A key held across a close would otherwise stay in the set forever
    // (its keyup is ignored while closed), corrupting later hotkey matches.
    // Clearing on close covers every close path, including rescan. Pending
    // uploads die with the viewer too: their slide is gone.
    watch(
        () => viewer.show,
        async (show) => {
            if (!show) {
                clearKeys();
                await clearPending();
            }
        },
    );

    const fetchLinks = async () => {
        try {
            uploadLinks.value =
                (await browser.runtime.sendMessage(UPLOADER_ID, {
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

    const uploadGif = async (uploadLink: UploadLink, src: string) => {
        await browser.runtime.sendMessage(UPLOADER_ID, {
            type: 'upload',
            method: 'gif',
            endpoint: uploadLink.url,
            url: src,
        });
    };

    const uploadVideo = async (uploadLink: UploadLink, src: string) => {
        await browser.runtime.sendMessage(UPLOADER_ID, {
            type: 'upload',
            method: 'video',
            endpoint: uploadLink.url,
            url: src,
        });
    };

    // Uploads requested before the full image arrives wait here until the
    // slide reports it (SlideContent drains on main-image load). Entries
    // snapshot the slide index: by flush time the viewer may have moved on.
    const pendingUploads = ref<{ link: UploadLink; idx: number }[]>([]);
    const pendingNoticeId = ref<string | undefined>();
    // Synchronous guard: concurrent requests must not each send a notice
    // while the first send is still in flight (click handlers don't await
    // each other). Plain local — never rendered.
    let noticeInFlight = false;

    const notifyWaiting = async () => {
        if (pendingNoticeId.value !== undefined || noticeInFlight) return;
        noticeInFlight = true;
        try {
            pendingNoticeId.value = (await browser.runtime.sendMessage(
                UPLOADER_ID,
                {
                    type: 'notification',
                    options: {
                        level: 'loading',
                        message: 'Waiting for the full image to load…',
                    },
                },
            )) as string;
        } catch {
            // uploader unreachable — queue silently, the upload fails loudly
        } finally {
            noticeInFlight = false;
        }
    };

    const clearWaitingNotice = async () => {
        const id = pendingNoticeId.value;
        pendingNoticeId.value = undefined;
        if (id === undefined) return;
        try {
            await browser.runtime.sendMessage(UPLOADER_ID, {
                type: 'remove-notification',
                options: { id },
            });
        } catch {
            // best effort
        }
    };

    const clearPending = async () => {
        pendingUploads.value = [];
        await clearWaitingNotice();
    };

    const upload = async (
        uploadLink: UploadLink,
        root: HTMLElement | undefined,
        idx: number = viewer.currentIdx,
    ) => {
        const loaded = media.loadedImages[idx];
        const item = loaded ? loaded.item : undefined;
        if (!item) {
            return;
        }
        if (item.src.endsWith('.gif')) {
            return uploadGif(uploadLink, item.src);
        }
        if (item.type === MediaType.Video) {
            return uploadVideo(uploadLink, item.src);
        }
        if (!media.fullLoaded[idx]) {
            pendingUploads.value.push({ idx, link: uploadLink });
            await notifyWaiting();
            return;
        }

        // `root` is the lightbox element for live requests (scope down to
        // the slide) or the slide element itself for flushed ones (it is
        // already the scope).
        const scope = root?.querySelector(`.slide-${idx}`) ?? root;
        const el = scope?.querySelector(
            '.content img.main',
        ) as HTMLImageElement | null;

        if (!el) {
            return;
        }

        // Worker-encoded off the main thread with the dimension-sum cap;
        // falls back to canvas rendering where workers are unavailable.
        // Sent as raw bytes: the uploader accepts photoArrayBuffer, which
        // skips the base64 inflate/deflate round-trip on both sides.
        const data = await renderSlideToBytes(el);

        await browser.runtime.sendMessage(UPLOADER_ID, {
            type: 'upload',
            method: 'photoArrayBuffer',
            endpoint: uploadLink.url,
            data,
        });
    };

    const flushPending = async (
        idx: number,
        slideRoot: HTMLElement | undefined,
    ) => {
        const ready = pendingUploads.value.filter((p) => p.idx === idx);
        if (ready.length === 0) {
            return;
        }
        pendingUploads.value = pendingUploads.value.filter(
            (p) => p.idx !== idx,
        );
        await clearWaitingNotice();
        for (const { link } of ready) {
            await upload(link, slideRoot, idx);
        }
    };

    return {
        addKey,
        clearPending,
        fetchLinks,
        flushPending,
        matchHotkey,
        pendingUploads,
        pressedKeys,
        releaseKey,
        clearKeys,
        upload,
        uploadLinks,
    };
});
