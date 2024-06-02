import { CollectImagesOptions, MediaListItem, MediaType } from '~/entries/contentScript/types';

const e621CollectImages: CollectImagesOptions = {
    callback: async (): Promise<MediaListItem[]> =>
        Array.from(document.querySelectorAll('.post-preview')).map(elem => {
            const el = elem as HTMLElement;
            const fileUrl = el.getAttribute('data-file-url')!;
            const fileExt = el.getAttribute('data-file-ext');
            let item: MediaListItem["item"];
            switch (fileExt) {
            case 'swf':
                item = {
                    src: el.querySelector('img')!.src,
                    label: <a href={el.querySelector('a')!.href} target="_blank">Show flash</a>,
                    type: MediaType.Image,
                };
                break;
            case 'webm':
                item = {
                    src: fileUrl,
                    label: <a href={el.querySelector('a')!.href} target="_blank">Show video</a>,
                    type: MediaType.Video,
                };
                break;
            default:
                item = {
                    src: fileUrl,
                    label: <a href={el.querySelector('a')!.href} target="_blank">Show image</a>,
                    type: MediaType.Image,
                };
                break;
            }
            return ({
                el,
                item,
            })
        }),
    domains: ['e621.net', 'e926.net'],
};
export default e621CollectImages;
