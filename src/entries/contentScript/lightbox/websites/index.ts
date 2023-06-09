import _ from 'lodash';
import e621CollectImages from './e621';
import furaffinityCollectImages from './furaffinity';
import gelbooruCollectImages from './gelbooru';
import inkbunnyCollectImages from './inkbunny';
import rule34CollectImages from './rule34';

export const collectImagesModules = [
    e621CollectImages,
    furaffinityCollectImages,
    gelbooruCollectImages,
    inkbunnyCollectImages,
    rule34CollectImages,
];

export const getCollectImagesModule = (location: Location) =>
    _.find(collectImagesModules, (module) => {
        let domains = module.domains;
        if (!(domains instanceof Array)) {
            domains = [domains];
        }
        for (const domain of domains) {
            if ((domain as RegExp).test?.(location.hostname) || location.hostname.includes(domain as string))
                return true;
        }
    });
