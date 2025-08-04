import axios from 'axios';

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
                type: MediaType.Image,
                pageUrl: (el as HTMLAnchorElement).href,
            },
        })),
    domains: 'inkbunny.net',
};
export default inkbunnyCollectImages;
