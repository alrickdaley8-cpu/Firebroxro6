import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

let errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('net::ERR_FAILED')) errors.push(message.text());
  });
});
test.afterEach(() => { expect(errors, 'No JavaScript or rendering errors').toEqual([]); });

async function ready(page: Page) {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#app')).toHaveClass(/is-ready/, { timeout: 60_000 });
  await expect(page.locator('#loader')).toBeHidden();
}
async function rendered(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

test('renders a real scene, scans a world, exports notes, and restores the journal', async ({ page }) => {
  const missingAssets: string[] = [];
  page.on('response', response => { if (response.status() >= 400) missingAssets.push(response.url()); });
  await ready(page);
  await expect(page.locator('#universe')).toBeVisible();
  await expect(page.locator('#app')).not.toHaveClass(/is-fallback/);
  await expect(page.getByRole('heading', { name: /Beyond the/ })).toBeVisible();
  await expect(page.locator('.world-card')).toHaveCount(4);
  await page.getByRole('button', { name: 'Begin exploration', exact: true }).click();
  await expect(page.locator('#orbit-name')).toHaveText('Aurelia.');
  await expect(page.locator('#stat-radius')).toHaveText('—');
  await page.locator('#scan-button').click();
  await expect(page.locator('#scan-progress')).toBeVisible();
  await expect(page.locator('#scan-button-label')).toHaveText('View your discovery', { timeout: 20_000 });
  await expect(page.locator('#stat-radius')).toHaveText('2.1 R⊕');
  await page.locator('#scan-button').click();
  await expect(page.locator('#app-dialog')).toBeVisible();
  await expect(page.locator('.journal-entry')).toHaveCount(1);
  await expect(page.locator('.journal-progress-number')).toHaveText('1 / 04');
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.closest('dialog') !== null)).toBe(true);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export field notes' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('aether-field-notes.json');
  const data = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(data.observations).toHaveLength(1);
  expect(data.observations[0].worldId).toBe('aurelia');
  expect(data.note).toContain('fictional');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#app')).toHaveClass(/is-ready/);
  await page.locator('[data-dialog="journal"]').click();
  await expect(page.locator('.journal-entry')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear mission log' }).click();
  await expect(page.locator('#clear-confirmation')).toBeVisible();
  await page.getByRole('button', { name: 'Keep my discoveries' }).click();
  await expect(page.locator('.journal-entry')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear mission log' }).click();
  await page.getByRole('button', { name: 'Clear observations', exact: true }).click();
  await expect(page.locator('.empty-journal')).toBeVisible();
  expect(missingAssets).toEqual([]);
});

test('orbit, zoom, keyboard controls, sound, rebinding, and settings are functional', async ({ page }) => {
  await ready(page);
  const canvas = page.locator('#universe');
  const original = await canvas.screenshot();
  await page.mouse.move(875, 350);
  await page.mouse.down();
  await page.mouse.move(1020, 405, { steps: 8 });
  await page.mouse.up();
  await rendered(page);
  expect((await canvas.screenshot()).equals(original)).toBe(false);
  const rotated = await canvas.screenshot();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await rendered(page);
  expect((await canvas.screenshot()).equals(rotated)).toBe(false);
  await page.getByRole('button', { name: 'Reset camera', exact: true }).click();
  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.getByRole('button', { name: 'Change scan shortcut' }).click();
  await page.keyboard.press('q');
  await expect(page.getByRole('button', { name: 'Change scan shortcut' })).toHaveText('Q');
  await page.locator('#dialog-sound-button').click();
  await expect(page.locator('#dialog-sound-button')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#dialog-sound-button').click();
  await expect(page.locator('#dialog-sound-button')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#volume-setting').evaluate((input: HTMLInputElement) => { input.value = '62'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await expect(page.locator('#volume-output')).toHaveText('62%');
  await page.locator('#sensitivity-setting').evaluate((input: HTMLInputElement) => { input.value = '15'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await expect(page.locator('#sensitivity-output')).toHaveText('1.5×');
  await page.locator('#showOrbits-setting').uncheck();
  await page.keyboard.press('Escape');
  await expect(page.locator('#app-dialog')).not.toBeVisible();
  await canvas.focus();
  await page.keyboard.press('q');
  await expect(page.locator('#scan-progress')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#annotation-name')).toHaveText('Pelagos ');
  await expect(page.locator('#scan-progress')).toBeHidden();
  await page.keyboard.press('4');
  await expect(page.locator('[data-world="nix"]')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Space');
  await expect(page.locator('#pause-notice')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.locator('#pause-notice')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('#hero-overview')).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#app')).toHaveClass(/is-ready/);
  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(page.locator('#volume-setting')).toHaveValue('62');
  await expect(page.getByRole('button', { name: 'Change scan shortcut' })).toHaveText('Q');
  await expect(page.locator('#showOrbits-setting')).not.toBeChecked();
});

test('all rendering tiers work and the canvas resizes without layout overflow', async ({ page }) => {
  await page.setViewportSize({ width: 840, height: 680 });
  await ready(page);
  await page.getByRole('button', { name: 'Open settings' }).click();
  for (const quality of ['ultra', 'high', 'medium', 'low', 'auto']) {
    await page.locator('#quality-setting').selectOption(quality);
    await rendered(page);
    await expect(page.locator('#quality-setting')).toHaveValue(quality);
    await expect(page.locator('#quality-readout')).toContainText('WEBGL 2');
    expect(await page.locator('#universe').evaluate((canvas: HTMLCanvasElement) => canvas.getContext('webgl2')!.getError())).toBe(0);
  }
  await page.keyboard.press('Escape');
  for (const width of [1024, 1440, 390, 768]) {
    await page.setViewportSize({ width, height: 850 });
    await rendered(page);
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, canvas: document.querySelector('canvas')!.clientWidth }));
    expect(dimensions.document).toBe(width);
    expect(dimensions.canvas).toBe(width);
  }
});

test('atlas, mobile touch navigation, settings and landscape layouts work', async ({ page, browser }) => {
  // A separate touch context exercises pointer events rather than emulating a narrow desktop.
  await page.close();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce', baseURL: test.info().project.use.baseURL });
  const mobile = await context.newPage();
  mobile.on('pageerror', error => errors.push(error.message));
  await ready(mobile);
  expect(await mobile.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await mobile.locator('[data-dialog="atlas"]').tap();
  await expect(mobile.locator('.atlas-card')).toHaveCount(4);
  await mobile.locator('[data-travel="vesper"]').tap();
  await expect(mobile.locator('#orbit-name')).toHaveText('Vesper.');
  await expect(mobile.locator('#app-dialog')).not.toBeVisible();
  await mobile.locator('[data-world="nix"]').tap();
  await expect(mobile.locator('#orbit-name')).toHaveText('Nix.');
  const beforeTouch = await mobile.locator('#universe').screenshot();
  const client = await context.newCDPSession(mobile);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 220, y: 500 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 275, y: 520 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await rendered(mobile);
  expect((await mobile.locator('#universe').screenshot()).equals(beforeTouch)).toBe(false);
  await mobile.getByRole('button', { name: 'Open settings' }).tap();
  await expect(mobile.locator('#quality-setting')).toBeVisible();
  await mobile.locator('#autoRotate-setting').uncheck();
  await mobile.getByRole('button', { name: 'Close dialog' }).tap();
  await mobile.setViewportSize({ width: 844, height: 390 });
  await rendered(mobile);
  expect(await mobile.evaluate(() => document.documentElement.scrollWidth)).toBe(844);
  await expect(mobile.locator('.destination-dock')).toBeVisible();
  await context.close();
});

test('WebGL unavailability leaves an accessible, fully explorable fallback', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type === 'webgl2') return null;
      return original.apply(this, [type, ...args] as never);
    } as typeof original;
  });
  await ready(page);
  await expect(page.locator('#app')).toHaveClass(/is-fallback/);
  await expect(page.locator('#fallback-planet img')).toBeVisible();
  await page.locator('[data-world="pelagos"]').click();
  await page.getByRole('button', { name: 'Begin exploration', exact: true }).click();
  await page.locator('#scan-button').click();
  await expect(page.locator('#scan-button-label')).toHaveText('View your discovery');
  await expect(page.locator('#stat-radius')).toHaveText('1.3 R⊕');
});

