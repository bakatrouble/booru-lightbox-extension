import styles from '~/assets/tailwind.css?inline';
import { mountApp } from '~lightbox/mount';
import { getCollectImagesModule } from '~lightbox/websites';

export default defineContentScript({
    matches: ['*://*/*'],
    cssInjectionMode: 'ui',

    main: async (ctx) => {
        const existingUi = document.querySelector('booru-lightbox-ui');
        if (existingUi) {
            existingUi.remove();
            document
                .querySelectorAll('[data-lightbox-attached]')
                .forEach((el) => {
                    el.removeAttribute('data-lightbox-attached');
                });
        }

        const mod = getCollectImagesModule(window.location);
        if (mod) {
            const ui = await createShadowRootUi(ctx, {
                name: 'booru-lightbox-ui',
                position: 'inline',
                anchor: 'body',
                css: styles,
                onMount(container) {
                    return mountApp(mod, container);
                },
                onRemove: (app) => {
                    app?.unmount();
                },
            });
            ui.mount();
        }
    },
});
