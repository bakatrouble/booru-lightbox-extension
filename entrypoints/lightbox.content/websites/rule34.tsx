import { MediaType } from '~lightbox/mediaType';
import { fetchDocument } from '~lightbox/websites/_helpers.ts';

const rule34CollectImages: CollectImagesOptions = {
    callback: async (): Promise<MediaListItem[]> =>
        Array.from(
            document.querySelectorAll('.thumbail-container > div > a'),
        ).map((el) => ({
            el: el as HTMLElement,
            item: async () => {
                const doc = await fetchDocument((el as HTMLAnchorElement).href);
                const media = doc.querySelector(
                    '.content_push > :first-child',
                ) as HTMLVideoElement | HTMLImageElement;
                const isVideo =
                    typeof (media as HTMLVideoElement).currentTime !==
                    'undefined';
                return {
                    src: isVideo
                        ? media.querySelector('source')!.src
                        : media.src,
                    type: isVideo ? MediaType.Video : MediaType.Image,
                    pageUrl: (el as HTMLAnchorElement).href,
                };
            },
        })),
    domains: 'rule34.us',
};
export default rule34CollectImages;