test('a missing texture uses procedural art instead of breaking the renderer', async ({ page }) => {
  await page.route('**/textures/aurelia-surface.jpg', route => route.abort());
  await ready(page);
  await expect(page.locator('#app')).not.toHaveClass(/is-fallback/);
  await expect(page.locator('#toast-text')).toContainText('procedural surface');
  await expect(page.locator('#universe')).toBeVisible();
});

test('context loss pauses rendering and restoration rebuilds the environment', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.locator('#quality-setting').selectOption('high');
  await page.keyboard.press('Escape');
  await rendered(page);
  const supported = await page.evaluate(() => {
    const gl = document.querySelector('canvas')!.getContext('webgl2')!;
    const extension = gl.getExtension('WEBGL_lose_context');
    (window as Window & { recoveryExtension?: WEBGL_lose_context | null }).recoveryExtension = extension;
    extension?.loseContext();
    return !!extension;
  });
  test.skip(!supported, 'The browser does not expose the context-loss testing extension.');
  await expect(page.locator('#context-notice')).toBeVisible();
  await page.evaluate(() => (window as Window & { recoveryExtension?: WEBGL_lose_context }).recoveryExtension!.restoreContext());
  await expect(page.locator('#context-notice')).toBeHidden({ timeout: 30_000 });
  await rendered(page);
  await expect(page.locator('#app')).not.toHaveClass(/is-fallback/);
  expect(await page.locator('#universe').evaluate((canvas: HTMLCanvasElement) => canvas.getContext('webgl2')!.getError())).toBe(0);
});

test('missing HDR framebuffer support falls back to a valid direct renderer', async ({ page }) => {
  await page.addInitScript(() => {
    const original = WebGL2RenderingContext.prototype.getExtension;
    WebGL2RenderingContext.prototype.getExtension = function (name: string) {
      if (name === 'EXT_color_buffer_float') return null;
      return original.call(this, name);
    };
  });
  await ready(page);
  await expect(page.locator('#app')).not.toHaveClass(/is-fallback/);
  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.locator('#quality-setting').selectOption('high');
  await rendered(page);
  expect(await page.locator('#universe').evaluate((canvas: HTMLCanvasElement) => canvas.getContext('webgl2')!.getError())).toBe(0);
});
