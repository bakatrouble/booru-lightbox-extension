import { describe, expect, it } from 'vitest';
import { MediaType } from '~lightbox/mediaType';
import { resolveScalarOrFunction } from '~lightbox/utils';
import e621 from '~lightbox/websites/e621';
import local from '~lightbox/websites/local';
import yandere from '~lightbox/websites/yandere';
import e621Html from './fixtures/e621.html?raw';
import localHtml from './fixtures/local.html?raw';
import yandereHtml from './fixtures/yandere.html?raw';
import { stubBrowser } from './setup';

describe('e621 adapter', () => {
    it('maps image / video / swf thumbnails', async () => {
        document.body.innerHTML = e621Html;
        const items = await e621.callback();
        expect(items).toHaveLength(3);

        const [img, video, swf] = await Promise.all(
            items.map(({ item }) => resolveScalarOrFunction(item)),
        );
        if (!img || !video || !swf) throw new Error('fixture mismatch');

        expect(img.src).toContain('.jpg');
        expect(img.type).toBe(MediaType.Image);
        expect(img.preview).toContain('/preview/');
        expect(img.pageUrl).toBe('https://e621.net/posts/1');

        expect(video.type).toBe(MediaType.Video);
        expect(video.src).toContain('.webm');

        // swf falls back to the thumbnail img
        expect(swf.type).toBe(MediaType.Image);
        expect(typeof swf.src).toBe('string');
    });

    it('exposes paginator urls', async () => {
        document.body.innerHTML = e621Html;
        expect(e621.getPrevPageUrl?.()).toBe('/posts?page=1');
        expect(e621.getNextPageUrl?.()).toBe('/posts?page=3');
    });

    it('label falls back to undefined when uploader extension is absent', async () => {
        stubBrowser.runtime.sendMessage.mockRejectedValueOnce(
            new Error('no receiver'),
        );
        document.body.innerHTML = e621Html;
        const [first] = await e621.callback();
        if (!first) throw new Error('fixture mismatch');
        const data = await resolveScalarOrFunction(first.item);
        await expect(
            resolveScalarOrFunction(data.label),
        ).resolves.toBeUndefined();
    });
});

describe('yandere adapter', () => {
    it('maps direct links with page urls', async () => {
        document.body.innerHTML = yandereHtml;
        const items = await yandere.callback();
        expect(items).toHaveLength(2);

        const [first] = await Promise.all(
            items.map(({ item }) => resolveScalarOrFunction(item)),
        );
        if (!first) throw new Error('fixture mismatch');
        expect(first.src).toBe('https://files.yande.re/image/100/yande100.jpg');
        expect(first.pageUrl).toBe('https://yande.re/post/show/100');
        expect(first.type).toBe(MediaType.Image);

        expect(yandere.getPrevPageUrl?.()).toBe('/post?page=1');
        expect(yandere.getNextPageUrl?.()).toBe('/post?page=3');
    });
});

describe('local adapter', () => {
    it('collects image-mime anchors only', async () => {
        document.body.innerHTML = localHtml;
        const items = await local.callback();
        // the video/mp4 anchor must not be collected
        expect(items).toHaveLength(2);

        const [first] = await Promise.all(
            items.map(({ item }) => resolveScalarOrFunction(item)),
        );
        if (!first) throw new Error('fixture mismatch');
        expect(first.src).toBe('https://localhost:8474/file/aaa');
        expect(first.type).toBe(MediaType.Image);
        expect(first.label).toBe('photo1.jpg');
    });
});
