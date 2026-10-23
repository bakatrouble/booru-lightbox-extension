import { describe, expect, it } from 'vitest';
import {
    DIMENSION_SUM_CAP,
    fitDimensionSum,
    renderSlideToBytes,
} from '~lightbox/imageEncoder';

describe('fitDimensionSum', () => {
    it('leaves small images untouched', () => {
        expect(fitDimensionSum(200, 100)).toEqual({ height: 100, width: 200 });
    });

    it('leaves images exactly at the cap untouched', () => {
        expect(fitDimensionSum(6000, 4000)).toEqual({
            height: 4000,
            width: 6000,
        });
    });

    it('scales large images to sum to the cap, keeping aspect', () => {
        // 8000x6000 sums to 14000; scale 10000/14000
        const { height, width } = fitDimensionSum(8000, 6000);
        expect(width + height).toBe(DIMENSION_SUM_CAP);
        expect(width).toBe(5714);
        expect(height).toBe(4286);
    });

    it('handles extreme panoramas without collapsing the short edge', () => {
        const { height, width } = fitDimensionSum(20000, 100);
        expect(width + height).toBe(DIMENSION_SUM_CAP);
        expect(width).toBe(9950);
        expect(height).toBe(50);
    });

    it('never returns a zero edge', () => {
        // degenerate input still yields a drawable canvas
        expect(fitDimensionSum(0, 0)).toEqual({ height: 0, width: 0 });
        expect(fitDimensionSum(30000, 1).height).toBeGreaterThanOrEqual(1);
    });
});

describe('renderSlideToBytes fallback', () => {
    it('renders synchronously where workers are unavailable (jsdom)', async () => {
        expect(typeof Worker).toBe('undefined');
        const proto = HTMLCanvasElement.prototype as unknown as Record<
            string,
            unknown
        >;
        const origGetContext = proto.getContext;
        const origToBlob = proto.toBlob;
        proto.getContext = () => ({
            drawImage: () => {},
            fill: () => {},
            rect: () => {},
        });
        proto.toBlob = (cb: (blob: Blob | null) => void) =>
            cb(new Blob(['fake-jpeg-bytes'], { type: 'image/jpeg' }));
        try {
            const el = document.createElement('img');
            const bytes = await renderSlideToBytes(el);
            expect(bytes).toBeInstanceOf(ArrayBuffer);
            expect(bytes.byteLength).toBeGreaterThan(0);
        } finally {
            proto.getContext = origGetContext;
            proto.toBlob = origToBlob;
        }
    });
});
