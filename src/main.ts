import { Clock } from './Clock';
import { Calendar } from './Calendar';
import { DateUtils } from './DateUtils';
import { SelectedDatePanel } from './components/SelectedDatePanel';
import { EventPanel } from './components/EventPanel';
import { WorldClock } from './components/WorldClock';
import { CountdownPanel } from './components/CountdownPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { Storage } from './services/Storage';
import { SettingsStore } from './services/SettingsStore';
import { EventStore } from './services/EventStore';
import { CountdownStore } from './services/CountdownStore';
import type { AppSettings } from './types';
import { get } from './utils/dom';
import { setLocale, t } from './utils/i18n';
import { setupDialogs } from './utils/dialogs';
import { setupPWA } from './pwa';

class App {
  private controller = new AbortController();
  private storage = new Storage((message) => {
    const notice = get('#storageWarning', HTMLElement);
    notice.textContent = message;
    notice.hidden = false;
  });
  private settingsStore = new SettingsStore(this.storage);
  private settings = this.settingsStore.load();
  private eventStore = new EventStore(this.storage);
  private countdownStore = new CountdownStore(this.storage);
  private selectedPanel = new SelectedDatePanel();
  private eventPanel: EventPanel;
  private world: WorldClock;
  private countdowns: CountdownPanel;
  private settingsPanel: SettingsPanel;
  private clock: Clock;
  private calendar: Calendar;
  private localDay = DateUtils.dateKey(new Date());
  private toastTimer: number | null = null;

  constructor() {
    setLocale(this.settings.locale);
    const announce = (message: string): void => this.announce(message);
    this.calendar = new Calendar(this.eventStore, (date) => this.renderSelected(date));
    this.eventPanel = new EventPanel(
      this.eventStore,
      (date) => {
        if (date) this.calendar.selectDate(date, false);
        else {
          this.calendar.render();
          this.renderSelected(this.calendar.getSelectedDate());
        }
      },
      announce,
    );
    this.world = new WorldClock(
      () => this.settings,
      (patch) => this.changeSettings(patch),
      announce,
    );
    this.countdowns = new CountdownPanel(
      this.countdownStore,
      () => this.calendar.getSelectedDate(),
      () => this.changeSettings({ countdownExpanded: true }),
      announce,
    );
    this.settingsPanel = new SettingsPanel(
      () => this.settings,
      (patch) => this.changeSettings(patch),
    );
    this.clock = new Clock(
      () => this.settings,
      (now) => {
        this.world.update(now);
        const day = DateUtils.dateKey(now);
        if (day !== this.localDay) {
          this.localDay = day;
          this.calendar.render();
          this.renderSelected(this.calendar.getSelectedDate());
          this.countdowns.render();
          get('#copyrightYear', HTMLElement).textContent = String(now.getFullYear());
        }
      },
    );
    const signal = this.controller.signal;
    for (const [id, key] of [
      ['worldSection', 'worldExpanded'],
      ['countdownSection', 'countdownExpanded'],
    ] as const) {
      const section = get(`#${id}`, HTMLDetailsElement);
      section.addEventListener(
        'toggle',
        () => {
          if (this.settings[key] !== section.open) this.changeSettings({ [key]: section.open });
          if (key === 'worldExpanded') this.world.update(new Date());
        },
        { signal },
      );
    }
    window.addEventListener(
      'storage',
      (event) => {
        if (event.key && !event.key.startsWith('clock-calendar:')) return;
        this.settings = this.settingsStore.load();
        this.renderPreferences();
        this.announce(t('Updated from another tab.', 'Diğer sekmeden güncellendi.'));
      },
      { signal },
    );
    window.addEventListener('pagehide', () => this.clock.stop(), { signal });
    window.addEventListener('pageshow', () => this.clock.start(), { signal });
    setupDialogs(signal);
    this.calendar.initialize();
    get('#copyrightYear', HTMLElement).textContent = String(new Date().getFullYear());
    this.renderPreferences(false);
    this.clock.start();
    setupPWA(signal, announce);
  }

  private renderSelected(date: Date): void {
    this.selectedPanel.render(date);
    this.eventPanel.render(date);
  }

  private changeSettings(patch: Partial<AppSettings>): void {
    this.settings = this.settingsStore.update(patch);
    this.renderPreferences();
  }

  private renderPreferences(refreshCalendar = true): void {
    setLocale(this.settings.locale);
    this.settingsPanel.render();
    get('#worldSection', HTMLDetailsElement).open = this.settings.worldExpanded;
    get('#countdownSection', HTMLDetailsElement).open = this.settings.countdownExpanded;
    if (refreshCalendar) {
      this.calendar.render();
      this.renderSelected(this.calendar.getSelectedDate());
    }
    this.world.render();
    this.countdowns.render();
    this.clock.refresh();
    document.dispatchEvent(new Event('preferenceschange'));
  }

  private announce(message: string): void {
    const status = get('#appStatus', HTMLElement);
    status.textContent = this.storage.persistent
      ? message
      : t(
          'Changed for this session only. Browser storage is unavailable.',
          'Yalnızca bu oturum için değiştirildi. Tarayıcı depolaması kullanılamıyor.',
        );
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      status.textContent = '';
      this.toastTimer = null;
    }, 5000);
  }

  destroy(): void {
    this.clock.destroy();
    this.calendar.destroy();
    this.settingsPanel.destroy();
    this.controller.abort();
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
  }
}

const app = new App();
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    app.destroy();
    window.location.reload();
  });
