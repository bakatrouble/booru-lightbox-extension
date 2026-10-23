import { MediaType } from '~lightbox/mediaType';
import { fetchDocument } from '~lightbox/websites/_helpers.ts';

export const realBooruCollectImages: CollectImagesOptions = {
    callback: async (): Promise<MediaListItem[]> =>
        Array.from(document.querySelectorAll('.items .col.thumb a')).map(
            (el) => ({
                el: el as HTMLElement,
                item: async () => {
                    const doc = await fetchDocument(
                        (el as HTMLAnchorElement).href,
                    );
                    const mediaImage = doc.querySelector(
                        '#image',
                    ) as HTMLImageElement;
                    const mediaVideo = doc.querySelector(
                        '#gelcomVideoPlayer',
                    ) as HTMLVideoElement;
                    const isVideo = !mediaImage;
                    let src = '';
                    if (mediaImage) {
                        src = mediaImage.src;
                    } else if (mediaVideo) {
                        src = mediaVideo.querySelector('source')!.src;
                    }
                    return {
                        src,
                        type: isVideo ? MediaType.Video : MediaType.Image,
                        pageUrl: (el as HTMLAnchorElement).href,
                    };
                },
            }),
        ),
    domains: ['realbooru.com'],
    getPrevPageUrl: () =>
        document.querySelector('#paginator [alt=next]')?.getAttribute('href') ??
        undefined,
    getNextPageUrl: () =>
        document.querySelector('#paginator [alt=back]')?.getAttribute('href') ??
        undefined,
};
