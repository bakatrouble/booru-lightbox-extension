import ky from 'ky';
import { MediaType } from '../index';

const gelbooruCollectImages: CollectImagesOptions = {
    callback: async (): Promise<MediaListItem[]> => {
        const gelbooruApiKey =
            (await browser.storage.sync.get(['gelbooruApiKey']))
                .gelbooruApiKey ?? '';
        return Array.from(
            document.querySelectorAll('a[href*="s=view&id="] > img'),
        ).map((img) => {
            const el = img.parentElement! as HTMLAnchorElement;
            const search = new URL(el.href).search;
            const pid = new URLSearchParams(search).get('id')!;
            return {
                el,
                item: {
                    src: async () => {
                        const data = (await ky
                            .get(
                                `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&id=${pid}${gelbooruApiKey}`,
                            )
                            .json()
                        ) as { post: { file_url: string }[] };
                        return data.post[0].file_url;
                    },
                    type: MediaType.Image,
                    pageUrl: (el as HTMLAnchorElement).href,
                },
            };
        });
    },
    domains: 'gelbooru.com',
    getPrevPageUrl: () => (document.querySelector('#paginator b')?.previousElementSibling as HTMLAnchorElement)?.href || undefined,
    getNextPageUrl: () => (document.querySelector('#paginator b')?.nextElementSibling as HTMLAnchorElement)?.href || undefined,
};
export default gelbooruCollectImages;
