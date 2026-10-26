import { MediaType } from '~lightbox/mediaType';

// Extra gallery origin(s) for the real-conditions Firefox harness,
// comma-separated `host:port` values. Set ONLY for test builds
// (VITE_E2E_GALLERY_ORIGIN); production builds match just the two
// entries below.
const e2eOrigins = (import.meta.env.VITE_E2E_GALLERY_ORIGIN ?? '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);

const localCollectImages: CollectImagesOptions = {
    callback: async (): Promise<MediaListItem[]> =>
        Array.from(document.querySelectorAll('[data-mime^=image\\/]')).map(
            (el) => ({
                el: el as HTMLElement,
                item: {
                    src: (el as HTMLAnchorElement).href,
                    type: MediaType.Image,
                    label:
                        (el as HTMLAnchorElement).getAttribute(
                            'data-filename',
                        ) || undefined,
                },
            }),
        ),
    domains: ['127.0.0.1:8474', 'localhost:8474', ...e2eOrigins],
    rescanInterval: 500,
};
export default localCollectImages;
