import { DateUtils } from '../DateUtils';
import { MAX_WORLD_CLOCKS } from '../services/SettingsStore';
import type { AppSettings } from '../types';
import { action, el, get, setText } from '../utils/dom';
import { locale, t } from '../utils/i18n';
import { timezoneOptions, zoneCity } from '../utils/timezones';

export class WorldClock {
  private rows: { zone: string; time: HTMLElement; date: HTMLElement }[] = [];
  private lastTick = '';
  private select = get('#worldZone', HTMLSelectElement);

  constructor(
    private settings: () => AppSettings,
    private change: (patch: Partial<AppSettings>) => void,
    private announce: (message: string) => void,
  ) {
    get('#worldForm', HTMLFormElement).addEventListener('submit', (event) => {
      event.preventDefault();
      const saved = this.settings().worldClocks;
      if (
        saved.length >= MAX_WORLD_CLOCKS ||
        saved.includes(this.select.value) ||
        !this.select.value
      )
        return;
      this.change({ worldClocks: [...saved, this.select.value] });
      this.announce(t('World clock added.', 'Dünya saati eklendi.'));
    });
  }

  render(): void {
    const saved = this.settings().worldClocks;
    const previous = this.select.value;
    if (this.settings().worldExpanded)
      this.select.replaceChildren(
        ...timezoneOptions()
          .filter((zone) => !saved.includes(zone))
          .map((zone) => {
            const option = el('option', `${zoneCity(zone)} · ${zone.replaceAll('_', ' ')}`);
            option.value = zone;
            return option;
          }),
      );
    if (Array.from(this.select.options).some((option) => option.value === previous))
      this.select.value = previous;
    else if (!saved.includes('Europe/Istanbul')) this.select.value = 'Europe/Istanbul';
    const atLimit = saved.length >= MAX_WORLD_CLOCKS;
    this.select.disabled = atLimit;
    get('#addWorldClock', HTMLButtonElement).disabled = atLimit;
    get('#worldCount', HTMLElement).textContent = `${saved.length} / ${MAX_WORLD_CLOCKS}`;
    const list = get('#worldClocks', HTMLDivElement);
    list.replaceChildren();
    this.rows = [];
    if (!saved.length)
      list.append(
        el(
          'p',
          t(
            'A different place. The same moment. Add a city to get started.',
            'Başka bir yer. Aynı an. Başlamak için bir şehir ekle.',
          ),
          'tool-empty',
        ),
      );
    for (const zone of saved) {
      const row = el('div', '', 'world-row');
      const name = el('div', '', 'item-content');
      const date = el('span', '', 'world-date');
      name.append(el('strong', zoneCity(zone)), date);
      const time = el('span', '', 'world-time');
      const remove = action(
        '×',
        t(`Remove ${zoneCity(zone)} clock`, `${zoneCity(zone)} saatini kaldır`),
        () => {
          this.change({
            worldClocks: this.settings().worldClocks.filter((value) => value !== zone),
          });
          this.select.focus();
          this.announce(t('World clock removed.', 'Dünya saati kaldırıldı.'));
        },
        'icon-button remove-button',
      );
      row.append(name, time, remove);
      list.append(row);
      this.rows.push({ zone, time, date });
    }
    this.lastTick = '';
    this.update(new Date());
  }

  update(now: Date): void {
    if (!get('#worldSection', HTMLDetailsElement).open) return;
    const key = `${Math.floor(now.getTime() / 60000)}|${this.settings().clock.is24Hour}|${locale()}`;
    if (key === this.lastTick) return;
    this.lastTick = key;
    for (const row of this.rows) {
      const time = DateUtils.formatTime(now, this.settings().clock.is24Hour, row.zone);
      setText(row.time, `${time.hours}:${time.minutes}${time.ampm ? ` ${time.ampm}` : ''}`);
      setText(
        row.date,
        new Intl.DateTimeFormat(locale(), {
          timeZone: row.zone,
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }).format(now),
      );
    }
  }
}
