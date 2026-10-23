import ky from 'ky';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaType } from '~lightbox/mediaType';
import { resolveScalarOrFunction } from '~lightbox/utils';
import furaffinity from '~lightbox/websites/furaffinity';
import inkbunny from '~lightbox/websites/inkbunny';
import { realBooruCollectImages as realbooru } from '~lightbox/websites/realbooru';
import rule34 from '~lightbox/websites/rule34';
import { sankakuComplexCollectImages as sankaku } from '~lightbox/websites/sankakuComplex';
import furaffinityHtml from './fixtures/furaffinity.html?raw';
import inkbunnyHtml from './fixtures/inkbunny.html?raw';
import realbooruHtml from './fixtures/realbooru.html?raw';
import rule34Html from './fixtures/rule34.html?raw';
import sankakuHtml from './fixtures/sankaku.html?raw';

vi.mock('ky', () => ({
    default: { get: vi.fn() },
}));

const mockedGet = ky.get as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
    mockedGet.mockReset();
});

const page = (html: string) => ({ text: async () => html });

async function resolveItem(item: MediaListItem['item']) {
    const data = await resolveScalarOrFunction(item);
    return {
        src: await resolveScalarOrFunction(data.src),
        type: await resolveScalarOrFunction(data.type),
        pageUrl: await resolveScalarOrFunction(data.pageUrl),
    };
}

function at(items: MediaListItem[], idx: number): MediaListItem['item'] {
    const entry = items[idx];
    if (!entry) throw new Error('fixture mismatch');
    return entry.item;
}

describe('rule34 adapter (post-page scraping)', () => {
    it('resolves image posts', async () => {
        document.body.innerHTML = rule34Html;
        mockedGet.mockImplementation(() =>
            page(
                `<div class="content_push"><img src="https://rule34.us/images/10.jpg" /></div>`,
            ),
        );
        const items = await rule34.callback();
        expect(items).toHaveLength(2);
        const first = await resolveItem(at(items, 0));
        expect(first.src).toBe('https://rule34.us/images/10.jpg');
        expect(first.type).toBe(MediaType.Image);
        expect(first.pageUrl).toContain('id=10');
    });

    it('resolves video posts via <source>', async () => {
        document.body.innerHTML = rule34Html;
        mockedGet.mockImplementation(() =>
            page(
                `<div class="content_push"><video><source src="https://rule34.us/images/11.mp4" /></video></div>`,
            ),
        );
        // jsdom does not implement HTMLVideoElement.currentTime detection the
        // same way as browsers; the adapter sniffs `currentTime`. Force the
        // sniff to behave as in a real browser for the video case.
        const origDescriptor = Object.getOwnPropertyDescriptor(
            window.HTMLVideoElement.prototype,
            'currentTime',
        );
        Object.defineProperty(
            window.HTMLVideoElement.prototype,
            'currentTime',
            {
                configurable: true,
                get() {
                    return 0;
                },
            },
        );
        try {
            const items = await rule34.callback();
            const second = await resolveItem(at(items, 1));
            expect(second.src).toBe('https://rule34.us/images/11.mp4');
            expect(second.type).toBe(MediaType.Video);
        } finally {
            if (origDescriptor)
                Object.defineProperty(
                    window.HTMLVideoElement.prototype,
                    'currentTime',
                    origDescriptor,
                );
        }
    });
});

describe('furaffinity adapter', () => {
    it('resolves #submissionImg from the submission page', async () => {
        document.body.innerHTML = furaffinityHtml;
        mockedGet.mockImplementation((url: string) =>
            page(
                `<img id="submissionImg" src="https://d.furaffinity.net/art/user/${String(url).includes('/101/') ? 101 : 100}.jpg" />`,
            ),
        );
        const items = await furaffinity.callback();
        expect(items).toHaveLength(2);
        const first = await resolveItem(at(items, 0));
        expect(first.src).toBe('https://d.furaffinity.net/art/user/100.jpg');
        expect(first.type).toBe(MediaType.Image);
    });
});

describe('inkbunny adapter', () => {
    it('resolves the magicboxParent link', async () => {
        document.body.innerHTML = inkbunnyHtml;
        mockedGet.mockImplementation(() =>
            page(
                `<div class="content magicboxParent"><a href="https://inkbunny.net/files/screen/200.jpg">full</a></div>`,
            ),
        );
        const items = await inkbunny.callback();
        expect(items).toHaveLength(2);
        const first = await resolveItem(at(items, 0));
        expect(first.src).toBe('https://inkbunny.net/files/screen/200.jpg');
    });
});

describe('sankakuComplex adapter', () => {
    it('resolves image posts and exposes pagination', async () => {
        document.body.innerHTML = sankakuHtml;
        mockedGet.mockImplementation(() =>
            page(
                `<img id="image" src="https://s.sankakucomplex.com/300.jpg" />`,
            ),
        );
        const items = await sankaku.callback();
        expect(items).toHaveLength(2);
        const first = await resolveItem(at(items, 0));
        expect(first.src).toBe('https://s.sankakucomplex.com/300.jpg');
        expect(first.type).toBe(MediaType.Image);
        expect(sankaku.getPrevPageUrl?.()).toBe('/post?page=1');
        expect(sankaku.getNextPageUrl?.()).toBe('/post?page=3');
    });
});

describe('realbooru adapter', () => {
    it('resolves image posts via #image', async () => {
        document.body.innerHTML = realbooruHtml;
        mockedGet.mockImplementation(() =>
            page(
                `<img id="image" src="https://realbooru.com/images/400.jpg" />`,
            ),
        );
        const items = await realbooru.callback();
        expect(items).toHaveLength(2);
        const first = await resolveItem(at(items, 0));
        expect(first.src).toBe('https://realbooru.com/images/400.jpg');
        expect(first.type).toBe(MediaType.Image);
    });

    it('resolves video posts via #gelcomVideoPlayer', async () => {
        document.body.innerHTML = realbooruHtml;
        mockedGet.mockImplementation(() =>
            page(
                `<video id="gelcomVideoPlayer"><source src="https://realbooru.com/images/401.mp4" /></video>`,
            ),
        );
        const items = await realbooru.callback();
        const second = await resolveItem(at(items, 1));
        expect(second.src).toBe('https://realbooru.com/images/401.mp4');
        expect(second.type).toBe(MediaType.Video);
    });
});
