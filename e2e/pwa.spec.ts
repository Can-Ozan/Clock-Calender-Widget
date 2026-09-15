import { expect, test } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

let server: Server;
let origin = '';
let revision = 1;

test.beforeAll(async () => {
  const output = resolve('dist');
  const entries = await readdir(output, { recursive: true, withFileTypes: true });
  const files = new Map<string, Buffer>();
  for (const entry of entries.filter((item) => item.isFile())) {
    const full = resolve(entry.parentPath, entry.name);
    files.set(`/${full.slice(output.length + 1).replaceAll('\\', '/')}`, await readFile(full));
  }
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
  };
  server = createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    const file = path === '/' ? '/index.html' : path;
    const content = files.get(file);
    if (!content) {
      response.writeHead(404);
      response.end();
      return;
    }
    const type = file.endsWith('.js')
      ? 'text/javascript'
      : file.endsWith('.css')
        ? 'text/css'
        : file.endsWith('.webmanifest')
          ? 'application/manifest+json'
          : file.endsWith('.svg')
            ? 'image/svg+xml'
            : file.endsWith('.png')
              ? 'image/png'
              : 'text/html';
    response.writeHead(200, { ...headers, 'Content-Type': type, 'Cache-Control': 'no-store' });
    response.end(
      file === '/sw.js'
        ? content
            .toString()
            .replace(/clock-calendar-\/-[a-f0-9]+/, (match) => `${match}-revision-${revision}`)
        : content,
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing server address');
  origin = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

test('static hosting with a strict CSP allows the app, and PWA updates wait for user acceptance', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(origin);
  await expect(page.locator('#offlineStatus')).toHaveText('Offline ready');
  await page.getByRole('button', { name: '＋ Add event' }).click();
  await page.locator('#eventTitle').fill('Keep this saved note');
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await page.getByRole('button', { name: '＋ Add event' }).click();
  await page.locator('#eventTitle').fill('An unfinished draft');
  const widgetTop = await page
    .locator('.widget')
    .evaluate((element) => element.getBoundingClientRect().top);
  revision = 2;
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
  });
  await expect(page.locator('#updateBanner')).toBeVisible();
  expect(
    await page.locator('.widget').evaluate((element) => element.getBoundingClientRect().top),
  ).toBe(widgetTop);
  await expect(page.locator('#eventTitle')).toHaveValue('An unfinished draft');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Update now' }).click();
  await expect(page.locator('#updateBanner')).toBeHidden();
  await expect(page.locator('#eventList')).toContainText('Keep this saved note');
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await caches.keys()).filter((key) => key.startsWith('clock-calendar-')),
      ),
    )
    .toEqual([expect.stringContaining('revision-2')]);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#eventList')).toContainText('Keep this saved note');
  expect(errors).toEqual([]);
});

test('manifest provides installable icons, scope, identity and standalone display', async ({
  request,
  page,
  context,
}) => {
  const response = await request.get(`${origin}/manifest.webmanifest`);
  expect(response.status()).toBe(200);
  const manifest: unknown = await response.json();
  expect(manifest).toMatchObject({
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    icons: expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
    ]),
  });
  for (const name of ['icon-192.png', 'icon-512.png', 'maskable-512.png', 'apple-touch-icon.png']) {
    const icon = await request.get(`${origin}/icons/${name}`);
    expect(icon.status()).toBe(200);
    expect(icon.headers()['content-type']).toBe('image/png');
  }
  await page.goto(origin);
  await expect(page.locator('#offlineStatus')).toHaveText('Offline ready');
  const cdp = await context.newCDPSession(page);
  const manifestInfo = await cdp.send('Page.getAppManifest');
  expect(manifestInfo.errors).toEqual([]);
  const installability = await cdp.send('Page.getInstallabilityErrors');
  expect(installability.installabilityErrors).toEqual([]);
  await cdp.detach();
});
