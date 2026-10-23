import e621CollectImages from '~lightbox/websites/e621';
import furaffinityCollectImages from '~lightbox/websites/furaffinity';
import gelbooruCollectImages from '~lightbox/websites/gelbooru';
import inkbunnyCollectImages from '~lightbox/websites/inkbunny';
import localCollectImages from '~lightbox/websites/local';
import { realBooruCollectImages } from '~lightbox/websites/realbooru';
import rule34CollectImages from '~lightbox/websites/rule34';
import { sankakuComplexCollectImages } from '~lightbox/websites/sankakuComplex';
import yandereCollectImages from '~lightbox/websites/yandere';

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
        if (!Array.isArray(domains)) {
            domains = [domains];
        }
        for (const domain of domains) {
            let domainRegexp = domain;
            if (typeof domainRegexp === 'string') {
                domainRegexp = RegExp(
                    `^([a-z0-9_-]+\\.)*${RegExp.escape(domainRegexp)}$`,
                );
            }
            if (domainRegexp.test(location.host)) {
                return true;
            }
        }
        return false;
    });
};
