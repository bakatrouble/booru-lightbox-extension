import ky from 'ky';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaType } from '~lightbox/mediaType';
import { resolveScalarOrFunction } from '~lightbox/utils';
import gelbooru from '~lightbox/websites/gelbooru';
import gelbooruHtml from './fixtures/gelbooru.html?raw';
import { storageData } from './setup';

vi.mock('ky', () => ({
    default: { get: vi.fn() },
}));

const mockedGet = ky.get as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
    mockedGet.mockReset();
});

const apiResponse = (file_url: string, sample_url: string) => ({
    json: async () => ({ post: [{ file_url, sample_url }] }),
});

describe('gelbooru adapter', () => {
    it('resolves full media via the dapi endpoint', async () => {
        document.body.innerHTML = gelbooruHtml;
        mockedGet.mockImplementation((url: string) => {
            if (String(url).includes('id=111'))
                return apiResponse(
                    'https://img.gelbooru.com/images/111.jpg',
                    'https://img.gelbooru.com/samples/111.jpg',
                );
            return apiResponse(
                'https://img.gelbooru.com/images/222.mp4',
                'https://img.gelbooru.com/samples/222.jpg',
            );
        });

        const items = await gelbooru.callback();
        expect(items).toHaveLength(2);
        expect(mockedGet).toHaveBeenCalledTimes(0); // lazy: nothing fetched yet

        const [img, video] = await Promise.all(
            items.map(({ item }) => resolveScalarOrFunction(item)),
        );
        if (!img || !video) throw new Error('fixture mismatch');
        const imgData = {
            src: await resolveScalarOrFunction(img.src),
            type: await resolveScalarOrFunction(img.type),
            preview: await resolveScalarOrFunction(img.preview),
        };
        expect(imgData.src).toBe('https://img.gelbooru.com/images/111.jpg');
        expect(imgData.type).toBe(MediaType.Image);
        expect(imgData.preview).toBe(
            'https://img.gelbooru.com/samples/111.jpg',
        );
        expect(img.pageUrl).toContain('id=111');

        const videoType = await resolveScalarOrFunction(video.type);
        expect(videoType).toBe(MediaType.Video);

        expect(mockedGet).toHaveBeenCalledTimes(2);
        const firstCall = mockedGet.mock.calls[0];
        if (!firstCall) throw new Error('api not called');
        expect(String(firstCall[0])).toContain('id=111');
    });

    it('appends the stored api key to the request', async () => {
        storageData.gelbooruApiKey = '&api_key=abc&user_id=1';
        document.body.innerHTML = gelbooruHtml;
        mockedGet.mockImplementation(() =>
            apiResponse('https://x/y.jpg', 'https://x/s.jpg'),
        );

        const [first] = await gelbooru.callback();
        if (!first) throw new Error('fixture mismatch');
        await resolveScalarOrFunction(first.item);
        const firstCall = mockedGet.mock.calls[0];
        if (!firstCall) throw new Error('api not called');
        expect(String(firstCall[0])).toContain('&api_key=abc&user_id=1');
    });

    it('exposes paginator urls', async () => {
        document.body.innerHTML = gelbooruHtml;
        expect(gelbooru.getPrevPageUrl?.()).toContain('pid=0');
        expect(gelbooru.getNextPageUrl?.()).toContain('pid=84');
    });
});
