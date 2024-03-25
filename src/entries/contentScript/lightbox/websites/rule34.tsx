import axios from 'axios';
import { CollectImagesOptions, MediaListItem, MediaType } from '~/entries/contentScript/types';

const rule34CollectImages: CollectImagesOptions = {
    callback: async (): Promise<MediaListItem[]> =>
        Array.from(document.querySelectorAll('.thumbail-container > div > a')).map(el => ({
            el: el as HTMLElement,
            item: async () => {
                const parser = new DOMParser();
                const doc = parser.parseFromString((await axios.get((el as HTMLAnchorElement).href)).data as string, 'text/html');
                const media = doc.querySelector('.content_push > :first-child') as (HTMLVideoElement | HTMLImageElement);
                const isVideo = typeof (media as HTMLVideoElement).currentTime !== 'undefined';
                return {
                    src: isVideo ? media.querySelector('source')!.src : media.src,
                    label: <a href={(el as HTMLAnchorElement).href} target="_blank">Show image</a>,
                    type: isVideo ? MediaType.Video : MediaType.Image,
                }
            },
        })),
    domains: 'rule34.us',
}
export default rule34CollectImages;
