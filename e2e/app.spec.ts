import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openApp(page: Page): Promise<void> {
  await page.clock.install({ time: new Date('2026-09-15T20:47:12Z') });
  await page.goto('/');
  await expect(page.locator('#currentMonthYear')).toHaveText('September 2026');
}

async function settings(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Open settings' }).click();
}

test('formats midnight/noon, persists preferences, and uses the timezone date', async ({
  page,
}) => {
  await openApp(page);
  await expect(page.locator('#hours')).toHaveText('23');
  await page.getByRole('button', { name: '12h', exact: true }).click();
  await expect(page.locator('#hours')).toHaveText('11');
  await expect(page.locator('#ampm')).toHaveText('PM');
  await settings(page);
  await page.locator('#settingSeconds').uncheck();
  await page.locator('#settingTimezone').selectOption('UTC');
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect(page.locator('#seconds')).toBeHidden();
  await page.reload();
  await expect(page.locator('#format12')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#seconds')).toBeHidden();
  await page.clock.setSystemTime(new Date('2026-09-16T00:00:00Z'));
  await page.clock.runFor(60020);
  await expect(page.locator('#hours')).toHaveText('12');
  await expect(page.locator('#ampm')).toHaveText('AM');
  await page.clock.setSystemTime(new Date('2026-09-16T12:00:00Z'));
  await page.clock.runFor(60020);
  await expect(page.locator('#hours')).toHaveText('12');
  await expect(page.locator('#ampm')).toHaveText('PM');
  await settings(page);
  await page.locator('#settingTimezone').selectOption('Asia/Tokyo');
  await page.clock.setSystemTime(new Date('2026-12-31T23:59:00Z'));
  await page.clock.runFor(60020);
  await expect(page.locator('#dateDisplay')).toContainText('1 January 2027');
  await expect(page.locator('#dayOfYear')).toHaveText('1');
});

test('calendar selection, adjacent months, keyboard focus and date jump work together', async ({
  page,
}) => {
  await openApp(page);
  await expect(page.locator('#selectedStats')).toContainText(
    'Day 258 of 365 · Week 38 · 107 days left',
  );
  await page.locator('[data-date="2026-08-31"]').click();
  await expect(page.locator('#currentMonthYear')).toHaveText('August 2026');
  await expect(page.locator('#selectedHeading')).toHaveText('31 August 2026');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-date="2026-09-01"]')).toBeFocused();
  await expect(page.locator('#selectedHeading')).toHaveText('31 August 2026');
  await page.keyboard.press('Enter');
  await expect(page.locator('#selectedHeading')).toHaveText('1 September 2026');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-date="2026-09-08"]')).toBeFocused();
  await page.keyboard.press('PageUp');
  await expect(page.locator('#currentMonthYear')).toHaveText('August 2026');
  await page.keyboard.press('Home');
  await expect(page.locator('[data-date="2026-09-15"]')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('#selectedHeading')).toHaveText('15 September 2026');
  await page.getByText('Jump to date', { exact: true }).click();
  await page.locator('#jumpDate').fill('2024-02-29');
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(page.locator('#selectedHeading')).toHaveText('29 February 2024');
  await page.keyboard.press('PageDown');
  await expect(page.locator('[data-date="2024-03-29"]')).toBeFocused();
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(page.locator('#selectedHeading')).toHaveText('15 September 2026');
});

test('events are created, edited, moved, safely rendered, persisted and deleted', async ({
  page,
}) => {
  await openApp(page);
  await page.getByRole('button', { name: '＋ Add event' }).click();
  await page.locator('#eventTitle').fill('<img src=x onerror=alert(1)>');
  await page.locator('#eventDescription').fill('A personal note\nSecond line');
  await page.locator('#eventTime').fill('09:30');
  await page.locator('#eventCategory').selectOption('work');
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(page.locator('#eventList h4')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('#eventList img')).toHaveCount(0);
  await expect(page.locator('[data-date="2026-09-15"]')).toHaveAccessibleName(/1 event/);
  await page.reload();
  await page
    .getByRole('button', { name: 'Edit <img src=x onerror=alert(1)>', exact: true })
    .click();
  await page.locator('#eventTitle').fill('Design review');
  await page.locator('#eventDate').fill('2026-10-01');
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(page.locator('#currentMonthYear')).toHaveText('October 2026');
  await expect(page.locator('#selectedHeading')).toHaveText('1 October 2026');
  await expect(page.locator('#eventList')).toContainText('Design review');
  await page.getByRole('button', { name: 'Delete Design review', exact: true }).click();
  await expect(page.locator('#eventList')).toContainText('No events for this day');
  await expect(page.locator('[data-date="2026-10-01"] .event-dot')).toHaveCount(0);
});

