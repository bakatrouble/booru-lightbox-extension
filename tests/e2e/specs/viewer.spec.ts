import { expect, type Page, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
});

test('clicking a thumbnail opens the viewer on that image', async ({
    page,
}) => {
    await page.locator('.thumb').nth(1).click();
    const lightbox = page.locator('.lightbox');
    await expect(lightbox).toHaveAttribute('data-visible', 'true');
    await expect(lightbox).toContainText('2 / 3');
    await expect(page).toHaveURL(/#slide=1/);
});

test('the viewer stacks at the contracted z-index', async ({ page }) => {
    // Contract with the uploader extension (see its notifications z-index
    // test): viewer exactly 100000000, notifications exactly one above. A
    // var()-based z-index collapses to auto inside shadow DOM, so this is
    // pinned as a computed value, not a stylesheet string.
    await page.locator('.thumb').first().click();
    const lightbox = page.locator('.lightbox');
    await expect(lightbox).toHaveAttribute('data-visible', 'true');
    await expect
        .poll(async () =>
            lightbox.evaluate((el) => getComputedStyle(el).zIndex),
        )
        .toBe('100000000');
});

test('the opened slide renders its full-size image', async ({ page }) => {
    await page.locator('.thumb').first().click();
    const img = page.locator('.slide-0 img.image.main');
    await expect(img).toHaveAttribute('src', /red\.svg/);
    await expect
        .poll(async () =>
            img.evaluate((el) => (el as HTMLImageElement).naturalWidth),
        )
        .toBeGreaterThan(0);
});

test('arrow keys move between slides', async ({ page }) => {
    await page.locator('.thumb').first().click();
    const lightbox = page.locator('.lightbox');
    await expect(lightbox).toContainText('1 / 3');

    await page.keyboard.press('ArrowRight');
    await expect(lightbox).toContainText('2 / 3');
    await expect(page).toHaveURL(/#slide=1/);

    await page.keyboard.press('ArrowRight');
    await expect(lightbox).toContainText('3 / 3');

    await page.keyboard.press('ArrowLeft');
    await expect(lightbox).toContainText('2 / 3');
});

test('escape closes the viewer and clears the hash', async ({ page }) => {
    await page.locator('.thumb').first().click();
    await expect(page.locator('.lightbox')).toHaveAttribute(
        'data-visible',
        'true',
    );

    await page.keyboard.press('Escape');
    await expect(page.locator('.lightbox')).toHaveAttribute(
        'data-visible',
        'false',
    );
    await expect(page).not.toHaveURL(/#slide/);
});

test('deep link opens the viewer on the given slide', async ({ page }) => {
    // NOTE: '/index.html' (not '/') forces a full document load — navigating
    // from '/' to '/#slide=2' would be a same-document hash change and the
    // app only reads the hash on mount.
    await page.goto('/index.html#slide=2');
    const lightbox = page.locator('.lightbox');
    await expect(lightbox).toHaveAttribute('data-visible', 'true');
    await expect(lightbox).toContainText('3 / 3');
    const img = page.locator('.slide-2 img.image.main');
    await expect(img).toHaveAttribute('src', /blue\.svg/);
});

test('close button closes the viewer', async ({ page }) => {
    await page.locator('.thumb').first().click();
    const lightbox = page.locator('.lightbox');
    await expect(lightbox).toHaveAttribute('data-visible', 'true');

    // the last icon button in the top-right panel is the close button
    await lightbox.locator('.absolute.top-2.right-2 button').last().click();
    await expect(lightbox).toHaveAttribute('data-visible', 'false');
});

const dragLeft = async (page: Page) => {
    const size = page.viewportSize() ?? { width: 1280, height: 720 };
    const cx = size.width / 2;
    const cy = size.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    // few steps = high velocity: the gesture lib only counts fast releases
    // as swipes, a slow 25-step drag is treated as a cancelled pan
    await page.mouse.move(cx - 450, cy, { steps: 5 });
    await page.mouse.up();
};

const waitForMainImage = async (page: Page, slide: number) => {
    const img = page.locator(`.slide-${slide} img.image.main`);
    await expect
        .poll(async () =>
            img.evaluate((el) => (el as HTMLImageElement).naturalWidth),
        )
        .toBeGreaterThan(0);
};

test('drag changes slides on a fresh open', async ({ page }) => {
    await page.locator('.thumb').first().click();
    const lightbox = page.locator('.lightbox');
    await expect(lightbox).toContainText('1 / 3');

    await dragLeft(page);
    await expect(lightbox).toContainText('2 / 3');
});

// Plan 1.3 follow-up: this scenario was MEANT to pin the stuck-`pinching`
// flag, but it passes on current code — closing flips each slide's
// `current` prop to false, whose watcher calls unzoom() → zoomEnd, which
// already resets the flag (SlideContent.vue:59-67, LightBox.vue:364).
// Arrows and double-click recover the same way. The only window where
// strip-drag is ignored is a still-open zoomed session, where panning the
// image instead of sliding is correct behavior. Kept as a regression guard:
// if the recovery path ever breaks, drag stays dead after reopen.
test('zoom state recovers across close and reopen (1.3)', async ({ page }) => {
    await page.locator('.thumb').first().click();
    const lightbox = page.locator('.lightbox');
    await expect(lightbox).toContainText('1 / 3');
    await waitForMainImage(page, 0);

    const size = page.viewportSize() ?? { width: 1280, height: 720 };
    await page.mouse.move(size.width / 2, size.height / 2);
    await page.mouse.wheel(0, -600);
    await page.waitForTimeout(300);

    await page.keyboard.press('Escape');
    await expect(lightbox).toHaveAttribute('data-visible', 'false');

    await page.locator('.thumb').first().click();
    await expect(lightbox).toHaveAttribute('data-visible', 'true');

    await dragLeft(page);
    await expect(lightbox).toContainText('2 / 3');
});

// Plan 1.8: SlideContent used to log the load type on every image load.
// Fixed (log deleted); kept as a guard.
test('viewing an image emits no console noise (1.8)', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', (msg) => {
        if (msg.type() === 'log') logs.push(msg.text());
    });
    await page.locator('.thumb').first().click();
    await waitForMainImage(page, 0);
    await page.waitForTimeout(500);
    expect(logs.filter((t) => t === 'main' || t === 'preview')).toEqual([]);
});
