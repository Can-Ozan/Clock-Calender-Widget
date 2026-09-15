# Clock & Calendar Widget v2.0

**Your time, thoughtfully arranged.** A private clock, calendar and collection of lightweight personal time tools by [Can-Ozan](https://github.com/Can-Ozan).

Vanilla TypeScript + Vite. No account, backend, external APIs, trackers, external fonts or runtime dependencies.

![Desktop preview](docs/preview.png)

[Mobile preview](docs/preview-mobile.png) · [Dark theme](docs/preview-dark.png) · [Report an issue](https://github.com/Can-Ozan/Clock-Calender-Widget/issues)

There is no hosted live demo. These are screenshots of the locally running production build.

## Features

- **Clock:** correct 12h/24h formatting, optional seconds and blinking separators, automatic local timezone or an IANA timezone. Daylight saving follows the browser's timezone rules.
- **Calendar:** Monday-first, six-week grid; previous/next month, Today, month/year controls and date jump. Adjacent-month selection opens that month.
- **Date details:** selected weekday/date, day of year, ISO week and week-year, and days remaining in the year.
- **Local events:** create, edit, move and delete titles, descriptions, optional times and labeled color categories. Event dots and accessible counts appear on dates. Limit: 1,000 events.
- **World clocks:** optional expandable section with up to five timezones, including Istanbul, London, New York, Tokyo and Berlin. Each shows its local date and time.
- **Countdowns:** up to eight titled date targets with create, edit, delete, target-day and elapsed states. Start from a selected future date.
- **Appearance:** Light, Dark or System; Blue, Purple, Emerald or Orange accents; English and Turkish interfaces. System mode follows OS changes.
- **Accessibility:** native buttons and dialogs, keyboard calendar navigation, visible focus, useful status announcements, reduced motion and forced-colors support.
- **Offline:** installable PWA with local icons and versioned caches. Updates wait for you to finish editing and select **Update now**.
- **Efficiency:** one aligned clock timer, paused in hidden documents. Minute-only ticking when seconds are hidden. World clocks share the timer; calendar statistics refresh daily.

Preferences, events and countdowns survive reloads. Tabs on the same origin receive saved-data changes from other tabs.

## Getting started

Use **Node.js 24 LTS** (recommended; see `.nvmrc`) and npm. Supported engines: Node **22.13+ within 22.x, or 24+**.

```sh
git clone https://github.com/Can-Ozan/Clock-Calender-Widget.git
cd Clock-Calender-Widget
npm install
npm run dev
```

Open **http://localhost:3000**. The development server reports an error if that port is occupied.

## Commands

| Command                 | Purpose                                         |
| ----------------------- | ----------------------------------------------- |
| `npm run dev`           | Start the development server                    |
| `npm run typecheck`     | Strict TypeScript checks for source and tests   |
| `npm run lint`          | ESLint with type-aware TypeScript rules         |
| `npm run format`        | Format maintained files with Prettier           |
| `npm run format:check`  | Check formatting without writing                |
| `npm run test`          | Run the Vitest unit suite once                  |
| `npm run test:watch`    | Interactive unit tests                          |
| `npm run test:coverage` | Coverage for date utilities and stores          |
| `npm run test:tz`       | Date tests under four process timezones         |
| `npm run build`         | Typecheck, build assets and generate the worker |
| `npm run preview`       | Serve the build at http://localhost:4173        |
| `npm run test:e2e`      | Playwright browser, accessibility and PWA tests |

Use `npm ci` for reproducible CI installs. The lockfile is committed; dependencies, build output, traces and coverage are ignored.

## Production build

```sh
npm run build
npm run preview
```

The contents of `dist/` are the distributable app. Serve them over HTTP(S); opening `index.html` through `file://` does not support modules or service workers. Build includes strict type checking.

## Keyboard shortcuts

Tab into the calendar. One date is in the tab sequence; other controls remain ordinary form controls.

| Key                 | Action while a date is focused                                      |
| ------------------- | ------------------------------------------------------------------- |
| Left / Right        | Previous / next day                                                 |
| Up / Down           | Previous / next week                                                |
| Page Up / Page Down | Corresponding day in previous / next month, clamped to month length |
| Home                | Focus today and show its month                                      |
| Enter / Space       | Select focused date and update details/events                       |
| Tab / Shift+Tab     | Move between controls                                               |
| Escape              | Close a dialog                                                      |

Arrows move focus independently of selection. The Today button selects today. Calendar shortcuts do not capture input/select/textarea keys. Date-entry range: 0001–9999.

## PWA installation and offline use

1. Open a **production build** on HTTPS or localhost. Workers are intentionally disabled in development.
2. Wait for **Offline ready** in the footer, which confirms the shell has finished caching.
3. Choose **Install app**. Supported browsers show their install prompt; otherwise this opens platform instructions. Chrome/Edge also have address-bar/menu installation actions. Safari supports Add to Home Screen or Add to Dock on supported devices.
4. Open or refresh offline. Clock, calendar, settings, events and countdowns continue to work.

Installation is optional. Prompt availability depends on browser, OS and engagement criteria.

The build hashes its static files into a cache version. Online navigation revalidates HTML; installed assets come from the cache. A new worker waits for **Update now**, which reloads the current page, so finish open edits first. Old app caches are removed after activation; localStorage survives updates. The included Vite plugin generates the worker; no third-party PWA plugin or runtime caching library is required.

## Local data and date rules

| Storage key                 | Content                                      |
| --------------------------- | -------------------------------------------- |
| `clock-calendar:settings`   | Clock, appearance, language and world clocks |
| `clock-calendar:events`     | Events with plain `YYYY-MM-DD` civil dates   |
| `clock-calendar:countdowns` | Titled date targets                          |

Records are versioned and validated. The original `theme` key is recognized when v2 settings do not exist. Corrupt records are reported without crashing or immediately overwriting them. Blocked/full storage keeps changes in memory for the session and visibly explains that they will not survive reload.

The **main clock and its statistics** follow the selected timezone. The **calendar, events and countdowns** use device-local civil dates. Event times are labels; there are no alarms or push notifications. Countdowns count calendar days, not rolling 24-hour intervals. Days remaining excludes the selected day and is zero on 31 December.

No data is uploaded. Browser storage is not encrypted or backed up; clearing site data removes it. Devices, profiles, hostnames and ports have separate data. Simultaneous writes across tabs are last-write-wins.

## Architecture

```text
index.html                 Semantic app and native dialogs
style.css                  Design tokens, themes and responsive layouts
src/
  main.ts                  State, coordination and lifecycle
  Clock.ts                 One visibility-aware scheduler
  Calendar.ts              Month rendering, selection and keyboard focus
  DateUtils.ts             Civil dates, ISO weeks, cached Intl formatters
  components/
    SelectedDatePanel.ts   Selected date statistics
    EventPanel.ts          Event editor and date agenda
    WorldClock.ts          Saved timezone list, sharing the main timer
    CountdownPanel.ts      Countdown editor and day-based results
    SettingsPanel.ts       Clock, theme, accent and language preferences
  services/
    Storage.ts             Versioned serialization and failure recovery
    SettingsStore.ts       Defaults, validation and migration
    EventStore.ts          Validated event CRUD
    CountdownStore.ts      Validated countdown CRUD
  types/index.ts           Shared domain interfaces
  utils/                   DOM, language, timezone and dialog helpers
  pwa.ts                   Installation, status and update controls
public/                    Manifest, local icons and robots.txt
scripts/                   Offline build plugin, worker and QA helpers
tests/                     Vitest date and store tests
e2e/                       Browser, accessibility and PWA tests
docs/                      Audit, screenshots and validation report
```

The original modules remain the foundation. Civil-date ordinals avoid DST arithmetic errors. User titles and descriptions use `textContent`, never HTML injection.

## Testing

```sh
npm run typecheck
npm run lint
npm run test
npm run test:coverage
npm run test:tz
npm run build
npx playwright install chromium
npm run test:e2e
```

Tests cover leap/century rules, February, ISO week-years, historical dates, DST, timezone/year boundaries, calendar generation, navigation, clock formats, serialization, storage failures and CRUD. Date tests run under UTC, New York, Berlin and Auckland.

Browser checks exercise initial load, refresh, keyboard operation, all personal tools, persistence, multiple tabs, hidden-document timing, themes, Turkish, storage denial, mobile overflow and axe scans. PWA tests serve the built files from a plain local server with a strict Content Security Policy and exercise installation metadata, offline reload and waiting-worker updates.

GitHub Actions is configured to run these checks on Node 24. See [the validation report](docs/VALIDATION.md) for actual executed results and limits.

To regenerate the original vector's PNG icons and real screenshots:

```sh
npx playwright install chromium
node scripts/generate-icons.mjs
npm run build
npm run preview -- --host 127.0.0.1
# In another terminal:
node scripts/capture-preview.mjs
npm run build
```

## Static hosting

Publish the **contents of `dist/`** to any static HTTPS host. For builds from Git, use Node 24, `npm ci`, `npm run build`, and output directory `dist`. No provider-specific configuration or backend is required.

The checked-in Vite base, HTML asset paths and manifest target the **origin root (`/`)**. Subdirectory hosting needs coordinated changes to Vite `base`, HTML paths and manifest scope/start/icon paths, followed by validation at that prefix. The worker generator follows Vite's base. No SPA catch-all is needed: the app has one root page and no client routes.

Serve JavaScript and manifest files with the correct MIME types. Recommended cache headers:

| File                                          | Cache-Control                         |
| --------------------------------------------- | ------------------------------------- |
| `index.html`, `sw.js`, `manifest.webmanifest` | `no-cache`                            |
| Hashed `assets/` files                        | `public, max-age=31536000, immutable` |

Publish complete builds atomically. Do not cache the worker permanently. Optional headers include `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and this tested CSP:

```text
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'
```

Once you have a real permanent URL, add its canonical link and `og:url`, and make `og:image` absolute for social sharing. This repository asserts no nonexistent public URL.

## Contributing

Discuss larger changes in an issue, then submit a focused pull request. Preserve native TypeScript, keyboard accessibility and offline use. Add meaningful date/storage or browser regression tests. Run formatting, lint, tests and build before submitting. Keep generated output, credentials and personal events out of Git.

## License

[MIT](LICENSE). Original copyright attribution is preserved.
