import { MediaType, mountApp } from '@/entrypoints/lightbox.content';

mountApp(
    {
        callback: async () => {
            return Array.from(document.querySelectorAll('.media')).map(
                (el) =>
                    ({
                        el: el as HTMLElement,
                        item: {
                            src: el.getAttribute('data-src'),
                            type: el.classList.contains('video')
                                ? MediaType.Video
                                : MediaType.Image,
                        },
                    }) as MediaListItem,
            );
        },
        domains: '',
    },
    '#app',
);
