import type { TimezoneConfiguration } from '../types';

export const featuredZones: TimezoneConfiguration[] = [
  { id: 'Europe/Istanbul', city: 'Istanbul' },
  { id: 'Europe/London', city: 'London' },
  { id: 'America/New_York', city: 'New York' },
  { id: 'Asia/Tokyo', city: 'Tokyo' },
  { id: 'Europe/Berlin', city: 'Berlin' },
];

export const localTimezone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
export const resolveTimezone = (value: string): string =>
  value === 'local' ? localTimezone() : value;
export const zoneCity = (value: string): string =>
  value.split('/').at(-1)?.replaceAll('_', ' ') ?? value;

export function validTimezone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 100) return false;
  if (value === 'local') return true;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function timezoneOptions(): string[] {
  const supported =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  return [
    ...new Set(['UTC', localTimezone(), ...featuredZones.map((zone) => zone.id), ...supported]),
  ].sort();
}
