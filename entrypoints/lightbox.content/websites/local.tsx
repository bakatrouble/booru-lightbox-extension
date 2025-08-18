const localCollectImages: CollectImagesOptions = {
    callback: async (): Promise<MediaListItem[]> =>
        Array.from(document.querySelectorAll('[data-mime^=image\\/]')).map(
            (el) => ({
                el: el as HTMLElement,
                item: {
                    src: (el as HTMLAnchorElement).href,
                    // label: <a href={(el as HTMLAnchorElement).href}>Show image</a>,
                    type: MediaType.Image,
                    label:
                        (el as HTMLAnchorElement).getAttribute(
                            'data-filename',
                        ) || undefined,
                },
            }),
        ),
    domains: ['127.0.0.1:8474', 'localhost:8474'],
    rescanInterval: 500,
};
export default localCollectImages;
