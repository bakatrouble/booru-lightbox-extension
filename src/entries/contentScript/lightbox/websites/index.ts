import _ from 'lodash';
import e621CollectImages from './e621';
import furaffinityCollectImages from './furaffinity';
import gelbooruCollectImages from './gelbooru';
import inkbunnyCollectImages from './inkbunny';
import rule34CollectImages from './rule34';
import localCollectImages from './local';
import { sankakuComplexCollectImages } from '~/entries/contentScript/lightbox/websites/sankakuComplex';
import { realBooruCollectImages } from '~/entries/contentScript/lightbox/websites/realbooru';

export const collectImagesModules = [
    e621CollectImages,
    furaffinityCollectImages,
    gelbooruCollectImages,
    inkbunnyCollectImages,
    rule34CollectImages,
    localCollectImages,
    sankakuComplexCollectImages,
    realBooruCollectImages,
];

export const getCollectImagesModule = (location: Location) =>
    _.find(collectImagesModules, (module) => {
        let domains = module.domains;
        if (!(domains instanceof Array)) {
            domains = [domains];
        }
        for (const domain of domains) {
            if ((domain as RegExp).test?.(location.host) || location.host.includes(domain as string))
                return true;
        }
    });
