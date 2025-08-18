export default defineBackground({
    main: () => {
        browser.webRequest.onHeadersReceived.addListener(
            ({ responseHeaders, url }) => {
                console.log('Adding CSP header to', url, responseHeaders);
                responseHeaders = responseHeaders?.filter(
                    (h) => h.name.toLowerCase() !== 'content-security-policy',
                );
                responseHeaders?.push({
                    name: 'content-security-policy',
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
            ['blocking', 'responseHeaders'],
        );
    },
});
