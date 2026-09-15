export function get<T extends Element>(selector: string, constructor: { new (): T }): T {
  const element = document.querySelector(selector);
  if (!(element instanceof constructor))
    throw new Error(`Missing or incorrect element: ${selector}`);
  return element;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = '',
  className = '',
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.textContent = text;
  element.className = className;
  return element;
}

export function setText(element: Element, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

export function action(
  text: string,
  label: string,
  onClick: () => void,
  className = 'text-button',
): HTMLButtonElement {
  const button = el('button', text, className);
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.addEventListener('click', onClick);
  return button;
}
