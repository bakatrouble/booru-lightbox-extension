// JPEG encoder worker source. Compiled to public/encode-worker.js by
// `pnpm build:worker` (runs automatically before dev/build/typecheck).
// The output is gitignored build glue; this file is the source of truth.
//
// Receives an ImageBitmap plus target dimensions, paints it onto an
// OffscreenCanvas (white background for transparency) and returns the
// encoded bytes. Everything heavy runs here, off the page's main thread,
// so large images no longer freeze the viewer while an upload renders.
//
// Served from the extension package and loaded via browser.runtime.getURL,
// so page CSP does not apply to it. Dependency-free on purpose: it is
// compiled as a single file, not bundled.
const workerSelf = self as unknown as {
    onmessage: ((e: MessageEvent) => void) | null;
    postMessage(message: unknown, transfer: Transferable[]): void;
};

workerSelf.onmessage = async (e: MessageEvent) => {
    const { bitmap, width, height } = e.data as {
        bitmap: ImageBitmap;
        width: number;
        height: number;
    };
    try {
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('2d context unavailable');
        }
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(bitmap, 0, 0, width, height);
        const blob = await canvas.convertToBlob({
            type: 'image/jpeg',
            quality: 1,
        });
        const buffer = await blob.arrayBuffer();
        workerSelf.postMessage({ ok: true, buffer }, [buffer]);
    } catch (error) {
        workerSelf.postMessage(
            {
                ok: false,
                message: error instanceof Error ? error.message : String(error),
            },
            [],
        );
    } finally {
        bitmap.close();
    }
};
