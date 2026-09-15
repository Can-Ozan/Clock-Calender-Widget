import { describe, expect, it } from 'vitest';
import { DateUtils } from '../src/DateUtils';

describe('civil date statistics', () => {
  it.each([
    [2024, 0, 1, 1, 365],
    [2024, 1, 29, 60, 306],
    [2024, 11, 31, 366, 0],
    [2025, 2, 1, 60, 305],
    [2025, 11, 31, 365, 0],
    [2026, 8, 15, 258, 107],
    [2024, 2, 11, 71, 295],
    [2024, 10, 4, 309, 57],
  ])('%i-%i-%i is day %i with %i left at any time', (year, month, day, ordinal, left) => {
    for (const hour of [0, 12, 23]) {
      const date = new Date(year, month, day, hour, 59);
      expect(DateUtils.getDayOfYear(date)).toBe(ordinal);
      expect(DateUtils.getDaysLeftInYear(date)).toBe(left);
    }
  });
  it.each([
    [2020, 11, 31, 53],
    [2021, 0, 1, 53],
    [2021, 0, 4, 1],
    [2018, 11, 31, 1],
    [2026, 8, 15, 38],
  ])('ISO week for %i-%i-%i is %i', (year, month, day, week) => {
    expect(DateUtils.getWeekNumber(new Date(year, month, day))).toBe(week);
  });
});

describe('calendar generation', () => {
  it('generates every month across leap and century years without missing or duplicate dates', () => {
    for (const year of [1900, 2000, 2024, 2026]) {
      for (let month = 0; month < 12; month++) {
        const date = DateUtils.createDate(year, month, 1);
        const days = DateUtils.generateCalendarDays(date);
        expect(new Set(days.map((day) => DateUtils.dateKey(day.date))).size).toBe(42);
        expect(days[0]?.date.getDay()).toBe(1);
        expect(days.at(-1)?.date.getDay()).toBe(0);
        expect(days.filter((day) => day.isCurrentMonth).map((day) => day.day)).toEqual(
          Array.from({ length: DateUtils.getDaysInMonth(date) }, (_, index) => index + 1),
        );
      }
    }
  });
  it.each([
    [2024, 1, 29],
    [2025, 1, 28],
    [2000, 1, 29],
    [2100, 1, 28],
    [2026, 3, 30],
  ])('month length %i-%i is %i', (year, month, count) => {
    expect(DateUtils.getDaysInMonth(new Date(year, month, 1))).toBe(count);
  });
  it('generates 42 consecutive Monday-first cells across year boundaries', () => {
    const days = DateUtils.generateCalendarDays(new Date(2026, 0, 1));
    expect(days).toHaveLength(42);
    expect(days[0]?.date.getDay()).toBe(1);
    expect(days[0]?.date.getFullYear()).toBe(2025);
    expect(days.filter((day) => day.isCurrentMonth)).toHaveLength(31);
    for (let i = 1; i < days.length; i++) {
      const previous = days[i - 1];
      const current = days[i];
      if (!previous || !current) throw new Error('Missing day');
      const next = new Date(previous.date);
      next.setDate(next.getDate() + 1);
      expect(DateUtils.isSameDay(next, current.date)).toBe(true);
    }
    expect(days.filter((day) => day.isWeekend)).toHaveLength(12);
  });
  it('starts a Sunday month in the last weekday column', () => {
    expect(DateUtils.getFirstDayOfMonth(new Date(2026, 1, 1))).toBe(6);
  });
  it('compares dates independently of hours without confusing months or years', () => {
    expect(DateUtils.isSameDay(new Date(2026, 0, 1), new Date(2026, 0, 1, 23))).toBe(true);
    expect(DateUtils.isSameDay(new Date(2026, 0, 1), new Date(2026, 1, 1))).toBe(false);
    expect(DateUtils.isSameDay(new Date(2026, 0, 1), new Date(2025, 0, 1))).toBe(false);
  });
});

