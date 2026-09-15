# v2.0 validation and change report

Completed locally on 14 September 2026. The project remains Vanilla TypeScript + Vite and is ready to build for static hosting. No deployment was performed; no public URL or provider-specific configuration is required.

## Final checks

| Check / command           | Result | Evidence                                                                                                   |
| ------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| `npm install`             | PASS   | Lockfile resolved; 164 packages audited, 0 reported vulnerabilities                                        |
| `npm run dev`             | PASS   | Vite 8.3.0 started on port 3000; browser initial load and refresh passed                                   |
| `npm run typecheck`       | PASS   | Strict TypeScript, including application and tests                                                         |
| `npm run lint`            | PASS   | ESLint with type-aware rules; no warnings or suppressed failures                                           |
| `npm run test`            | PASS   | 65 unit tests in 2 files                                                                                   |
| `npm run test:coverage`   | PASS   | 65 tests; date/store coverage detailed below                                                               |
| `npm run test:tz`         | PASS   | 44 date tests each under UTC, New York, Berlin and Auckland                                                |
| `npm run build`           | PASS   | Typecheck plus Vite production output and generated service worker                                         |
| `npm run preview`         | PASS   | Built app served at 127.0.0.1:4173 and exercised in browser tests                                          |
| `npm run test:e2e`        | PASS   | 16 Chromium browser tests; focused PWA/layout tests also passed after the final notification-layout change |
| Browser checks            | PASS   | Initial load, refresh, CRUD, persistence, keyboard navigation and responsive layouts                       |
| PWA/offline checks        | PASS   | Native Chromium installability check, prompt handling, fallback help, offline reload and accepted updates  |
| `npm run format:check`    | PASS   | Prettier check                                                                                             |
| `git diff --check`        | PASS   | No whitespace errors                                                                                       |
| Generated output tracking | PASS   | `git ls-files dist` returns no files                                                                       |

**81 distinct passing automated tests: 65 unit + 16 browser.** The timezone matrix adds 176 repeated executions of the same 44 date tests; these are not counted as additional distinct tests.

Execution environment: Windows 11, Node 25.8.2, npm 11.11.1, Playwright 1.63.0 and Chromium 153.0.8010.12. Node 24 LTS is recommended and configured for CI; the hosted CI job itself was not executed during this local task.

## Browser coverage

- Real 12h/24h conversion, midnight/noon, optional seconds, persistence and timezone date/year boundaries.
- Monday-first calendar, adjacent-month selection, date details, arrow/week/month navigation, Home, Enter/Space and date jump.
- Event create/edit/date move/delete, optional time, category, multiline notes, saved-data reload and inert rendering of HTML-like input.
- Five-world-clock limit, local dates across zones, removal and persisted expansion.
- Countdown create/edit/delete, selected-date prefill, persisted targets, local midnight and target-day state.
- System theme changes, explicit theme override, all four accents and Turkish UI.
- Storage denial fallback and visible session-only status; updates between tabs.
- Clock pause/resume through visibility events and repeated lifecycle starts.
- No horizontal page or dialog overflow at 320, 375, 430, 768, 1024 and 1440px.
- Zero axe violations in the scanned calendar/settings states across both themes and all accents, plus the event dialog; reduced-motion behavior checked.
- No console/page errors in the instrumented production, offline and strict-CSP flows.
- Production worker and icons: correct manifest identity, scope and standalone mode; Chromium reports no manifest or installability errors.
- Offline refresh after caching, note creation and persistence while offline.
- A new worker waits while an event editor is open; accepting the update preserves saved notes and replaces old app caches. The update notice leaves widget position unchanged.
- Development refresh works and registers no service worker.

## Lighthouse

Lighthouse 13.4.1, local production build, default mobile simulation and desktop preset. Final reports were generated successfully with a dedicated headless browser.

| Category                 | Mobile | Desktop |
| ------------------------ | ------ | ------- |
| Performance              | 100    | 100     |
| Accessibility            | 100    | 100     |
| Best practices           | 100    | 100     |
| SEO                      | 100    | 100     |
| Largest contentful paint | 0.9 s  | 0.3 s   |
| Total blocking time      | 20 ms  | 0 ms    |
| Cumulative layout shift  | 0.002  | 0.002   |

Machine-readable measurements and timestamps: [lighthouse.json](lighthouse.json). Full local HTML/JSON reports are in the ignored `.local/` directory. These measurements describe this build and environment, not a guarantee for every device or future host.

The layout work reserves space for initial dynamic content. Update notifications appear outside the page flow so an available worker does not shift the widget. Hidden timezone selectors initialize on demand to reduce startup work.

## Coverage

Coverage is intentionally scoped to `DateUtils.ts` and `src/services/`, with UI behavior exercised by Playwright.

| Metric     | Coverage |
| ---------- | -------- |
| Statements | 93.02%   |
| Branches   | 85.43%   |
| Functions  | 98.41%   |
| Lines      | 95.74%   |

Coverage output is generated under ignored `coverage/`.

## Major features and architecture

The existing `main.ts`, `Clock.ts`, `Calendar.ts` and `DateUtils.ts` remain the foundation. Focused components were added for settings, selected dates, events, world clocks and countdowns. Shared typed stores centralize serialization, validation, legacy theme migration and storage failure handling.

Implemented all requested core personal-time features: clock preferences, IANA timezones, five world clocks, selected-date statistics, keyboard calendar navigation, local event CRUD, eight countdowns, light/dark/system themes, four accents, English/Turkish, responsive layout and offline PWA installation/update behavior.

