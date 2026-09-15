import { DateUtils } from '../DateUtils';
import { CountdownStore, MAX_COUNTDOWNS } from '../services/CountdownStore';
import type { Countdown } from '../types';
import { action, el, get } from '../utils/dom';
import { locale, t } from '../utils/i18n';

export class CountdownPanel {
  private editing: Countdown | null = null;
  private dialog = get('#countdownDialog', HTMLDialogElement);
  private form = get('#countdownForm', HTMLFormElement);
  private title = get('#countdownTitle', HTMLInputElement);
  private date = get('#countdownDate', HTMLInputElement);
  private error = get('#countdownError', HTMLElement);

  constructor(
    private store: CountdownStore,
    private selected: () => Date,
    private expand: () => void,
    private announce: (message: string) => void,
  ) {
    get('#addCountdown', HTMLButtonElement).addEventListener('click', () => this.open());
    get('#selectedCountdown', HTMLButtonElement).addEventListener('click', () => this.open());
    this.title.addEventListener('input', () => this.title.setCustomValidity(''));
    this.date.addEventListener('input', () => this.date.setCustomValidity(''));
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.title.setCustomValidity(
        this.title.value.trim() ? '' : t('Enter a title.', 'Bir başlık gir.'),
      );
      const target = DateUtils.parseDate(this.date.value);
      const isOriginal = this.editing?.date === this.date.value;
      this.date.setCustomValidity(
        target && (isOriginal || DateUtils.daysBetween(new Date(), target) > 0)
          ? ''
          : t('Choose a future date.', 'Gelecek bir tarih seç.'),
      );
      if (!this.form.reportValidity()) return;
      try {
        this.store.save({
          id: this.editing?.id ?? crypto.randomUUID(),
          title: this.title.value,
          date: this.date.value,
        });
        this.dialog.close();
        this.expand();
        this.render();
        get('#addCountdown', HTMLButtonElement).focus();
        this.announce(t('Countdown saved.', 'Geri sayım kaydedildi.'));
      } catch (error) {
        this.error.textContent =
          error instanceof Error
            ? error.message
            : t('Could not save the countdown.', 'Geri sayım kaydedilemedi.');
      }
    });
  }

  open(countdown?: Countdown): void {
    this.editing = countdown ?? null;
    this.form.reset();
    this.error.textContent = '';
    this.title.setCustomValidity('');
    this.date.setCustomValidity('');
    get('#countdownDialogHeading', HTMLElement).textContent = countdown
      ? t('Edit countdown', 'Geri sayımı düzenle')
      : t('Add countdown', 'Geri sayım ekle');
    this.title.value = countdown?.title ?? '';
    const selected = this.selected();
    this.date.value =
      countdown?.date ??
      DateUtils.dateKey(
        DateUtils.daysBetween(new Date(), selected) > 0
          ? selected
          : DateUtils.addDays(new Date(), 1),
      );
    this.date.min =
      countdown && countdown.date < DateUtils.dateKey(new Date())
        ? countdown.date
        : DateUtils.dateKey(DateUtils.addDays(new Date(), 1));
    // Existing countdowns remain editable on their target day and after they finish.
    if (countdown) this.date.removeAttribute('min');
    this.dialog.showModal();
    this.title.focus();
  }

  render(): void {
    const items = this.store.list();
    get('#countdownCount', HTMLElement).textContent = `${items.length} / ${MAX_COUNTDOWNS}`;
    get('#addCountdown', HTMLButtonElement).disabled = items.length >= MAX_COUNTDOWNS;
    const list = get('#countdownList', HTMLDivElement);
    list.replaceChildren();
    if (!items.length) {
      list.append(
        el(
          'p',
          t(
            'Something to look forward to. Count the days to your next moment.',
            'Beklemeye değer bir şey. Bir sonraki anına kalan günleri say.',
          ),
          'tool-empty',
        ),
      );
      return;
    }
    const ul = el('ul', '', 'item-list');
    for (const countdown of items) {
      const target = DateUtils.parseDate(countdown.date);
      if (!target) continue;
      const days = DateUtils.daysBetween(new Date(), target);
      const remaining =
        days > 0
          ? t(`${days} day${days === 1 ? '' : 's'} to go`, `${days} gün kaldı`)
          : days === 0
            ? t('Today!', 'Bugün!')
            : t(`${Math.abs(days)} day${days === -1 ? '' : 's'} ago`, `${Math.abs(days)} gün önce`);
      const item = el('li', '', 'countdown-item');
      const content = el('div', '', 'item-content');
      content.append(
        el('h4', countdown.title),
        el('p', DateUtils.formatDate(target, locale()), 'hint'),
        el('strong', remaining, 'countdown-remaining'),
      );
      const actions = el('div', '', 'item-actions');
      actions.append(
        action(
          t('Edit', 'Düzenle'),
          t(`Edit ${countdown.title}`, `${countdown.title} düzenle`),
          () => this.open(countdown),
        ),
        action(
          t('Delete', 'Sil'),
          t(`Delete ${countdown.title}`, `${countdown.title} sil`),
          () => {
            this.store.delete(countdown.id);
            this.render();
            get('#addCountdown', HTMLButtonElement).focus();
            this.announce(t('Countdown deleted.', 'Geri sayım silindi.'));
          },
          'text-button danger',
        ),
      );
      item.append(content, actions);
      ul.append(item);
    }
    list.append(ul);
  }
}