describe('clock formatting', () => {
  it.each([
    [0, '12', 'AM'],
    [12, '12', 'PM'],
    [23, '11', 'PM'],
  ])('formats hour %i as %s %s', (hour, hours, ampm) => {
    expect(DateUtils.formatTime(new Date(2026, 0, 1, hour, 47, 12), false)).toEqual({
      hours,
      minutes: '47',
      seconds: '12',
      ampm,
    });
  });
  it('formats midnight as 00 in 24-hour mode', () => {
    expect(DateUtils.formatTime(new Date(2026, 0, 1))).toEqual({
      hours: '00',
      minutes: '00',
      seconds: '00',
      ampm: '',
    });
  });
});

describe('date navigation and explicit timezones', () => {
  it.each([
    '2025-02-29',
    '2026-04-31',
    '0000-01-01',
    '2026-13-01',
    '2026-00-01',
    '2026-1-01',
    '2026-01-00',
    'not-a-date',
  ])('rejects invalid date key %s', (key) => {
    expect(DateUtils.parseDate(key)).toBeNull();
  });
  it.each(['0001-01-01', '0099-12-31', '2000-02-29', '9999-12-31'])(
    'round-trips civil date %s without UTC parsing',
    (key) => {
      const date = DateUtils.parseDate(key);
      expect(date).not.toBeNull();
      if (date) expect(DateUtils.dateKey(date)).toBe(key);
    },
  );
  it('clamps month navigation at February and crosses year boundaries', () => {
    expect(DateUtils.dateKey(DateUtils.addMonths(new Date(2024, 0, 31), 1))).toBe('2024-02-29');
    expect(DateUtils.dateKey(DateUtils.addMonths(new Date(2025, 0, 31), 1))).toBe('2025-02-28');
    expect(DateUtils.dateKey(DateUtils.addDays(new Date(2025, 11, 31), 1))).toBe('2026-01-01');
  });
  it('counts calendar days through DST changes, independent of clock hours', () => {
    expect(DateUtils.daysBetween(new Date(2024, 2, 9, 23), new Date(2024, 2, 11, 1))).toBe(2);
    expect(DateUtils.daysBetween(new Date(2024, 10, 2, 23), new Date(2024, 10, 4, 1))).toBe(2);
  });
  it('includes the ISO week-year at year boundaries', () => {
    expect(DateUtils.getISOWeek(new Date(2021, 0, 1))).toEqual({ week: 53, year: 2020 });
    expect(DateUtils.getISOWeek(new Date(2018, 11, 31))).toEqual({ week: 1, year: 2019 });
  });
  it('calculates calendar statistics for historical years without the 1900 constructor offset', () => {
    expect(DateUtils.getDayOfYear(DateUtils.createDate(4, 11, 31))).toBe(366);
    expect(DateUtils.getWeekNumber(DateUtils.createDate(1, 0, 1))).toBe(1);
  });
  it('uses IANA DST rules and the timezone date, including opposite year boundaries', () => {
    const before = new Date('2024-03-10T06:59:00Z');
    const after = new Date('2024-03-10T07:00:00Z');
    expect(DateUtils.formatTime(before, true, 'America/New_York').hours).toBe('01');
    expect(DateUtils.formatTime(after, true, 'America/New_York').hours).toBe('03');
    const boundary = new Date('2026-01-01T01:00:00Z');
    expect(DateUtils.dateKey(DateUtils.inTimezone(boundary, 'America/New_York'))).toBe(
      '2025-12-31',
    );
    expect(DateUtils.dateKey(DateUtils.inTimezone(boundary, 'Asia/Tokyo'))).toBe('2026-01-01');
  });
  it('marks today only when it is in the generated grid', () => {
    const today = new Date(2026, 8, 15);
    expect(DateUtils.generateCalendarDays(today, today).filter((day) => day.isToday)).toHaveLength(
      1,
    );
    expect(
      DateUtils.generateCalendarDays(new Date(2027, 3, 1), today).some((day) => day.isToday),
    ).toBe(false);
  });
});