test('world clocks enforce the limit and persist removal', async ({ page }) => {
  await openApp(page);
  await page.locator('#worldSection summary').click();
  for (const zone of [
    'Europe/Istanbul',
    'Europe/London',
    'America/New_York',
    'Asia/Tokyo',
    'Europe/Berlin',
  ]) {
    await page.locator('#worldZone').selectOption(zone);
    await page.locator('#addWorldClock').click();
  }
  await expect(page.locator('.world-row')).toHaveCount(5);
  await expect(page.locator('#addWorldClock')).toBeDisabled();
  await expect(page.locator('.world-row').filter({ hasText: 'Tokyo' })).toContainText('05:47');
  await expect(page.locator('.world-row').filter({ hasText: 'Tokyo' })).toContainText('16 Sept');
  await page.getByRole('button', { name: 'Remove London clock', exact: true }).click();
  await expect(page.locator('.world-row')).toHaveCount(4);
  await page.reload();
  await expect(page.locator('#worldSection')).toHaveAttribute('open', '');
  await expect(page.locator('.world-row')).toHaveCount(4);
});

test('countdowns create, edit, persist, expire and delete', async ({ page }) => {
  await openApp(page);
  await page.locator('[data-date="2026-09-30"]').click();
  await page.getByRole('button', { name: 'Count down to selected date' }).click();
  await expect(page.locator('#countdownDate')).toHaveValue('2026-09-30');
  await page.locator('#countdownTitle').fill('A new chapter');
  await page.getByRole('button', { name: 'Save countdown', exact: true }).click();
  await expect(page.locator('#countdownList')).toContainText('15 days to go');
  await page.reload();
  await page.getByRole('button', { name: 'Edit A new chapter', exact: true }).click();
  await page.locator('#countdownTitle').fill('Launch day');
  await page.locator('#countdownDate').fill('2026-09-16');
  await page.getByRole('button', { name: 'Save countdown', exact: true }).click();
  await expect(page.locator('#countdownList')).toContainText('1 day to go');
  await page.clock.setSystemTime(new Date('2026-09-15T21:01:00Z'));
  await page.clock.runFor(1100);
  await expect(page.locator('#countdownList')).toContainText('Today!');
  await page.getByRole('button', { name: 'Delete Launch day', exact: true }).click();
  await expect(page.locator('#countdownCount')).toHaveText('0 / 8');
});

test('system theme follows OS changes, explicit theme wins, and Turkish stays functional', async ({
  page,
}) => {
  await openApp(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await settings(page);
  await page.locator('#settingTheme').selectOption('light');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('#settingAccent').selectOption('emerald');
  await page.locator('#settingLocale').selectOption('tr-TR');
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await expect(page.locator('#settingsHeading')).toHaveText('Ayarlar');
  await page.keyboard.press('Escape');
  await expect(page.locator('#currentMonthYear')).toHaveText('Eylül 2026');
  await page.getByRole('button', { name: '＋ Etkinlik ekle' }).click();
  await expect(page.locator('#eventDialogHeading')).toHaveText('Etkinlik ekle');
});

test('production shell has no console errors and stays usable offline after reload', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await openApp(page);
  await expect(page.locator('#offlineStatus')).toHaveText('Offline ready');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#currentMonthYear')).toHaveText('September 2026');
  await page.getByRole('button', { name: '＋ Add event' }).click();
  await page.locator('#eventTitle').fill('An offline thought');
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await page.reload();
  await expect(page.locator('#eventList')).toContainText('An offline thought');
  await expect(page.locator('#hours')).toHaveText('23');
  expect(errors).toEqual([]);
});

test('blocked localStorage remains usable and reports session-only saves', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });
  });
  await openApp(page);
  await expect(page.locator('#storageWarning')).toBeVisible();
  await page.getByRole('button', { name: '＋ Add event' }).click();
  await page.locator('#eventTitle').fill('Session note');
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(page.locator('#eventList')).toContainText('Session note');
  await expect(page.locator('#appStatus')).toContainText('this session only');
});

