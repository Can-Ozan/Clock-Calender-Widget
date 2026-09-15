import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    locale: 'en-GB',
    colorScheme: 'light',
    timezoneId: 'Europe/Istanbul',
  });
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('#currentMonthYear').waitFor();
  await page.locator('#calendarGrid .day-cell').first().waitFor();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await mkdir('docs', { recursive: true });
  await page.screenshot({ path: 'docs/preview.png', fullPage: true, animations: 'disabled' });
  await page
    .locator('.widget')
    .screenshot({ path: 'public/icons/social.png', animations: 'disabled' });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.screenshot({
    path: 'docs/preview-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.locator('html[data-theme="dark"]').waitFor();
  await page.screenshot({ path: 'docs/preview-dark.png', fullPage: true, animations: 'disabled' });
} finally {
  await browser.close();
}
