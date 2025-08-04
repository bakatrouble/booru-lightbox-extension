import { MediaType } from '@/entrypoints/lightbox.content';

const e621CollectImages: CollectImagesOptions = {
    callback: async (): Promise<MediaListItem[]> =>
        Array.from(document.querySelectorAll('article.thumbnail')).map(elem => {
            const el = elem as HTMLElement;
            const fileUrl = el.getAttribute('data-file-url')!;
            const fileExt = el.getAttribute('data-file-ext');
            const pageUrl = el.querySelector('a')!.href;
            let item: MediaListItem["item"];
            switch (fileExt) {
            case 'swf':
                item = {
                    src: el.querySelector('img')!.src,
                    type: MediaType.Image,
                    pageUrl,
                };
                break;
            case 'webm':
            case 'mp4':
                item = {
                    src: fileUrl,
                    type: MediaType.Video,
                    pageUrl,
                };
                break;
            default:
                item = {
                    src: fileUrl,
                    type: MediaType.Image,
                    pageUrl,
                };
                break;
            }
            return ({
                el,
                item,
            })
        }),
    domains: ['e621.net', 'e926.net'],
    getPrevPageUrl: () => document.querySelector('#paginator-prev')?.getAttribute('href') ?? undefined,
    getNextPageUrl: () => document.querySelector('#paginator-next')?.getAttribute('href') ?? undefined,
};
export default e621CollectImages;
