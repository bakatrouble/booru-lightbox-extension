import { NotificationLevel, NotificationOptions } from './entries/contentScript/types';

declare global {
    interface Window {
        galleryExtension?: {
            pushNotification: (options: { level: NotificationLevel; title: string; message: string }) => void;
        }
    }

    interface UploadLink {
        id: string,
        name: string;
        shortName: string;
        url: string;
    }
}
