import { getImageBase64 } from '@/utils/getImageBase64';
import { NotificationLevel } from '@/entrypoints/lightbox.content';

export default defineBackground({
    persistent: true,
    main: () => {
        enum MenuIds {
            Prefix = 'send-to-tg-',
            Root = `${Prefix}root`,
            Settings = `${Prefix}settings`,
            Destination = `${Prefix}dst-`,
            Separator = `${Prefix}separator-`,
        }

        browser.storage.sync.get('uploadLinks')
            .then(result => {
                const uploadLinks: UploadLink[] = result.uploadLinks || [];

                browser.menus.create({
                    id: MenuIds.Root,
                    contexts: ['image'],
                    title: 'Send to Telegram',
                });

                uploadLinks.forEach((uploadLink: UploadLink) => {
                    browser.menus.create({
                        id: MenuIds.Destination + uploadLink.id,
                        parentId: MenuIds.Root,
                        contexts: ['image'],
                        title: uploadLink.name,
                    });
                });

                browser.menus.create({
                    id: MenuIds.Separator,
                    type: 'separator',
                    contexts: ['image'],
                    parentId: MenuIds.Root,
                });

                browser.menus.create({
                    id: MenuIds.Settings,
                    parentId: MenuIds.Root,
                    contexts: ['image'],
                    title: 'Settings',
                });

                browser.menus.onClicked.addListener(async (info, tab) => {
                    if (info.targetElementId) {
                        const menuItemId = info.menuItemId as unknown as string;
                        if (!menuItemId || !menuItemId?.startsWith(MenuIds.Prefix)) return;
                        if (menuItemId === MenuIds.Settings) {
                            await browser.runtime.openOptionsPage();
                            return;
                        } else if (menuItemId.startsWith(MenuIds.Destination)) {
                            const notificationId = await browser.tabs.sendMessage(tab!.id!, {
                                type: 'notification',
                                options: {
                                    level: NotificationLevel.Loading,
                                    title: 'Uploading',
                                    message: 'Uploading picture...',
                                },
                            });
                            try {

                                const url = uploadLinks.find((uploadLink: UploadLink) => uploadLink.id === menuItemId.replace(MenuIds.Destination, ''))?.url;

                                const code = `
                                (${getImageBase64.toString()})(browser.menus.getTargetElement(${info.targetElementId}));
                            `;
                                const dataUrl = (await browser.tabs.executeScript(tab!.id!, {
                                    code,
                                }))[0];

                                const r = await fetch(url!, {
                                    headers: {
                                        'Accept': 'application/json',
                                        'Content-Type': 'application/json',
                                    },
                                    method: "POST",
                                    body: JSON.stringify({
                                        "method": "post_photo",
                                        "params": [dataUrl, true],
                                        "jsonrpc": "2.0",
                                        "id": 0,
                                    }),
                                });
                                const response = await r.json();
                                if (response.result === true) {
                                    await browser.tabs.sendMessage(tab!.id!, {
                                        type: 'update-notification',
                                        options: {
                                            id: notificationId,
                                            level: NotificationLevel.Success,
                                            title: 'Success',
                                            message: 'Picture was sent successfully',
                                        },
                                    })
                                } else if (response.result === 'duplicate') {
                                    await browser.tabs.sendMessage(tab!.id!, {
                                        type: 'update-notification',
                                        options: {
                                            id: notificationId,
                                            level: NotificationLevel.Error,
                                            title: 'Duplicate',
                                            message: 'This image was sent before',
                                        },
                                    });
                                } else {
                                    console.error(response);
                                    await browser.tabs.sendMessage(tab!.id!, {
                                        type: 'update-notification',
                                        options: {
                                            id: notificationId,
                                            level: NotificationLevel.Error,
                                            title: 'Error',
                                            message: 'A server-side error has occurred while sending picture',
                                        },
                                    });
                                }
                            } catch (e) {
                                console.error(e);
                                await browser.tabs.sendMessage(tab!.id!, {
                                    type: 'update-notification',
                                    options: {
                                        id: notificationId,
                                        level: NotificationLevel.Error,
                                        title: 'Error',
                                        message: 'An extension-side error has occurred while sending picture',
                                    },
                                });
                            }
                        }
                    }
                });
            });
    }
});
