import { beforeEach, vi } from 'vitest';

// Minimal stub of the WebExtension `browser` global used by adapters.
// Individual tests override behavior via `mockBrowser()` helpers.
const storageData: Record<string, unknown> = {};

const stubBrowser = {
    storage: {
        sync: {
            get: vi.fn(async (keys: string[] | string) => {
                if (Array.isArray(keys)) {
                    return Object.fromEntries(
                        keys.map((k) => [k, storageData[k]]),
                    );
                }
                return { [keys]: storageData[keys] };
            }),
            set: vi.fn(async (items: Record<string, unknown>) => {
                Object.assign(storageData, items);
            }),
            remove: vi.fn(async (key: string) => {
                delete storageData[key];
            }),
        },
    },
    runtime: {
        sendMessage: vi.fn(async () => undefined),
    },
};

vi.stubGlobal('browser', stubBrowser);

beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(storageData)) delete storageData[k];
    document.body.innerHTML = '';
    document.head.innerHTML = '';
});

export { storageData, stubBrowser };