The build has zero runtime dependencies. Native Intl, localStorage, matchMedia, dialog, visibility events and service workers supply the functionality. App-local icons and system fonts avoid external runtime assets. Static hosting and cache headers are documented without naming a required provider.

## Bugs fixed

- 12-hour mode displayed 24-hour numbers; midnight and noon now format correctly through one Intl path.
- Day-of-year and remaining-day arithmetic depended on local timestamps and DST; civil-day ordinals now avoid those errors.
- Week numbers were not ISO-8601; ISO week-years are now handled at year boundaries.
- Adjacent-month clicks left the selected date out of context; the calendar now navigates and selects together.
- Selected dates only highlighted/logged; date information and events now update immediately.
- Repeated clock starts created duplicate timers and hidden tabs kept ticking.
- Unguarded storage access could stop startup; corrupt/full/blocked storage is now handled visibly.
- Clickable calendar divs lacked keyboard and screen-reader support.
- Motion and low-contrast states lacked accessibility safeguards.
- Offline precaching could miss JS/CSS when a host varied responses by Origin; known same-origin static assets now match correctly.
- Initial dynamic content and update notices shifted the layout.
- Broken preview/demo links, wrong clone directory, outdated requirements and inaccurate tooling documentation were replaced.

## Dependencies

All additions are development dependencies.

| Added dependency       | Installed version | Purpose                                  |
| ---------------------- | ----------------- | ---------------------------------------- |
| `vitest`               | 4.1.11            | Unit tests                               |
| `@vitest/coverage-v8`  | 4.1.11            | Coverage                                 |
| `eslint`               | 10.10.0           | Linting                                  |
| `@eslint/js`           | 10.0.1            | JavaScript rules                         |
| `typescript-eslint`    | 8.70.0            | Type-aware linting                       |
| `globals`              | 17.12.0           | Explicit environment globals             |
| `prettier`             | 3.9.6             | Formatting                               |
| `@playwright/test`     | 1.63.0            | Browser/PWA verification and screenshots |
| `@axe-core/playwright` | 4.13.0            | Accessibility scans                      |
| `@types/node`          | 24.13.4           | Node tooling/test types                  |

Upgraded existing dependencies: Vite **5.4.21 → 8.3.0**, TypeScript **5.9.3 → 6.0.3**. TypeScript 6 is the compatible stable line for the selected typescript-eslint peer range; a blind upgrade to the newest incompatible major was avoided. Vitest 4 supports the local Node environment and Vite 8.

**Direct dependencies removed: none. Runtime dependencies added: none.** The old Vite 5 dependency tree was replaced through npm and the lockfile was regenerated. Lighthouse was run through npx as an audit tool and is not a project dependency.

## Files created (47)

- `.editorconfig`
- `.github/workflows/ci.yml`
- `.gitignore`
- `.nvmrc`
- `.prettierignore`
- `.prettierrc.json`
- `docs/AUDIT.md`
- `docs/VALIDATION.md`
- `docs/lighthouse.json`
- `docs/preview-dark.png`
- `docs/preview-mobile.png`
- `docs/preview.png`
- `e2e/app.spec.ts`
- `e2e/pwa.spec.ts`
- `eslint.config.js`
- `playwright.config.ts`
- `public/icons/apple-touch-icon.png`
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/icon.svg`
- `public/icons/maskable-512.png`
- `public/icons/social.png`
- `public/manifest.webmanifest`
- `public/robots.txt`
- `scripts/capture-preview.mjs`
- `scripts/generate-icons.mjs`
- `scripts/pwa-plugin.mjs`
- `scripts/sw-template.js`
- `scripts/test-timezones.mjs`
- `src/components/CountdownPanel.ts`
- `src/components/EventPanel.ts`
- `src/components/SelectedDatePanel.ts`
- `src/components/SettingsPanel.ts`
- `src/components/WorldClock.ts`
- `src/pwa.ts`
- `src/services/CountdownStore.ts`
- `src/services/EventStore.ts`
- `src/services/SettingsStore.ts`
- `src/services/Storage.ts`
- `src/types/index.ts`
- `src/utils/dialogs.ts`
- `src/utils/dom.ts`
- `src/utils/i18n.ts`
- `src/utils/timezones.ts`
- `tests/DateUtils.test.ts`
- `tests/Storage.test.ts`
- `vitest.config.ts`

## Files modified (12)

- `.gitattributes`
- `README.md`
- `index.html`
- `package-lock.json`
- `package.json`
- `src/Calendar.ts`
- `src/Clock.ts`
- `src/DateUtils.ts`
- `src/main.ts`
- `style.css`
- `tsconfig.json`
- `vite.config.js`

## Files removed from Git tracking (3)

- `dist/assets/index-CdX0sHv4.js`
- `dist/assets/index-Dp_WFqlL.css`
- `dist/index.html`

Production output is still generated in ignored `dist/` by the build. No user source files were deleted. The temporary provider-specific deployment configuration was discarded and is absent from the final source.

## Known limits

- Automated browser testing used Chromium on Windows. OS-level app installation, Safari/Firefox and manual screen-reader testing were not performed. Installability and the install UI branches were tested locally.
- Local data is browser/origin-specific, unencrypted and not backed up. Simultaneous tab writes are last-write-wins. There is no cross-device synchronization.
- Event times are labels, not scheduled background alarms or notifications.
- The default build targets an origin root. Subdirectory hosting needs coordinated asset-base and manifest changes documented in the README.
- No hosted deployment, public demo or hosted CI execution is claimed.
