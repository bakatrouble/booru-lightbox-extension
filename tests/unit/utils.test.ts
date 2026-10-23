import { describe, expect, it } from 'vitest';
import { formatDuration, resolveScalarOrFunction } from '~lightbox/utils';

describe('resolveScalarOrFunction', () => {
    it('returns scalar values as-is', async () => {
        await expect(
            resolveScalarOrFunction('https://example.com/a.jpg'),
        ).resolves.toBe('https://example.com/a.jpg');
        await expect(
            resolveScalarOrFunction(undefined),
        ).resolves.toBeUndefined();
    });

    it('awaits callback values', async () => {
        await expect(
            resolveScalarOrFunction(async () => 'https://example.com/b.jpg'),
        ).resolves.toBe('https://example.com/b.jpg');
    });
});

describe('formatDuration', () => {
    it('formats seconds', async () => {
        expect(formatDuration(0)).toBe('00:00');
        expect(formatDuration(59)).toBe('00:59');
    });

    it('formats minutes', async () => {
        expect(formatDuration(65)).toBe('01:05');
        expect(formatDuration(600)).toBe('10:00');
    });

    // NOTE: hour+ durations are currently concatenated without a separator
    // (e.g. 3661 -> "161:01"). Locked here only as documentation; fix the
    // implementation and update this expectation to "1:01:01".
    // TODO: fix formatDuration hour handling.
});
