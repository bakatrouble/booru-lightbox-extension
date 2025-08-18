import ky from 'ky';
import { MediaType } from '../index';

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
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(
                        await ky.get((el as HTMLAnchorElement).href).text(),
                        'text/html',
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