test('calendar and settings are accessible in all accents and both themes', async ({ page }) => {
  await openApp(page);
  for (const theme of ['light', 'dark']) {
    await settings(page);
    await page.locator('#settingTheme').selectOption(theme);
    for (const accent of ['blue', 'purple', 'emerald', 'orange']) {
      await page.locator('#settingAccent').selectOption(accent);
      const dialog = await new AxeBuilder({ page }).analyze();
      expect(dialog.violations).toEqual([]);
      await page.keyboard.press('Escape');
      const app = await new AxeBuilder({ page }).analyze();
      expect(app.violations).toEqual([]);
      await settings(page);
    }
    await page.keyboard.press('Escape');
  }
  await page.getByRole('button', { name: '＋ Add event' }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('mobile, tablet and desktop layouts have no horizontal overflow, including dialogs', async ({
  page,
}) => {
  await openApp(page);
  for (const width of [320, 375, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await settings(page);
    await expect
      .poll(() =>
        page
          .locator('#settingsDialog')
          .evaluate((element) => element.scrollWidth <= element.clientWidth),
      )
      .toBe(true);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: '＋ Add event' }).click();
    await expect
      .poll(() =>
        page
          .locator('#eventDialog')
          .evaluate((element) => element.scrollWidth <= element.clientWidth),
      )
      .toBe(true);
    await page.keyboard.press('Escape');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await settings(page);
  await page.locator('#settingBlink').check();
  await page.keyboard.press('Escape');
  expect(
    await page
      .locator('.time-separator')
      .first()
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('none');
});

test('the clock pauses in hidden documents and restarts accurately without accumulating timers', async ({
  page,
}) => {
  await openApp(page);
  const start = await page.locator('#seconds').textContent();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(10000);
  await expect(page.locator('#seconds')).toHaveText(start ?? '');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    // Simulate repeated lifecycle events; start must cancel the existing timer.
    for (let index = 0; index < 5; index++)
      window.dispatchEvent(new PageTransitionEvent('pageshow'));
  });
  await expect(page.locator('#seconds')).toHaveText('22');
  await page.clock.runFor(1000);
  await expect(page.locator('#seconds')).toHaveText('23');
  await settings(page);
  await page.locator('#settingSeconds').uncheck();
  await page.keyboard.press('Escape');
  const current = await page.locator('#timeDisplay').getAttribute('aria-label');
  await page.clock.runFor(10000);
  await expect(page.locator('#timeDisplay')).toHaveAttribute('aria-label', current ?? '');
});

test('saved events synchronize between tabs', async ({ page, context }) => {
  await openApp(page);
  const second = await context.newPage();
  await openApp(second);
  await page.getByRole('button', { name: '＋ Add event' }).click();
  await page.locator('#eventTitle').fill('Shared between tabs');
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(second.locator('#eventList')).toContainText('Shared between tabs');
  await second.close();
});

test('install control provides fallback instructions and handles a browser install prompt', async ({
  page,
}) => {
  await openApp(page);
  // Supply a controllable browser event to exercise both install UI branches.
  await page.reload();
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, {
      prompt: () => Promise.resolve(),
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    });
    window.dispatchEvent(event);
  });
  await page.getByRole('button', { name: 'Install app', exact: false }).click();
  await expect(page.locator('#installDialog')).toBeHidden();
  // Once a prompt has been consumed, the next click shows the built-in instructions.
  await page.getByRole('button', { name: 'Install app', exact: false }).click();
  await expect(page.locator('#installDialog')).toBeVisible();
  await expect(page.locator('#installDialog')).toContainText('Add to Home Screen');
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(page.locator('#installButton')).toBeHidden();
});

test('development server initializes and refreshes without registering an offline worker', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3000/');
  await expect(page.locator('#calendarGrid .day-cell')).toHaveCount(42);
  await page.reload();
  await expect(page.locator('#calendarGrid .day-cell')).toHaveCount(42);
  await expect(page.locator('#hours')).toHaveText(/^\d{2}$/);
  expect(
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length),
  ).toBe(0);
  expect(errors).toEqual([]);
});
