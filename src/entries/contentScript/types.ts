import { VNode } from 'vue';

export enum MediaType {
    Image = 'image',
    Video = 'video',
}

export type MediaUrl = string;
export type MediaUrlCallback = () => Promise<MediaUrl>;
export type MediaLabel = string | VNode;
export type MediaLabelCallback = () => Promise<MediaLabel>;
export type MediaTypeValue = MediaType;
export type MediaTypeCallback = () => Promise<MediaTypeValue>;

export interface MediaData {
    src: MediaUrl | MediaUrlCallback;
    label?: MediaLabel | MediaLabelCallback;
    type?: MediaTypeValue | MediaTypeCallback;
    pageUrl?: MediaUrl | MediaUrlCallback;
}
export interface MediaDataScalar {
    src: MediaUrl;
    label?: MediaLabel;
    type?: MediaTypeValue;
    pageUrl?: MediaUrl;
}
export type MediaDataCallback = () => Promise<MediaData>;

export interface MediaListItem {
    el: HTMLElement,
    item: MediaData | MediaDataCallback;
}

export interface LoadedMediaListItem {
    el: HTMLElement,
    item: MediaDataScalar,
}

export interface CollectImagesOptions {
    callback: () => Promise<MediaListItem[]>;
    domains: string | RegExp | (string | RegExp)[];
    rescanInterval?: number;
    getPrevPageUrl?: () => string | undefined;
    getNextPageUrl?: () => string | undefined;
}

export interface Vector2 {
    x: number,
    y: number,
}

export enum NotificationLevel {
    Success = 'green',
    Loading = 'grey',
    Error = 'red',
}

export interface NotificationOptions {
    level: NotificationLevel;
    title?: string;
    message: string;
}

export interface UpdateNotificationOptions extends NotificationOptions {
    id: string;
}

export interface NotificationEntry extends NotificationOptions {
    visible: boolean;
    id: string;
}

export type RuntimeMessage = {
    type: 'notification',
    options: NotificationOptions,
} | {
    type: 'update-notification',
    options: UpdateNotificationOptions,
};
