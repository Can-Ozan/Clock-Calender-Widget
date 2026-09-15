import type { CalendarDay, TimeParts } from './types';
export type { CalendarDay } from './types';

const timeFormatters = new Map<string, Intl.DateTimeFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const DAY_MS = 86400000;

export class DateUtils {
  // Construct local civil dates without the Date constructor's 1900 offset for years 0–99.
  static createDate(year: number, month: number, day: number): Date {
    const date = new Date(0);
    date.setFullYear(year, month, day);
    date.setHours(12, 0, 0, 0);
    return date;
  }

  static dayOrdinal(date: Date): number {
    const utc = new Date(0);
    utc.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    utc.setUTCHours(0, 0, 0, 0);
    return utc.getTime() / DAY_MS;
  }

  static daysBetween(from: Date, to: Date): number {
    return this.dayOrdinal(to) - this.dayOrdinal(from);
  }

  static inTimezone(date: Date, timeZone: string): Date {
    const key = `civil|${timeZone}`;
    let formatter = dateFormatters.get(key);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      dateFormatters.set(key, formatter);
    }
    const parts = formatter.formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes): number =>
      Number(parts.find((value) => value.type === type)?.value);
    return this.createDate(part('year'), part('month') - 1, part('day'));
  }

  static dateKey(date: Date): string {
    return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  static parseDate(value: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const year = Number(value.slice(0, 4));
    const date = this.createDate(year, Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)));
    return year >= 1 && year <= 9999 && this.dateKey(date) === value ? date : null;
  }

  static addDays(date: Date, amount: number): Date {
    return this.createDate(date.getFullYear(), date.getMonth(), date.getDate() + amount);
  }

  static addMonths(date: Date, amount: number): Date {
    const first = this.createDate(date.getFullYear(), date.getMonth() + amount, 1);
    return this.createDate(
      first.getFullYear(),
      first.getMonth(),
      Math.min(date.getDate(), this.getDaysInMonth(first)),
    );
  }

  static getDaysInYear(date: Date): number {
    const year = date.getFullYear();
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365;
  }
  static getDaysInMonth(date: Date): number {
    return this.createDate(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  static getFirstDayOfMonth(date: Date): number {
    const firstDay = this.createDate(date.getFullYear(), date.getMonth(), 1);
    // Pazartesi başlangıç için ayarlama (Pazar=0, Pazartesi=1, ...)
    return firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  }

  static generateCalendarDays(date: Date, today = new Date()): CalendarDay[] {
    const year = date.getFullYear();
    const month = date.getMonth();

    const daysInMonth = this.getDaysInMonth(date);
    const firstDayIndex = this.getFirstDayOfMonth(date);

    const days: CalendarDay[] = [];

    // Önceki aydan günler
    const prevMonth = this.createDate(year, month - 1, 1);
    const daysInPrevMonth = this.getDaysInMonth(prevMonth);

    for (let i = 0; i < firstDayIndex; i++) {
      const day = daysInPrevMonth - firstDayIndex + i + 1;
      const dateObj = this.createDate(year, month - 1, day);
      days.push({
        day,
        date: dateObj,
        isCurrentMonth: false,
        isToday: this.isSameDay(dateObj, today),
        isWeekend: this.isWeekend(dateObj),
      });
    }

    // Mevcut ay günleri
    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = this.createDate(year, month, i);
      days.push({
        day: i,
        date: dateObj,
        isCurrentMonth: true,
        isToday: this.isSameDay(dateObj, today),
        isWeekend: this.isWeekend(dateObj),
      });
    }

    // Sonraki aydan günler (42 hücre için)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const dateObj = this.createDate(year, month + 1, i);
      days.push({
        day: i,
        date: dateObj,
        isCurrentMonth: false,
        isToday: this.isSameDay(dateObj, today),
        isWeekend: this.isWeekend(dateObj),
      });
    }

    return days;
  }

  static isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  static formatDate(date: Date, locale = 'tr-TR', timeZone?: string): string {
    const key = `${locale}|${timeZone ?? 'local'}`;
    let formatter = dateFormatters.get(key);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone,
      });
      dateFormatters.set(key, formatter);
    }
    return formatter.format(date);
  }

  static formatTime(date: Date, is24Hour = true, timeZone?: string): TimeParts {
    const key = `${is24Hour}|${timeZone ?? 'local'}`;
    let formatter = timeFormatters.get(key);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone,
        hourCycle: is24Hour ? 'h23' : 'h12',
      });
      timeFormatters.set(key, formatter);
    }
    const parts = formatter.formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes): string =>
      parts.find((value) => value.type === type)?.value ?? '';
    return {
      hours: part('hour'),
      minutes: part('minute'),
      seconds: part('second'),
      ampm: part('dayPeriod'),
    };
  }

  static getDayOfYear(date: Date): number {
    return this.daysBetween(this.createDate(date.getFullYear(), 0, 1), date) + 1;
  }

  static getWeekNumber(date: Date): number {
    return this.getISOWeek(date).week;
  }

  static getISOWeek(date: Date): { week: number; year: number } {
    const thursday = new Date(this.dayOrdinal(date) * DAY_MS);
    thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
    const year = thursday.getUTCFullYear();
    const start = this.dayOrdinal(this.createDate(year, 0, 1));
    return { week: Math.ceil((thursday.getTime() / DAY_MS - start + 1) / 7), year };
  }

  static getDaysLeftInYear(date: Date): number {
    return this.getDaysInYear(date) - this.getDayOfYear(date);
  }
}
