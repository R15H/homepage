import { getShadowRoot } from './widget';

const ICON_GROUP = `<svg viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="white"/></svg>`;

let indicator: HTMLElement | null = null;
let onClickCallback: (() => void) | null = null;

/**
 * Initialize the list indicator system.
 * When the user hovers over a detected list, a small icon appears near it.
 */
export function initListIndicator(
  onListClick: () => void
): { destroy: () => void } {
  onClickCallback = onListClick;

  const root = getShadowRoot();
  if (!root) return { destroy: () => {} };

  indicator = document.createElement('button');
  indicator.className = 'ps-list-indicator';
  indicator.innerHTML = ICON_GROUP;
  indicator.title = 'Group list items';
  root.appendChild(indicator);

  indicator.addEventListener('click', (e) => {
    e.stopPropagation();
    if (onClickCallback) {
      onClickCallback();
    }
  });

  return {
    destroy: () => {
      indicator?.remove();
      indicator = null;
      onClickCallback = null;
    },
  };
}

/** Position the indicator near a list element */
export function showIndicatorNear(list: Element): void {
  if (!indicator) return;

  const rect = list.getBoundingClientRect();
  indicator.style.top = `${rect.top + window.scrollY}px`;
  indicator.style.left = `${rect.right + window.scrollX - 36}px`;
  indicator.classList.add('visible');
}

/** Hide the indicator */
export function hideIndicator(): void {
  if (!indicator) return;
  indicator.classList.remove('visible');
}
