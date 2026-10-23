import { expect, test } from '@playwright/test';

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
