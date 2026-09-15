import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Storage } from '../src/services/Storage';
import {
  decodeSettings,
  DEFAULT_SETTINGS,
  SettingsStore,
  SETTINGS_KEY,
} from '../src/services/SettingsStore';
import { decodeEvents, EventStore, EVENTS_KEY } from '../src/services/EventStore';
import { CountdownStore, MAX_COUNTDOWNS } from '../src/services/CountdownStore';
import type { CalendarEvent } from '../src/types';

let data: Map<string, string>;
let storage: Storage;
let report = vi.fn<(message: string) => void>();
const event: CalendarEvent = {
  id: 'test-1',
  title: 'A plan',
  date: '2026-09-15',
  time: '09:30',
  description: 'Bring notes',
  category: 'work',
};

beforeEach(() => {
  data = new Map();
  report = vi.fn<(message: string) => void>();
  storage = new Storage(report, {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  });
});

describe('settings', () => {
  it('round-trips preferences and stores a version envelope', () => {
    const store = new SettingsStore(storage);
    const settings = store.update({
      theme: 'dark',
      clock: { ...DEFAULT_SETTINGS.clock, timezone: 'Asia/Tokyo', is24Hour: false },
    });
    expect(store.load()).toEqual(settings);
    const raw: unknown = JSON.parse(data.get(SETTINGS_KEY) ?? 'null');
    expect(raw).toEqual({ version: 1, data: settings });
  });
  it('migrates the old theme key without changing it', () => {
    data.set('theme', 'dark');
    expect(new SettingsStore(storage).load().theme).toBe('dark');
    expect(data.get('theme')).toBe('dark');
  });
  it('validates enums, booleans and timezone identifiers', () => {
    expect(
      decodeSettings({
        theme: 'invalid',
        accent: 'red',
        clock: { is24Hour: 'false', timezone: 'Mars/Olympus' },
        worldClocks: ['Asia/Tokyo', 'local', 'Asia/Tokyo', false, 'invalid'],
      }),
    ).toEqual({ ...DEFAULT_SETTINGS, worldClocks: ['Asia/Tokyo'] });
  });
  it('limits saved clocks and does not let consumers mutate defaults', () => {
    const value = decodeSettings({
      worldClocks: [
        'UTC',
        'Europe/Istanbul',
        'Europe/London',
        'Asia/Tokyo',
        'Europe/Berlin',
        'America/New_York',
      ],
    });
    expect(value?.worldClocks).toHaveLength(5);
    new SettingsStore(storage).load().clock.showSeconds = false;
    expect(DEFAULT_SETTINGS.clock.showSeconds).toBe(true);
  });
});

describe('events', () => {
  it('creates, edits, moves, sorts and deletes events', () => {
    const store = new EventStore(storage);
    store.save(event);
    store.save({ ...event, id: 'earlier', time: '08:00' });
    expect(store.forDate(event.date).map((item) => item.id)).toEqual(['earlier', 'test-1']);
    store.save({ ...event, title: 'Changed', date: '2026-10-01' });
    expect(store.list()).toHaveLength(2);
    expect(store.forDate('2026-10-01')[0]?.title).toBe('Changed');
    store.delete('test-1');
    expect(store.forDate('2026-10-01')).toEqual([]);
  });
  it.each([
    { date: '2025-02-29' },
    { time: '24:00' },
    { category: 'unknown' },
    { title: '   ' },
    { description: 'x'.repeat(2001) },
    { id: '<script>' },
  ])('rejects malformed data %o', (patch) => {
    expect(decodeEvents([{ ...event, ...patch }])).toBeNull();
  });
  it('rejects duplicate IDs and unversioned storage', () => {
    expect(decodeEvents([event, event])).toBeNull();
    data.set(EVENTS_KEY, JSON.stringify([event]));
    expect(new EventStore(storage).list()).toEqual([]);
    expect(report).toHaveBeenCalled();
  });
  it('reads the latest shared storage before writing, preserving other-tab entries', () => {
    const first = new EventStore(storage);
    const second = new EventStore(storage);
    first.save(event);
    second.save({ ...event, id: 'second' });
    first.save({ ...event, title: 'Updated' });
    expect(second.list().map((value) => value.id)).toEqual(['second', 'test-1']);
  });
});

describe('storage recovery', () => {
  it.each(['{bad json', '{"version":99,"data":[]}', '{"version":1,"data":null}'])(
    'does not crash or overwrite unreadable data',
    (value) => {
      data.set(EVENTS_KEY, value);
      expect(new EventStore(storage).list()).toEqual([]);
      expect(data.get(EVENTS_KEY)).toBe(value);
      expect(report).toHaveBeenCalled();
    },
  );
  it('keeps changes in memory when storage is blocked', () => {
    const blocked = new Storage(report, null);
    const store = new EventStore(blocked);
    store.save(event);
    expect(store.list()).toEqual([event]);
    expect(blocked.persistent).toBe(false);
    expect(report).toHaveBeenCalledTimes(1);
  });
  it('retains the old persisted value and reports quota failure', () => {
    const full = new Storage(report, {
      getItem: () => JSON.stringify({ version: 1, data: [event] }),
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    const store = new EventStore(full);
    store.save({ ...event, title: 'In memory' });
    expect(store.list()[0]?.title).toBe('In memory');
    expect(full.persistent).toBe(false);
    expect(report).toHaveBeenCalledTimes(1);
  });
  it('recovers from an exception while reading', () => {
    const blocked = new Storage(report, {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
    });
    expect(new EventStore(blocked).list()).toEqual([]);
    expect(report).toHaveBeenCalled();
  });
});

describe('countdowns', () => {
  it('round-trips, sorts, edits and deletes, retaining elapsed dates', () => {
    const store = new CountdownStore(storage);
    store.save({ id: 'new-year', title: ' New Year ', date: '2027-01-01' });
    store.save({ id: 'past', title: 'A memory', date: '2020-01-01' });
    expect(store.list().map((value) => value.id)).toEqual(['past', 'new-year']);
    store.save({ id: 'new-year', title: 'Changed', date: '2028-01-01' });
    expect(store.list()[1]?.title).toBe('Changed');
    store.delete('past');
    expect(store.list()).toHaveLength(1);
  });
  it('enforces the limit while allowing edits at capacity', () => {
    const store = new CountdownStore(storage);
    for (let index = 0; index < MAX_COUNTDOWNS; index++)
      store.save({ id: `item-${index}`, title: 'Plan', date: '2027-01-01' });
    expect(() => store.save({ id: 'extra', title: 'Extra', date: '2027-01-01' })).toThrow('8');
    expect(() => store.save({ id: 'item-0', title: 'Edited', date: '2027-01-01' })).not.toThrow();
  });
});
