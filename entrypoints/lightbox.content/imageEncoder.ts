// Upload-side JPEG rendering. Rasterizing a full-size booru image and
// JPEG-encoding it on the main thread (drawImage + toDataURL are both
// synchronous, plus ~4 bytes/px of canvas backing store) freezes the page
// for seconds on large images, so the primary path runs in an
// extension-origin worker via OffscreenCanvas. The worker file lives in
// public/ and is exposed through web_accessible_resources, so page CSP
// does not apply to it. Anything goes wrong (no Worker support, tainted
// canvas, worker error, timeout) → fall back to the legacy synchronous
// render rather than break the upload.
export const DIMENSION_SUM_CAP = 10000;

// Scale dimensions to fit width + height within the cap, preserving aspect
// ratio. Huge images only get slower and heavier past this point; the
// uploader endpoint never needs more.
export const fitDimensionSum = (
    width: number,
    height: number,
    cap: number = DIMENSION_SUM_CAP,
): { width: number; height: number } => {
    if (width + height <= cap) {
        return { width, height };
    }
    const scale = cap / (width + height);
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    };
};

const canvasToBytes = (canvas: HTMLCanvasElement): Promise<ArrayBuffer> =>
    new Promise((resolve, reject) => {
        // toBlob encodes asynchronously (unlike toDataURL), so even the
        // fallback path keeps JPEG encoding off the main thread.
        canvas.toBlob(
            async (blob) => {
                try {
                    if (!blob) {
                        throw new Error('canvas encoding failed');
                    }
                    resolve(await blob.arrayBuffer());
                } catch (error) {
                    reject(error);
                }
            },
            'image/jpeg',
            1,
        );
    });

const renderInWorker = (
    bitmap: ImageBitmap,
    width: number,
    height: number,
): Promise<ArrayBuffer> =>
    new Promise((resolve, reject) => {
        const worker = new Worker(browser.runtime.getURL('/encode-worker.js'));
        const timeout = setTimeout(() => {
            worker.terminate();
            reject(new Error('JPEG worker timed out'));
        }, 30000);
        worker.onmessage = (e: MessageEvent) => {
            clearTimeout(timeout);
            worker.terminate();
            if (e.data?.ok) {
                resolve(e.data.buffer as ArrayBuffer);
            } else {
                reject(new Error(e.data?.message ?? 'JPEG worker failed'));
            }
        };
        worker.onerror = (e: ErrorEvent) => {
            clearTimeout(timeout);
            worker.terminate();
            reject(e.error ?? new Error('JPEG worker error'));
        };
        worker.postMessage({ bitmap, width, height }, [bitmap]);
    });

const renderLegacy = async (
    el: HTMLImageElement,
    width: number,
    height: number,
): Promise<ArrayBuffer> => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.rect(0, 0, width, height);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.drawImage(el, 0, 0, width, height);
    const bytes = await canvasToBytes(canvas);
    canvas.remove();
    return bytes;
};

export const renderSlideToBytes = async (
    el: HTMLImageElement,
): Promise<ArrayBuffer> => {
    const { width, height } = fitDimensionSum(
        el.naturalWidth,
        el.naturalHeight,
    );
    try {
        if (
            typeof Worker === 'undefined' ||
            typeof createImageBitmap === 'undefined'
        ) {
            throw new Error('worker encoding unsupported');
        }
        const bitmap = await createImageBitmap(el);
        return await renderInWorker(bitmap, width, height);
    } catch {
        return renderLegacy(el, width, height);
    }
};
