export default defineBackground({
    main: () => {
        browser.webRequest.onHeadersReceived.addListener(
            ({ responseHeaders, url }) => {
                console.log('Adding CSP header to', url, responseHeaders);
                responseHeaders?.push({
                    name: 'Content-Security-Policy',
                    value: '*',
                });
                return { responseHeaders };
            },
            {
                urls: [
                    '*://*.e621.net/*',
                    '*://*.e926.net/*',
                    '*://*.gelbooru.com/*',
                ],
            },
            [
                'blocking',
                'responseHeaders',
            ],
        )
    }
});
