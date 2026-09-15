import { DateUtils } from '../DateUtils';
import type { CalendarEvent } from '../types';
import { isRecord, Storage } from './Storage';

export const EVENTS_KEY = 'clock-calendar:events';
export const MAX_EVENTS = 1000;
export const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[\w-]{1,80}$/.test(value);
export const validTitle = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= 120;
export const validDate = (value: unknown): value is string =>
  typeof value === 'string' && DateUtils.parseDate(value) !== null;

export function decodeEvent(value: unknown): CalendarEvent | null {
  if (
    !isRecord(value) ||
    !validId(value.id) ||
    !validTitle(value.title) ||
    !validDate(value.date) ||
    typeof value.description !== 'string' ||
    value.description.length > 2000 ||
    typeof value.time !== 'string' ||
    (value.time !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)) ||
    (value.category !== 'personal' && value.category !== 'work' && value.category !== 'important')
  )
    return null;
  return {
    id: value.id,
    title: value.title.trim(),
    date: value.date,
    description: value.description.trim(),
    time: value.time,
    category: value.category,
  };
}

export function decodeEvents(value: unknown): CalendarEvent[] | null {
  if (!Array.isArray(value) || value.length > MAX_EVENTS) return null;
  const result: CalendarEvent[] = [];
  for (const entry of value) {
    const event = decodeEvent(entry);
    if (!event || result.some((item) => item.id === event.id)) return null;
    result.push(event);
  }
  return result;
}

export class EventStore {
  constructor(private storage: Storage) {}
  list(): CalendarEvent[] {
    return this.storage.read(EVENTS_KEY, decodeEvents, []);
  }
  forDate(date: string): CalendarEvent[] {
    return this.list()
      .filter((event) => event.date === date)
      .sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title));
  }
  save(event: CalendarEvent): void {
    const valid = decodeEvent(event);
    if (!valid) throw new Error('Please check the event fields.');
    const events = this.list().filter((entry) => entry.id !== event.id);
    if (events.length >= MAX_EVENTS) throw new Error(`You can save up to ${MAX_EVENTS} events.`);
    this.storage.write(EVENTS_KEY, [...events, valid]);
  }
  delete(id: string): void {
    this.storage.write(
      EVENTS_KEY,
      this.list().filter((event) => event.id !== id),
    );
  }
}
