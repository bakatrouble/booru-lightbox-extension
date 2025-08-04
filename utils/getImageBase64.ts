export const getImageBase64 = async (el: HTMLImageElement) => {
    return new Promise(resolve => {
        const image = new Image();

        image.crossOrigin = '';
        image.src = el.src;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
            ctx.rect(0, 0, image.naturalWidth, image.naturalHeight);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.drawImage(image, 0, 0);
            resolve(canvas.toDataURL('image/jpeg').replace(/^data:image\/(png|jpeg);base64,/, ""));
        };
    })
};
