import type { Locale } from '../types';

let currentLocale: Locale = 'en-GB';
export const locale = (): Locale => currentLocale;
export const t = (english: string, turkish: string): string =>
  currentLocale === 'tr-TR' ? turkish : english;

export function setLocale(value: Locale): void {
  currentLocale = value;
  document.documentElement.lang = value === 'tr-TR' ? 'tr' : 'en';
  document.querySelectorAll<HTMLElement>('[data-tr]').forEach((element) => {
    element.dataset.en ??= element.textContent ?? '';
    element.textContent = value === 'tr-TR' ? (element.dataset.tr ?? '') : element.dataset.en;
  });
  document.querySelectorAll<HTMLElement>('[data-tr-label]').forEach((element) => {
    element.dataset.enLabel ??= element.getAttribute('aria-label') ?? '';
    element.setAttribute(
      'aria-label',
      value === 'tr-TR' ? (element.dataset.trLabel ?? '') : element.dataset.enLabel,
    );
  });
}
