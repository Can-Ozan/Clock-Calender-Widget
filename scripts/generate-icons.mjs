import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Rasterize the project's own vector icon; no third-party artwork or runtime dependency.
const svg = await readFile(new URL('../public/icons/icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const [name, size, maskable] of [
    ['icon-192', 192, false],
    ['icon-512', 512, false],
    ['apple-touch-icon', 180, false],
    ['maskable-512', 512, true],
  ]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:100%;height:100%}</style>${maskable ? svg.replace('rx="128"', 'rx="0"') : svg}`,
    );
    await page.screenshot({ path: `public/icons/${name}.png`, omitBackground: true });
  }
} finally {
  await browser.close();
}
