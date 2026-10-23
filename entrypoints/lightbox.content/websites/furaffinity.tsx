import { MediaType } from '~lightbox/mediaType';
import { fetchDocument } from '~lightbox/websites/_helpers.ts';

const furaffinityCollectImages: CollectImagesOptions = {
    callback: async (): Promise<MediaListItem[]> =>
        Array.from(
            document.querySelectorAll(
                '.t-image > :not(figcaption) a, .preview-gallery-container > :not(figcaption) a',
            ),
        ).map((el) => ({
            el: el as HTMLElement,
            item: {
                src: async () => {
                    const doc = await fetchDocument(
                        (el as HTMLAnchorElement).href,
                    );
                    return (
                        doc.querySelector('#submissionImg') as HTMLImageElement
                    ).src;
                },
                type: MediaType.Image,
                pageUrl: (el as HTMLAnchorElement).href,
            },
        })),
    domains: 'furaffinity.net',
};
export default furaffinityCollectImages;
