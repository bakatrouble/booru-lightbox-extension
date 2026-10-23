import type { FullGestureState } from '@vueuse/gesture';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSlideViewport } from '~lightbox/composables/useSlideViewport';

// The viewport holds no component state, so every test below calls it
// directly — no mounting, no gesture library, no timers.
const setWindow = (w: number, h: number) => {
    Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: w,
    });
    Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        writable: true,
        value: h,
    });
};

const makeViewport = (isContentLoaded = true) => {
    const onZoomStart = vi.fn();
    const onZoomEnd = vi.fn();
    const viewport = useSlideViewport({
        isContentLoaded: () => isContentLoaded,
        onZoomStart,
        onZoomEnd,
    });
    return { onZoomEnd, onZoomStart, viewport };
};

const dragState = (over: object) =>
    ({
        dragging: true,
        delta: [0, 0],
        event: { button: 0 },
        cancel: vi.fn(),
        ...over,
    }) as unknown as FullGestureState<'drag'>;

const wheelState = (deltaY: number, x = 640, y = 360) =>
    ({
        delta: [0, deltaY],
        event: {
            preventDefault: vi.fn(),
            clientX: x,
            clientY: y,
        },
    }) as unknown as FullGestureState<'wheel'>;

const pinchState = (distance: number) =>
    ({
        da: [distance],
        pinching: true,
        origin: [640, 360],
        event: { preventDefault: vi.fn() },
    }) as unknown as FullGestureState<'pinch'>;

beforeEach(() => {
    setWindow(1280, 720);
});

describe('slide viewport', () => {
    it('centers media on screen', () => {
        const { viewport } = makeViewport();
        viewport.mediaSize.value = { x: 200, y: 100 };
        viewport.centerOnScreen();
        expect(viewport.position.value).toEqual({ x: 540, y: 310 });
    });

    it('fits oversized media into the window', () => {
        const { viewport } = makeViewport();
        viewport.mediaSize.value = { x: 2000, y: 1000 };
        viewport.fitToWindow(false, false);
        expect(viewport.currentRatio.value).toBeCloseTo(0.64, 10);
        expect(viewport.position.value).toEqual({ x: 640, y: 360 });
    });

    it('keeps fitting media at ratio 1 and centers it', () => {
        const { viewport } = makeViewport();
        viewport.mediaSize.value = { x: 200, y: 100 };
        viewport.fitToWindow(true, true);
        expect(viewport.currentRatio.value).toBe(1);
        expect(viewport.position.value).toEqual({ x: 540, y: 310 });
    });

    it('wheel zooms toward the cursor and notifies', () => {
        const { onZoomStart, viewport } = makeViewport();
        viewport.mediaSize.value = { x: 200, y: 100 };
        viewport.handleWheel(wheelState(-500));
        expect(viewport.currentRatio.value).toBe(2);
        expect(viewport.position.value).toEqual({ x: -640, y: -360 });
        expect(viewport.zoomedIn.value).toBe(true);
        expect(onZoomStart).toHaveBeenCalledTimes(1);
    });

    it('wheel does nothing before content loads', () => {
        const { onZoomStart, viewport } = makeViewport(false);
        viewport.handleWheel(wheelState(-500));
        expect(viewport.currentRatio.value).toBe(1);
        expect(viewport.zoomedIn.value).toBe(false);
        expect(onZoomStart).not.toHaveBeenCalled();
    });

    it('drag pans only when zoomed in', () => {
        const { viewport } = makeViewport();
        viewport.handleDrag(dragState({ delta: [50, 60] }));
        expect(viewport.position.value).toEqual({ x: 0, y: 0 });
        expect(viewport.panning.value).toBe(false);

        viewport.mediaSize.value = { x: 200, y: 100 };
        viewport.handleWheel(wheelState(-500));
        // the first move only starts panning; the next one moves
        viewport.handleDrag(dragState({ delta: [0, 0] }));
        expect(viewport.panning.value).toBe(true);
        viewport.handleDrag(dragState({ delta: [50, 60] }));
        expect(viewport.position.value).toEqual({ x: -590, y: -300 });
    });

    it('drag release clamps oversized media into the screen', () => {
        const { viewport } = makeViewport();
        viewport.mediaSize.value = { x: 2000, y: 1000 };
        viewport.position.value = { x: 5000, y: 5000 };
        viewport.panning.value = true;
        viewport.handleDrag(dragState({ dragging: false }));
        expect(viewport.position.value).toEqual({ x: 0, y: 0 });
        expect(viewport.panning.value).toBe(false);
    });

    it('drag release clamps small media against the far edge', () => {
        const { viewport } = makeViewport();
        viewport.mediaSize.value = { x: 200, y: 100 };
        viewport.position.value = { x: 1200, y: 50 };
        viewport.panning.value = true;
        viewport.handleDrag(dragState({ dragging: false }));
        expect(viewport.position.value).toEqual({ x: 1080, y: 50 });
    });

    it('unzoom restores the fit ratio and center, then notifies', () => {
        const { onZoomEnd, viewport } = makeViewport();
        viewport.mediaSize.value = { x: 200, y: 100 };
        viewport.handleWheel(wheelState(-500));
        expect(viewport.currentRatio.value).toBe(2);

        viewport.unzoom();
        expect(viewport.currentRatio.value).toBe(1);
        expect(viewport.position.value).toEqual({ x: 540, y: 310 });
        expect(viewport.zoomedIn.value).toBe(false);
        expect(onZoomEnd).toHaveBeenCalledTimes(1);
    });

    it('double-click unzooms', () => {
        const { onZoomEnd, viewport } = makeViewport();
        viewport.mediaSize.value = { x: 200, y: 100 };
        viewport.handleWheel(wheelState(-500));

        const event = {
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
        };
        const result = viewport.handleDoubleClick(
            event as unknown as MouseEvent,
        );
        expect(result).toBe(true);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(viewport.currentRatio.value).toBe(1);
        expect(onZoomEnd).toHaveBeenCalledTimes(1);
    });

    it('pinch gesture zooms around the origin', () => {
        const { onZoomStart, viewport } = makeViewport();
        viewport.mediaSize.value = { x: 400, y: 400 };
        viewport.handlePinch(pinchState(100));
        expect(viewport.zoomedIn.value).toBe(true);
        expect(onZoomStart).toHaveBeenCalledTimes(1);

        viewport.handlePinch(pinchState(200));
        expect(viewport.currentRatio.value).toBe(2);
        expect(viewport.position.value).toEqual({ x: -640, y: -360 });
    });

    it('pinch does nothing before content loads', () => {
        const { onZoomStart, viewport } = makeViewport(false);
        viewport.handlePinch(pinchState(100));
        expect(viewport.zoomedIn.value).toBe(false);
        expect(onZoomStart).not.toHaveBeenCalled();
    });
});
