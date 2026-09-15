import { DateUtils } from './DateUtils';
import { EventStore } from './services/EventStore';
import { el, get, setText } from './utils/dom';
import { locale, t } from './utils/i18n';

export class Calendar {
  private currentDate = DateUtils.createDate(new Date().getFullYear(), new Date().getMonth(), 1);
  private selectedDate = DateUtils.addDays(new Date(), 0);
  private focusedDate = this.selectedDate;
  private grid = get('#calendarGrid', HTMLDivElement);
  private heading = get('#currentMonthYear', HTMLElement);
  private month = get('#monthSelect', HTMLSelectElement);
  private year = get('#yearSelect', HTMLInputElement);
  private controller = new AbortController();

  constructor(
    private events: EventStore,
    private onSelect: (date: Date) => void,
  ) {}

  initialize(): void {
    const signal = this.controller.signal;
    get('#prevMonth', HTMLButtonElement).addEventListener('click', () => this.previousMonth(), {
      signal,
    });
    get('#nextMonth', HTMLButtonElement).addEventListener('click', () => this.nextMonth(), {
      signal,
    });
    get('#todayBtn', HTMLButtonElement).addEventListener('click', () => this.goToToday(), {
      signal,
    });
    this.month.addEventListener('change', () => this.changeMonth(), { signal });
    this.year.addEventListener('change', () => this.changeMonth(), { signal });
    get('#jumpForm', HTMLFormElement).addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        const input = get('#jumpDate', HTMLInputElement);
        const date = DateUtils.parseDate(input.value);
        if (date) {
          this.selectDate(date);
          get('.jump-control', HTMLDetailsElement).open = false;
        }
      },
      { signal },
    );
    this.grid.addEventListener(
      'click',
      (event) => {
        if (!(event.target instanceof Element)) return;
        const button = event.target.closest('button');
        const date = DateUtils.parseDate(button?.dataset.date ?? '');
        if (date) this.selectDate(date);
      },
      { signal },
    );
    this.grid.addEventListener('keydown', (event) => this.handleKey(event), { signal });
    this.render();
    this.onSelect(this.selectedDate);
  }

  destroy(): void {
    this.controller.abort();
  }
  getSelectedDate(): Date {
    return new Date(this.selectedDate);
  }

  selectDate(date: Date, focus = true): void {
    if (date.getFullYear() < 1 || date.getFullYear() > 9999) return;
    this.selectedDate = DateUtils.addDays(date, 0);
    this.focusedDate = this.selectedDate;
    this.currentDate = DateUtils.createDate(date.getFullYear(), date.getMonth(), 1);
    this.render(focus);
    this.onSelect(new Date(this.selectedDate));
  }

  previousMonth(): void {
    this.navigateMonth(-1);
  }
  nextMonth(): void {
    this.navigateMonth(1);
  }
  goToToday(): void {
    this.selectDate(new Date());
  }

  private navigateMonth(amount: number): void {
    const next = DateUtils.addMonths(this.currentDate, amount);
    if (next.getFullYear() < 1 || next.getFullYear() > 9999) return;
    this.currentDate = next;
    this.focusedDate = DateUtils.createDate(
      next.getFullYear(),
      next.getMonth(),
      Math.min(this.focusedDate.getDate(), DateUtils.getDaysInMonth(next)),
    );
    this.render();
  }

  private changeMonth(): void {
    if (!this.year.reportValidity() || !this.year.value) return;
    this.currentDate = DateUtils.createDate(Number(this.year.value), Number(this.month.value), 1);
    this.focusedDate = this.currentDate;
    this.render();
  }

  private handleKey(event: KeyboardEvent): void {
    if (
      !(event.target instanceof HTMLButtonElement) ||
      !event.target.dataset.date ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    )
      return;
    const from = DateUtils.parseDate(event.target.dataset.date);
    if (!from) return;
    let next: Date;
    switch (event.key) {
      case 'ArrowLeft':
        next = DateUtils.addDays(from, -1);
        break;
      case 'ArrowRight':
        next = DateUtils.addDays(from, 1);
        break;
      case 'ArrowUp':
        next = DateUtils.addDays(from, -7);
        break;
      case 'ArrowDown':
        next = DateUtils.addDays(from, 7);
        break;
      case 'PageUp':
        next = DateUtils.addMonths(from, -1);
        break;
      case 'PageDown':
        next = DateUtils.addMonths(from, 1);
        break;
      case 'Home':
        next = DateUtils.addDays(new Date(), 0);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectDate(from);
        return;
      default:
        return;
    }
    event.preventDefault();
    if (next.getFullYear() < 1 || next.getFullYear() > 9999) return;
    this.focusedDate = next;
    this.currentDate = DateUtils.createDate(next.getFullYear(), next.getMonth(), 1);
    this.render(true);
  }

  render(focus = this.grid.contains(document.activeElement)): void {
    const currentLocale = locale();
    setText(
      this.heading,
      new Intl.DateTimeFormat(currentLocale, { month: 'long', year: 'numeric' }).format(
        this.currentDate,
      ),
    );
    this.month.replaceChildren(
      ...Array.from({ length: 12 }, (_, month) => {
        const option = el(
          'option',
          new Intl.DateTimeFormat(currentLocale, { month: 'long' }).format(
            DateUtils.createDate(2026, month, 1),
          ),
        );
        option.value = String(month);
        return option;
      }),
    );
    this.month.value = String(this.currentDate.getMonth());
    this.year.value = String(this.currentDate.getFullYear());
    get('#prevMonth', HTMLButtonElement).disabled =
      this.currentDate.getFullYear() === 1 && this.currentDate.getMonth() === 0;
    get('#nextMonth', HTMLButtonElement).disabled =
      this.currentDate.getFullYear() === 9999 && this.currentDate.getMonth() === 11;
    const fragment = document.createDocumentFragment();
    const header = el('div', '', 'calendar-row weekday-row');
    header.setAttribute('role', 'row');
    for (let i = 0; i < 7; i++) {
      const day = DateUtils.createDate(2026, 0, 5 + i);
      const cell = el(
        'div',
        new Intl.DateTimeFormat(currentLocale, { weekday: 'short' }).format(day),
        'day-header',
      );
      cell.setAttribute('role', 'columnheader');
      cell.setAttribute(
        'aria-label',
        new Intl.DateTimeFormat(currentLocale, { weekday: 'long' }).format(day),
      );
      header.append(cell);
    }
    fragment.append(header);
    const days = DateUtils.generateCalendarDays(this.currentDate);
    const counts = new Map<string, number>();
    for (const event of this.events.list())
      counts.set(event.date, (counts.get(event.date) ?? 0) + 1);
    for (let week = 0; week < 6; week++) {
      const row = el('div', '', 'calendar-row');
      row.setAttribute('role', 'row');
      for (const day of days.slice(week * 7, week * 7 + 7)) {
        const key = DateUtils.dateKey(day.date);
        const selected = DateUtils.isSameDay(day.date, this.selectedDate);
        const count = counts.get(key) ?? 0;
        const cell = el('div', '', 'calendar-cell');
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-selected', String(selected));
        const button = el('button', String(day.day), 'day-cell');
        button.type = 'button';
        button.dataset.date = key;
        button.tabIndex = DateUtils.isSameDay(day.date, this.focusedDate) ? 0 : -1;
        button.disabled = day.date.getFullYear() < 1 || day.date.getFullYear() > 9999;
        button.classList.toggle('other-month', !day.isCurrentMonth);
        button.classList.toggle('today', day.isToday);
        button.classList.toggle('selected', selected);
        button.classList.toggle('weekend', day.isWeekend);
        button.setAttribute(
          'aria-label',
          `${DateUtils.formatDate(day.date, currentLocale)}${count ? t(`, ${count} event${count === 1 ? '' : 's'}`, `, ${count} etkinlik`) : ''}`,
        );
        if (day.isToday) button.setAttribute('aria-current', 'date');
        if (count) {
          const dot = el('span', '', 'event-dot');
          dot.setAttribute('aria-hidden', 'true');
          button.append(dot);
        }
        cell.append(button);
        row.append(cell);
      }
      fragment.append(row);
    }
    this.grid.replaceChildren(fragment);
    if (focus) this.grid.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus();
  }
}
