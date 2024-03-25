import { CollectImagesOptions, MediaListItem, MediaType } from '~/entries/contentScript/types';

const e621CollectImages: CollectImagesOptions = {
    callback: async (): Promise<MediaListItem[]> =>
        Array.from(document.querySelectorAll('.post-preview')).map(el => ({
            el: el as HTMLElement,
            item: {
                src: el.getAttribute('data-file-url')!,
                label: <a href={el.querySelector('a')!.href} target="_blank">Show image</a>,
                type: el.getAttribute('data-file-ext') === 'webm' ? MediaType.Video : MediaType.Image,
            },
        })),
    domains: ['e621.net', 'e926.net'],
};
export default e621CollectImages;
