import { describe, expect, it } from 'vitest';
import {
    collectImagesModules,
    getCollectImagesModule,
} from '~lightbox/websites';

const host = (h: string) => ({ host: h }) as Location;

describe('getCollectImagesModule', () => {
    it('registers nine site adapters', () => {
        expect(collectImagesModules).toHaveLength(9);
    });

    it.each([
        ['e621.net', 'e621.net'],
        ['e926.net', 'e926.net'],
        ['gelbooru.com', 'gelbooru.com'],
        ['rule34.us', 'rule34.us'],
        ['furaffinity.net', 'furaffinity.net'],
        ['inkbunny.net', 'inkbunny.net'],
        ['idol.sankakucomplex.com', 'idol.sankakucomplex.com'],
        ['realbooru.com', 'realbooru.com'],
        ['yande.re', 'yande.re'],
        ['localhost:8474', 'localhost:8474'],
        ['127.0.0.1:8474', '127.0.0.1:8474'],
    ])('matches %s', (hostname, domain) => {
        const mod = getCollectImagesModule(host(hostname));
        expect(mod).toBeDefined();
        const domains = Array.isArray(mod!.domains)
            ? mod!.domains
            : [mod!.domains];
        expect(domains.map(String)).toContain(domain);
    });

    it.each([
        ['www.e621.net', 'e621.net'],
        ['www.e926.net', 'e926.net'],
        ['www.gelbooru.com', 'gelbooru.com'],
        ['www.rule34.us', 'rule34.us'],
        ['www.furaffinity.net', 'furaffinity.net'],
        ['www.inkbunny.net', 'inkbunny.net'],
        ['www.realbooru.com', 'realbooru.com'],
        ['www.yande.re', 'yande.re'],
        ['www2.e621.net', 'e621.net'],
        ['a.b.e621.net', 'e621.net'],
    ])('matches subdomain %s', (hostname, domain) => {
        const mod = getCollectImagesModule(host(hostname));
        expect(mod).toBeDefined();
        const domains = Array.isArray(mod!.domains)
            ? mod!.domains
            : [mod!.domains];
        expect(domains.map(String)).toContain(domain);
    });

    it('returns undefined for unknown hosts', () => {
        expect(getCollectImagesModule(host('example.com'))).toBeUndefined();
    });

    it.each([
        'evilgelbooru.com',
        'gelbooru.com.evil.com',
        'notyande.re',
        'yande.re.evil.com',
        'e621.net.evil.com',
        'fakee621.net',
    ])('does not match lookalike domain %s', (hostname) => {
        expect(getCollectImagesModule(host(hostname))).toBeUndefined();
    });
});
