import { DateUtils } from '../DateUtils';
import { EventStore } from '../services/EventStore';
import type { CalendarEvent, EventCategory } from '../types';
import { action, el, get } from '../utils/dom';
import { t } from '../utils/i18n';

export class EventPanel {
  private date = new Date();
  private editingId: string | null = null;
  private dialog = get('#eventDialog', HTMLDialogElement);
  private form = get('#eventForm', HTMLFormElement);
  private title = get('#eventTitle', HTMLInputElement);
  private dateInput = get('#eventDate', HTMLInputElement);
  private time = get('#eventTime', HTMLInputElement);
  private description = get('#eventDescription', HTMLTextAreaElement);
  private category = get('#eventCategory', HTMLSelectElement);
  private error = get('#eventError', HTMLElement);

  constructor(
    private store: EventStore,
    private changed: (date?: Date) => void,
    private announce: (message: string) => void,
  ) {
    get('#addEvent', HTMLButtonElement).addEventListener('click', () => this.open());
    this.title.addEventListener('input', () => this.title.setCustomValidity(''));
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.title.setCustomValidity(
        this.title.value.trim() ? '' : t('Enter a title.', 'Bir başlık gir.'),
      );
      if (!this.form.reportValidity()) return;
      const category = this.category.value;
      if (category !== 'personal' && category !== 'work' && category !== 'important') return;
      try {
        this.store.save({
          id: this.editingId ?? crypto.randomUUID(),
          title: this.title.value,
          date: this.dateInput.value,
          time: this.time.value,
          description: this.description.value,
          category,
        });
        this.dialog.close();
        this.changed(DateUtils.parseDate(this.dateInput.value) ?? undefined);
        get('#addEvent', HTMLButtonElement).focus();
        this.announce(t('Event saved.', 'Etkinlik kaydedildi.'));
      } catch (error) {
        this.error.textContent =
          error instanceof Error
            ? error.message
            : t('Could not save the event.', 'Etkinlik kaydedilemedi.');
      }
    });
  }

  private categoryName(category: EventCategory): string {
    return category === 'work'
      ? t('Work', 'İş')
      : category === 'important'
        ? t('Important', 'Önemli')
        : t('Personal', 'Kişisel');
  }

  open(event?: CalendarEvent): void {
    this.editingId = event?.id ?? null;
    this.form.reset();
    this.title.setCustomValidity('');
    this.error.textContent = '';
    get('#eventDialogHeading', HTMLElement).textContent = event
      ? t('Edit event', 'Etkinliği düzenle')
      : t('Add event', 'Etkinlik ekle');
    this.title.value = event?.title ?? '';
    this.dateInput.value = event?.date ?? DateUtils.dateKey(this.date);
    this.time.value = event?.time ?? '';
    this.description.value = event?.description ?? '';
    this.category.value = event?.category ?? 'personal';
    this.dialog.showModal();
    this.title.focus();
  }

  render(date = this.date): void {
    this.date = new Date(date);
    const list = get('#eventList', HTMLDivElement);
    const events = this.store.forDate(DateUtils.dateKey(date));
    list.replaceChildren();
    if (!events.length) {
      const empty = el('div', '', 'empty-state');
      empty.append(
        el('span', '≋', 'empty-icon'),
        el('strong', t('A little breathing room.', 'Kendine biraz zaman.')),
        el(
          'p',
          t(
            'No events for this day. Add a plan or a small reminder.',
            'Bu gün için etkinlik yok. Bir plan veya küçük bir not ekle.',
          ),
        ),
      );
      empty.firstElementChild?.setAttribute('aria-hidden', 'true');
      list.append(empty);
      return;
    }
    const ul = el('ul', '', 'item-list');
    for (const event of events) {
      const item = el('li', '', `event-item category-${event.category}`);
      const content = el('div', '', 'item-content');
      const meta = el('p', '', 'item-meta');
      meta.append(
        el('span', event.time || t('All day', 'Tüm gün')),
        el('span', this.categoryName(event.category), 'category-label'),
      );
      content.append(el('h4', event.title), meta);
      if (event.description) content.append(el('p', event.description, 'event-description'));
      const actions = el('div', '', 'item-actions');
      actions.append(
        action(t('Edit', 'Düzenle'), t(`Edit ${event.title}`, `${event.title} düzenle`), () =>
          this.open(event),
        ),
        action(
          t('Delete', 'Sil'),
          t(`Delete ${event.title}`, `${event.title} sil`),
          () => {
            this.store.delete(event.id);
            this.changed();
            get('#addEvent', HTMLButtonElement).focus();
            this.announce(t('Event deleted.', 'Etkinlik silindi.'));
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
