import { CollectImagesOptions, MediaListItem, MediaType } from '~/entries/contentScript/types';
import axios from 'axios';

export const sankakuComplexCollectImages: CollectImagesOptions = {
    callback: async (): Promise<MediaListItem[]> =>
        Array.from(document.querySelectorAll('.post-preview-link')).map(el => ({
            el: el as HTMLElement,
            item: async () => {
                const parser = new DOMParser();
                const page = await axios.get((el as HTMLAnchorElement).href);
                const doc = parser.parseFromString(page.data, 'text/html');
                const media = doc.querySelector('#image') as (HTMLVideoElement | HTMLImageElement);
                const isVideo = typeof (media as HTMLVideoElement).currentTime !== 'undefined';
                return {
                    src: isVideo ? media.querySelector('source')!.src : media.src,
                    type: isVideo ? MediaType.Video : MediaType.Image,
                    pageUrl: (el as HTMLAnchorElement).href,
                }
            },
        })),
    domains: ['idol.sankakucomplex.com'],
    rescanInterval: 1000,
    getPrevPageUrl: () => document.querySelector('.pagination .previous_page')?.getAttribute('href') ?? undefined,
    getNextPageUrl: () => document.querySelector('.pagination .next_page')?.getAttribute('href') ?? undefined,
}
