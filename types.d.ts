import { VNode } from 'vue';
import { MediaType } from '@/entrypoints/lightbox.content';

declare global {
    interface Window {
        galleryExtension?: {
            pushNotification: (options: {
                level: NotificationLevel;
                title: string;
                message: string;
            }) => string;
            updateNotification: (options: {
                id: string;
                level: NotificationLevel;
                title: string;
                message: string;
            }) => void;
        };
    }

    interface UploadLink {
        id: string;
        name: string;
        shortName: string;
        url: string;
        hotkey: string[];
    }

    interface WxtBrowser {
        menus: browser.menus;
    }

    type MediaUrl = string;
    type MediaUrlCallback = () => Promise<MediaUrl>;
    type MediaLabel = string | VNode;
    type MediaLabelCallback = () => Promise<MediaLabel>;
    type MediaTypeValue = MediaType;
    type MediaTypeCallback = () => Promise<MediaTypeValue>;

    interface MediaData {
        src: MediaUrl | MediaUrlCallback;
        label?: MediaLabel | MediaLabelCallback;
        type?: MediaTypeValue | MediaTypeCallback;
        pageUrl?: MediaUrl | MediaUrlCallback;
    }
    interface MediaDataScalar {
        src: MediaUrl;
        label?: MediaLabel;
        type?: MediaTypeValue;
        pageUrl?: MediaUrl;
    }
    type MediaDataCallback = () => Promise<MediaData>;

    interface MediaListItem {
        el: HTMLElement;
        item: MediaData | MediaDataCallback;
    }

    interface LoadedMediaListItem {
        el: HTMLElement;
        item: MediaDataScalar;
    }

    interface CollectImagesOptions {
        callback: () => Promise<MediaListItem[]>;
        domains: string | RegExp | (string | RegExp)[];
        rescanInterval?: number;
        getPrevPageUrl?: () => string | undefined;
        getNextPageUrl?: () => string | undefined;
    }

    interface Vector2 {
        x: number;
        y: number;
    }
}
