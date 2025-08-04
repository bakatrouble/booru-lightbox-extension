export const getImageBase64 = async (el: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = el.naturalWidth;
    canvas.height = el.naturalHeight;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.rect(0, 0, el.naturalWidth, el.naturalHeight);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.drawImage(el, 0, 0);
    return canvas.toDataURL('image/jpeg', 1);
};
