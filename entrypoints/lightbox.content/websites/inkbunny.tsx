import { MediaType } from '~lightbox/mediaType';
import { fetchDocument } from '~lightbox/websites/_helpers.ts';

const inkbunnyCollectImages: CollectImagesOptions = {
    callback: async (): Promise<MediaListItem[]> =>
        Array.from(
            document.querySelectorAll('.widget_imageFromSubmission > a'),
        ).map((el) => ({
            el: el as HTMLElement,
            item: {
                src: async () => {
                    const doc = await fetchDocument(
                        (el as HTMLAnchorElement).href,
                    );
                    return (
                        doc.querySelector(
                            '.content.magicboxParent > a',
                        ) as HTMLAnchorElement
                    ).href;
                },
                type: MediaType.Image,
                pageUrl: (el as HTMLAnchorElement).href,
            },
        })),
    domains: 'inkbunny.net',
};
export default inkbunnyCollectImages;
