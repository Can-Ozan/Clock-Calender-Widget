import { DateUtils } from '../DateUtils';
import { get, setText } from '../utils/dom';
import { locale, t } from '../utils/i18n';

export class SelectedDatePanel {
  private lastSelection = '';

  render(date: Date): void {
    const weekday = new Intl.DateTimeFormat(locale(), { weekday: 'long' }).format(date);
    const heading = new Intl.DateTimeFormat(locale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
    const iso = DateUtils.getISOWeek(date);
    const ordinal = DateUtils.getDayOfYear(date);
    const total = DateUtils.getDaysInYear(date);
    const remaining = DateUtils.getDaysLeftInYear(date);
    const week = `${iso.week}${iso.year !== date.getFullYear() ? ` (${iso.year})` : ''}`;
    setText(get('#selectedWeekday', HTMLElement), weekday);
    setText(get('#selectedHeading', HTMLElement), heading);
    setText(
      get('#selectedStats', HTMLElement),
      t(
        `Day ${ordinal} of ${total} · Week ${week} · ${remaining} days left in the year`,
        `${total} günün ${ordinal}. günü · Hafta ${week} · Yılın bitmesine ${remaining} gün`,
      ),
    );
    const button = get('#selectedCountdown', HTMLButtonElement);
    button.disabled = DateUtils.daysBetween(new Date(), date) <= 0;
    button.title = button.disabled
      ? t('Select a future date to create a countdown', 'Geri sayım için gelecek bir tarih seç')
      : t('Create a countdown to this date', 'Bu tarihe geri sayım oluştur');
    const key = `${DateUtils.dateKey(date)}|${locale()}`;
    if (this.lastSelection !== key) {
      setText(
        get('#selectionAnnouncement', HTMLElement),
        t(`Selected ${weekday}, ${heading}`, `Seçili tarih: ${weekday}, ${heading}`),
      );
      this.lastSelection = key;
    }
  }
}
