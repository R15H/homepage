import { getShadowRoot } from './widget';

let activeTooltip: HTMLElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

/** Show a tooltip near a target element */
export function showTooltip(
  text: string,
  anchor: { x: number; y: number },
  duration = 4000
): void {
  const root = getShadowRoot();
  if (!root) return;

  hideTooltip();

  const tip = document.createElement('div');
  tip.className = 'ps-tooltip';
  tip.textContent = text;
  tip.style.left = `${anchor.x}px`;
  tip.style.bottom = `${window.innerHeight - anchor.y + 12}px`;

  root.appendChild(tip);
  activeTooltip = tip;

  requestAnimationFrame(() => tip.classList.add('visible'));

  hideTimer = setTimeout(hideTooltip, duration);
}

export function hideTooltip(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
}
