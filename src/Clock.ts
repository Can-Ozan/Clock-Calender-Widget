import { DateUtils } from './DateUtils';
import type { AppSettings } from './types';
import { get, setText } from './utils/dom';
import { locale, t } from './utils/i18n';
import { resolveTimezone, zoneCity } from './utils/timezones';

export class Clock {
  private timer: number | null = null;
  private running = false;
  private controller = new AbortController();
  private hours = get('#hours', HTMLElement);
  private minutes = get('#minutes', HTMLElement);
  private seconds = get('#seconds', HTMLElement);
  private ampm = get('#ampm', HTMLElement);
  private display = get('#timeDisplay', HTMLElement);
  private secondsSeparator = get('#secondsSeparator', HTMLElement);
  private dateDisplay = get('#dateDisplay', HTMLElement);
  private zone = get('#clockZone', HTMLElement);
  private dayOfYear = get('#dayOfYear', HTMLElement);
  private weekNumber = get('#weekNumber', HTMLElement);
  private daysLeft = get('#daysLeft', HTMLElement);
  private progress = get('#yearProgress', HTMLProgressElement);
  private progressLabel = get('#yearProgressLabel', HTMLElement);
  private statsKey = '';

  constructor(
    private settings: () => AppSettings,
    private onTick: (now: Date) => void,
  ) {
    document.addEventListener(
      'visibilitychange',
      () => {
        this.cancelTimer();
        if (this.running && !document.hidden) this.tick();
      },
      { signal: this.controller.signal },
    );
  }

  start(): void {
    this.cancelTimer();
    this.running = true;
    if (!document.hidden) this.tick();
  }

  stop(): void {
    this.running = false;
    this.cancelTimer();
  }
  destroy(): void {
    this.stop();
    this.controller.abort();
  }
  refresh(): void {
    this.statsKey = '';
    if (this.running) this.start();
  }

  private cancelTimer(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
  }

  private tick(): void {
    const now = new Date();
    this.update(now);
    this.onTick(now);
    const cadence = this.settings().clock.showSeconds ? 1000 : 60000;
    this.timer = window.setTimeout(() => this.tick(), cadence - (Date.now() % cadence) + 10);
  }

  private update(now: Date): void {
    const prefs = this.settings().clock;
    const timezone = resolveTimezone(prefs.timezone);
    const time = DateUtils.formatTime(now, prefs.is24Hour, timezone);
    setText(this.hours, time.hours);
    setText(this.minutes, time.minutes);
    setText(this.seconds, time.seconds);
    setText(this.ampm, time.ampm);
    this.ampm.hidden = prefs.is24Hour;
    this.seconds.hidden = !prefs.showSeconds;
    this.secondsSeparator.hidden = !prefs.showSeconds;
    this.display.classList.toggle('blink', prefs.blinkSeparator);
    const label = `${time.hours}:${time.minutes}${prefs.showSeconds ? `:${time.seconds}` : ''}${time.ampm ? ` ${time.ampm}` : ''}, ${timezone}`;
    if (this.display.getAttribute('aria-label') !== label)
      this.display.setAttribute('aria-label', label);
    setText(
      this.zone,
      `${zoneCity(timezone)}${prefs.timezone === 'local' ? t(' · local time', ' · yerel saat') : ''}`,
    );
    setText(this.dateDisplay, DateUtils.formatDate(now, locale(), timezone));
    const date = DateUtils.inTimezone(now, timezone);
    const key = `${DateUtils.dateKey(date)}|${locale()}`;
    if (key !== this.statsKey) {
      this.statsKey = key;
      const day = DateUtils.getDayOfYear(date);
      const total = DateUtils.getDaysInYear(date);
      const iso = DateUtils.getISOWeek(date);
      setText(this.dayOfYear, String(day));
      setText(this.weekNumber, String(iso.week));
      this.weekNumber.title = `${t('ISO week-year', 'ISO hafta yılı')}: ${iso.year}`;
      setText(this.daysLeft, String(DateUtils.getDaysLeftInYear(date)));
      this.progress.max = total;
      this.progress.value = day;
      setText(this.progressLabel, `${date.getFullYear()} · ${Math.floor((day / total) * 100)}%`);
    }
  }
}
