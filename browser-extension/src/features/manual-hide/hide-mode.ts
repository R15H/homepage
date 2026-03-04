import { fingerprintElement, toElementKey, normalizeUrl } from '@shared/element-id';
import { storage } from '@shared/storage';
import { DATA_PREFIX } from '@shared/constants';
import type { FeatureHandle } from '@shared/types';
import { highlightElement, removeHighlight, clearAllHighlights } from './overlay';
import { showToast } from '@ui/toast';

const HIDDEN_ATTR = `${DATA_PREFIX}-hidden`;

let active = false;
let hiddenThisSession: Array<{ el: Element; selector: string }> = [];

export function initManualHide(): FeatureHandle & {
  setActive: (a: boolean) => void;
  showAll: () => void;
} {
  const handleMouseOver = (e: MouseEvent) => {
    if (!active) return;
    const target = e.target as Element;
    if (target && target !== document.body && target !== document.documentElement) {
      highlightElement(target);
    }
  };

  const handleMouseOut = () => {
    if (!active) return;
    removeHighlight();
  };

  const handleClick = (e: MouseEvent) => {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const target = e.target as Element;
    if (!target || target === document.body || target === document.documentElement) return;

    hideElement(target);
    removeHighlight();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!active) return;
    if (e.key === 'Escape') {
      deactivate();
    }
  };

  function activate() {
    active = true;
    hiddenThisSession = [];
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.body.style.cursor = 'crosshair';
  }

  function deactivate() {
    active = false;
    clearAllHighlights();
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mouseout', handleMouseOut, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeyDown, true);
    document.body.style.cursor = '';

    if (hiddenThisSession.length > 0) {
      const count = hiddenThisSession.length;
      const lastBatch = [...hiddenThisSession];
      showToast({
        message: `${count} element${count > 1 ? 's' : ''} hidden`,
        action: {
          label: 'Undo',
          onClick: () => {
            lastBatch.forEach(({ el }) => unhideElement(el));
          },
        },
      });
    }
  }

  // Restore previously hidden elements for this page
  restoreHidden();

  return {
    setActive: (a: boolean) => {
      if (a && !active) activate();
      else if (!a && active) deactivate();
    },
    showAll: () => {
      showAllHidden();
    },
    destroy: () => {
      if (active) deactivate();
    },
  };
}

/** Hide an element without shifting layout */
function hideElement(el: Element): void {
  const htmlEl = el as HTMLElement;
  // Store original styles
  htmlEl.setAttribute(HIDDEN_ATTR, JSON.stringify({
    visibility: htmlEl.style.visibility,
    pointerEvents: htmlEl.style.pointerEvents,
  }));
  htmlEl.style.visibility = 'hidden';
  htmlEl.style.pointerEvents = 'none';
  htmlEl.setAttribute('aria-hidden', 'true');

  const fp = fingerprintElement(el);
  hiddenThisSession.push({ el, selector: fp.selector });

  // Persist to storage
  persistHidden(fp.selector);
}

/** Restore an element's visibility */
function unhideElement(el: Element): void {
  const htmlEl = el as HTMLElement;
  const stored = htmlEl.getAttribute(HIDDEN_ATTR);
  if (stored) {
    try {
      const original = JSON.parse(stored);
      htmlEl.style.visibility = original.visibility || '';
      htmlEl.style.pointerEvents = original.pointerEvents || '';
    } catch {
      htmlEl.style.visibility = '';
      htmlEl.style.pointerEvents = '';
    }
    htmlEl.removeAttribute(HIDDEN_ATTR);
    htmlEl.removeAttribute('aria-hidden');
  }

  const fp = fingerprintElement(el);
  removeFromStorage(fp.selector);
}

/** Show all hidden elements on the page */
function showAllHidden(): void {
  document.querySelectorAll(`[${HIDDEN_ATTR}]`).forEach((el) => {
    unhideElement(el);
  });
  showToast({ message: 'All hidden elements restored' });
}

async function persistHidden(selector: string): Promise<void> {
  const pageUrl = normalizeUrl(window.location.href);
  const data = await storage.getManualHidden();
  const list = data[pageUrl] ?? [];
  if (!list.includes(selector)) {
    list.push(selector);
    data[pageUrl] = list;
    await storage.setManualHidden(data);
  }
}

async function removeFromStorage(selector: string): Promise<void> {
  const pageUrl = normalizeUrl(window.location.href);
  const data = await storage.getManualHidden();
  const list = data[pageUrl] ?? [];
  const idx = list.indexOf(selector);
  if (idx !== -1) {
    list.splice(idx, 1);
    data[pageUrl] = list;
    await storage.setManualHidden(data);
  }
}

/** Restore elements hidden in previous sessions */
async function restoreHidden(): Promise<void> {
  const pageUrl = normalizeUrl(window.location.href);
  const data = await storage.getManualHidden();
  const selectors = data[pageUrl] ?? [];

  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      if (el) {
        const htmlEl = el as HTMLElement;
        htmlEl.setAttribute(HIDDEN_ATTR, JSON.stringify({
          visibility: htmlEl.style.visibility,
          pointerEvents: htmlEl.style.pointerEvents,
        }));
        htmlEl.style.visibility = 'hidden';
        htmlEl.style.pointerEvents = 'none';
        htmlEl.setAttribute('aria-hidden', 'true');
      }
    } catch {
      // Selector may be invalid, skip
    }
  }
}
