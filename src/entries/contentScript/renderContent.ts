import browser from "webextension-polyfill";

export default async function renderContent(
    name: string,
    cssPaths: string[],
    render: (appRoot: HTMLElement) => void,
) {
    document.querySelector(`.vite-webext-app-${name}`)?.remove();
    const appContainer = document.createElement("div");
    appContainer.classList.add(`vite-webext-app-${name}`);
    const shadowRoot = appContainer.attachShadow({
        mode: import.meta.env.MODE === "development" ? "open" : "closed",
    });
    const appRoot = document.createElement("div");

    if (import.meta.hot) {
        const { addViteStyleTarget } = await import(
            "@samrum/vite-plugin-web-extension/client"
        );

        await addViteStyleTarget(shadowRoot);
    } else {
        cssPaths.forEach((cssPath: string) => {
            const styleEl = document.createElement("link");
            styleEl.setAttribute("rel", "stylesheet");
            styleEl.setAttribute("href", browser.runtime.getURL(cssPath));
            shadowRoot.appendChild(styleEl);
        });
    }

    shadowRoot.appendChild(appRoot);
    document.body.appendChild(appContainer);

    render(appRoot);
}
