import type { Countdown } from '../types';
import { validDate, validId, validTitle } from './EventStore';
import { isRecord, Storage } from './Storage';

export const COUNTDOWNS_KEY = 'clock-calendar:countdowns';
export const MAX_COUNTDOWNS = 8;

export function decodeCountdown(value: unknown): Countdown | null {
  if (!isRecord(value) || !validId(value.id) || !validTitle(value.title) || !validDate(value.date))
    return null;
  return { id: value.id, title: value.title.trim(), date: value.date };
}

export function decodeCountdowns(value: unknown): Countdown[] | null {
  if (!Array.isArray(value) || value.length > MAX_COUNTDOWNS) return null;
  const countdowns: Countdown[] = [];
  for (const entry of value) {
    const countdown = decodeCountdown(entry);
    if (!countdown || countdowns.some((item) => item.id === countdown.id)) return null;
    countdowns.push(countdown);
  }
  return countdowns;
}

export class CountdownStore {
  constructor(private storage: Storage) {}
  list(): Countdown[] {
    return this.storage
      .read(COUNTDOWNS_KEY, decodeCountdowns, [])
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  save(countdown: Countdown): void {
    const valid = decodeCountdown(countdown);
    if (!valid) throw new Error('Please check the countdown fields.');
    const items = this.list().filter((item) => item.id !== countdown.id);
    if (items.length >= MAX_COUNTDOWNS)
      throw new Error(`You can save up to ${MAX_COUNTDOWNS} countdowns.`);
    this.storage.write(COUNTDOWNS_KEY, [...items, valid]);
  }
  delete(id: string): void {
    this.storage.write(
      COUNTDOWNS_KEY,
      this.list().filter((item) => item.id !== id),
    );
  }
}
