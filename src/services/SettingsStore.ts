import type { AppSettings } from '../types';
import { validTimezone } from '../utils/timezones';
import { isRecord, Storage } from './Storage';

export const SETTINGS_KEY = 'clock-calendar:settings';
export const MAX_WORLD_CLOCKS = 5;
export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  accent: 'blue',
  locale: 'en-GB',
  clock: { is24Hour: true, showSeconds: true, blinkSeparator: false, timezone: 'local' },
  worldClocks: [],
  worldExpanded: false,
  countdownExpanded: false,
};

function oneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return options.some((option) => option === value);
}

export function decodeSettings(value: unknown): AppSettings | null {
  if (!isRecord(value)) return null;
  const defaults = structuredClone(DEFAULT_SETTINGS);
  const clock = isRecord(value.clock) ? value.clock : {};
  return {
    theme: oneOf(value.theme, ['light', 'dark', 'system']) ? value.theme : defaults.theme,
    accent: oneOf(value.accent, ['blue', 'purple', 'emerald', 'orange'])
      ? value.accent
      : defaults.accent,
    locale: oneOf(value.locale, ['en-GB', 'tr-TR']) ? value.locale : defaults.locale,
    clock: {
      is24Hour: typeof clock.is24Hour === 'boolean' ? clock.is24Hour : defaults.clock.is24Hour,
      showSeconds:
        typeof clock.showSeconds === 'boolean' ? clock.showSeconds : defaults.clock.showSeconds,
      blinkSeparator:
        typeof clock.blinkSeparator === 'boolean'
          ? clock.blinkSeparator
          : defaults.clock.blinkSeparator,
      timezone: validTimezone(clock.timezone) ? clock.timezone : 'local',
    },
    worldClocks: Array.isArray(value.worldClocks)
      ? [
          ...new Set(value.worldClocks.filter(validTimezone).filter((zone) => zone !== 'local')),
        ].slice(0, MAX_WORLD_CLOCKS)
      : [],
    worldExpanded: typeof value.worldExpanded === 'boolean' ? value.worldExpanded : false,
    countdownExpanded:
      typeof value.countdownExpanded === 'boolean' ? value.countdownExpanded : false,
  };
}

export class SettingsStore {
  constructor(private storage: Storage) {}

  load(): AppSettings {
    const fallback = structuredClone(DEFAULT_SETTINGS);
    if (typeof navigator !== 'undefined' && navigator.language.startsWith('tr'))
      fallback.locale = 'tr-TR';
    const legacy = this.storage.readText('theme');
    if (legacy === 'light' || legacy === 'dark') fallback.theme = legacy;
    return this.storage.read(SETTINGS_KEY, decodeSettings, fallback);
  }

  update(patch: Partial<AppSettings>): AppSettings {
    const value = decodeSettings({ ...this.load(), ...patch });
    if (!value) throw new Error('Invalid settings');
    this.storage.write(SETTINGS_KEY, value);
    return value;
  }
}
