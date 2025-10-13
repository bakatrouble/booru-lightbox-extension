import e621CollectImages from './e621';
import furaffinityCollectImages from './furaffinity';
import gelbooruCollectImages from './gelbooru';
import inkbunnyCollectImages from './inkbunny';
import rule34CollectImages from './rule34';
import localCollectImages from './local';
import { sankakuComplexCollectImages } from './sankakuComplex';
import { realBooruCollectImages } from './realbooru';
import yandereCollectImages from "@/entrypoints/lightbox.content/websites/yandere";

export const collectImagesModules = [
    e621CollectImages,
    furaffinityCollectImages,
    gelbooruCollectImages,
    inkbunnyCollectImages,
    rule34CollectImages,
    localCollectImages,
    sankakuComplexCollectImages,
    realBooruCollectImages,
    yandereCollectImages,
];

export const getCollectImagesModule = (
    location: Location,
): CollectImagesOptions | undefined => {
    return collectImagesModules.find((m) => {
        let domains = m.domains;
        if (!(domains instanceof Array)) {
            domains = [domains];
        }
        for (const domain of domains) {
            if (
                (domain as RegExp).test?.(location.host) ||
                location.host.includes(domain as string)
            )
                return true;
        }
    });
};
