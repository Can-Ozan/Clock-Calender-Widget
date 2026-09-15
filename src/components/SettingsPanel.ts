import { decodeSettings } from '../services/SettingsStore';
import type { AppSettings } from '../types';
import { el, get } from '../utils/dom';
import { t } from '../utils/i18n';
import { localTimezone, timezoneOptions } from '../utils/timezones';

export class SettingsPanel {
  private media = matchMedia('(prefers-color-scheme: dark)');
  private controller = new AbortController();
  private timezone = get('#settingTimezone', HTMLSelectElement);

  constructor(
    private settings: () => AppSettings,
    private change: (patch: Partial<AppSettings>) => void,
  ) {
    const signal = this.controller.signal;
    get('#openSettings', HTMLButtonElement).addEventListener(
      'click',
      () => {
        get('#settingsDialog', HTMLDialogElement).showModal();
        this.render();
      },
      { signal },
    );
    this.media.addEventListener('change', () => this.applyTheme(), { signal });
    get('#format24', HTMLButtonElement).addEventListener('click', () => this.format(true), {
      signal,
    });
    get('#format12', HTMLButtonElement).addEventListener('click', () => this.format(false), {
      signal,
    });
    get('#settingFormat', HTMLSelectElement).addEventListener(
      'change',
      (event) => {
        if (event.target instanceof HTMLSelectElement) this.format(event.target.value === '24');
      },
      { signal },
    );
    for (const [id, key] of [
      ['settingSeconds', 'showSeconds'],
      ['settingBlink', 'blinkSeparator'],
    ] as const) {
      get(`#${id}`, HTMLInputElement).addEventListener(
        'change',
        (event) => {
          if (event.target instanceof HTMLInputElement)
            this.change({ clock: { ...this.settings().clock, [key]: event.target.checked } });
        },
        { signal },
      );
    }
    this.timezone.addEventListener(
      'change',
      () => this.change({ clock: { ...this.settings().clock, timezone: this.timezone.value } }),
      { signal },
    );
    for (const [id, key] of [
      ['settingTheme', 'theme'],
      ['settingAccent', 'accent'],
      ['settingLocale', 'locale'],
    ] as const) {
      get(`#${id}`, HTMLSelectElement).addEventListener(
        'change',
        (event) => {
          if (!(event.target instanceof HTMLSelectElement)) return;
          const value = decodeSettings({ ...this.settings(), [key]: event.target.value });
          if (value) this.change({ [key]: value[key] });
        },
        { signal },
      );
    }
  }

  private format(is24Hour: boolean): void {
    this.change({ clock: { ...this.settings().clock, is24Hour } });
  }

  private applyTheme(): void {
    const settings = this.settings();
    const theme =
      settings.theme === 'system' ? (this.media.matches ? 'dark' : 'light') : settings.theme;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.accent = settings.accent;
    get('meta[name="theme-color"]', HTMLMetaElement).content =
      theme === 'dark' ? '#13161d' : '#f5f6fa';
  }

  render(): void {
    const settings = this.settings();
    this.applyTheme();
    get('#format24', HTMLButtonElement).setAttribute(
      'aria-pressed',
      String(settings.clock.is24Hour),
    );
    get('#format12', HTMLButtonElement).setAttribute(
      'aria-pressed',
      String(!settings.clock.is24Hour),
    );
    get('#settingFormat', HTMLSelectElement).value = settings.clock.is24Hour ? '24' : '12';
    get('#settingSeconds', HTMLInputElement).checked = settings.clock.showSeconds;
    get('#settingBlink', HTMLInputElement).checked = settings.clock.blinkSeparator;
    get('#settingTheme', HTMLSelectElement).value = settings.theme;
    get('#settingAccent', HTMLSelectElement).value = settings.accent;
    get('#settingLocale', HTMLSelectElement).value = settings.locale;
    if (!get('#settingsDialog', HTMLDialogElement).open) return;
    const local = el(
      'option',
      t(`Automatic · ${localTimezone()}`, `Otomatik · ${localTimezone()}`),
    );
    local.value = 'local';
    const options = [...new Set([...timezoneOptions(), settings.clock.timezone])]
      .filter((zone) => zone !== 'local')
      .map((zone) => {
        const option = el('option', zone.replaceAll('_', ' '));
        option.value = zone;
        return option;
      });
    this.timezone.replaceChildren(local, ...options);
    this.timezone.value = settings.clock.timezone;
  }

  destroy(): void {
    this.controller.abort();
  }
}
