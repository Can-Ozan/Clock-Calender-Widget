export type Theme = 'light' | 'dark' | 'system';
export type Accent = 'blue' | 'purple' | 'emerald' | 'orange';
export type Locale = 'en-GB' | 'tr-TR';
export type EventCategory = 'personal' | 'work' | 'important';

export interface ClockPreferences {
  is24Hour: boolean;
  showSeconds: boolean;
  blinkSeparator: boolean;
  timezone: string;
}

export interface AppSettings {
  theme: Theme;
  accent: Accent;
  locale: Locale;
  clock: ClockPreferences;
  worldClocks: string[];
  worldExpanded: boolean;
  countdownExpanded: boolean;
}

export interface CalendarDay {
  day: number;
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  time: string;
  category: EventCategory;
  date: string;
}

export interface Countdown {
  id: string;
  title: string;
  date: string;
}

export interface TimezoneConfiguration {
  id: string;
  city: string;
}

export interface TimeParts {
  hours: string;
  minutes: string;
  seconds: string;
  ampm: string;
}
