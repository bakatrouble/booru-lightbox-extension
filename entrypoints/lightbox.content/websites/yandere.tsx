import { MediaType } from '~lightbox/mediaType';

const yandereCollectImages: CollectImagesOptions = {
    callback: async (): Promise<MediaListItem[]> =>
        Array.from(document.querySelectorAll('#post-list-posts li')).map(
            (elem) => {
                const el = elem.querySelector(
                    '.inner .thumb',
                ) as HTMLAnchorElement;
                const fileUrl = (
                    elem.querySelector('.directlink') as HTMLAnchorElement
                )?.href;
                const pageUrl = el!.href;
                const item: MediaListItem['item'] = {
                    src: fileUrl,
                    type: MediaType.Image,
                    pageUrl,
                };
                return {
                    el,
                    item,
                };
            },
        ),
    domains: ['yande.re'],
    getPrevPageUrl: () =>
        document.querySelector('.previous_page')?.getAttribute('href') ??
        undefined,
    getNextPageUrl: () =>
        document.querySelector('.next_page')?.getAttribute('href') ?? undefined,
};
export default yandereCollectImages;
