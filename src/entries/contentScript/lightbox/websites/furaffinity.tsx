import axios from 'axios';
import { CollectImagesOptions, MediaListItem, MediaType } from '~/entries/contentScript/types';

const furaffinityCollectImages: CollectImagesOptions = {
    callback: async (): Promise<MediaListItem[]> =>
        Array.from(document.querySelectorAll('.t-image > :not(figcaption) a, .preview-gallery-container > :not(figcaption) a')).map(el => ({
            el: el as HTMLElement,
            item: {
                src: async () => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString((await axios.get((el as HTMLAnchorElement).href)).data as string, 'text/html');
                    return (doc.querySelector('#submissionImg') as HTMLImageElement).src;
                },
                type: MediaType.Image,
                pageUrl: (el as HTMLAnchorElement).href,
            },
        })),
    domains: 'furaffinity.net',
};
export default furaffinityCollectImages;
