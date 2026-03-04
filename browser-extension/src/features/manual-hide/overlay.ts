const OVERLAY_CLASS = 'ps-hide-overlay';

let currentHighlight: Element | null = null;

/** Add a red dashed outline to the hovered element */
export function highlightElement(el: Element): void {
  if (currentHighlight === el) return;
  removeHighlight();
  el.classList.add(OVERLAY_CLASS);
  currentHighlight = el;
}

/** Remove the highlight from the current element */
export function removeHighlight(): void {
  currentHighlight?.classList.remove(OVERLAY_CLASS);
  currentHighlight = null;
}

/** Remove all overlay classes from the page */
export function clearAllHighlights(): void {
  document.querySelectorAll(`.${OVERLAY_CLASS}`).forEach((el) => {
    el.classList.remove(OVERLAY_CLASS);
  });
  currentHighlight = null;
}
