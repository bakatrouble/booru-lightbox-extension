import axios from 'axios';
import { CollectImagesOptions, MediaListItem, MediaType } from '~/entries/contentScript/types';

const inkbunnyCollectImages: CollectImagesOptions = {
    callback: async (): Promise<MediaListItem[]> =>
        Array.from(document.querySelectorAll('.widget_imageFromSubmission > a')).map(el => ({
            el: el as HTMLElement,
            item: {
                src: async () => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString((await axios.get((el as HTMLAnchorElement).href)).data as string, 'text/html');
                    return (doc.querySelector('.content.magicboxParent > a') as HTMLAnchorElement).href;
                },
                label: <a href={(el as HTMLAnchorElement).href}>Show image</a>,
                type: MediaType.Image,
            },
        })),
    domains: 'inkbunny.net',
};
export default inkbunnyCollectImages;
