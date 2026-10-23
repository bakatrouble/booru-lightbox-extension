import { MediaType } from '~lightbox/mediaType';
import './harness.css';
import { mountApp } from '~lightbox/mount';

// The viewer talks to WebExtension APIs that do not exist on a plain page.
// Stub the subset it touches so the harness exercises the real components.
(window as any).browser = {
    storage: {
        sync: {
            get: async () => ({}),
            set: async () => {},
            remove: async () => {},
        },
    },
    runtime: {
        sendMessage: async () => undefined,
    },
};

const mod: CollectImagesOptions = {
    callback: async () =>
        Array.from(document.querySelectorAll('.thumb')).map((el) => ({
            el: el as HTMLElement,
            item: {
                src: (el as HTMLElement).getAttribute('data-src')!,
                type: MediaType.Image,
                pageUrl: (el as HTMLAnchorElement).href,
            },
        })),
    domains: 'harness',
};

mountApp(mod, '#app');
