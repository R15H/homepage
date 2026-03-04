import { fingerprintElement, toElementKey } from '@shared/element-id';
import { storage } from '@shared/storage';
import { sendMessage } from '@shared/messaging';
import type { FeatureHandle, Session } from '@shared/types';

/**
 * Click tracker: listens for all clicks on the page and records
 * which elements get clicked, with per-session counters.
 */
export function initTracker(): FeatureHandle {
  let currentSession: Session | null = null;

  // Get session from background
  sendMessage({ type: 'GET_SESSION' }).then((resp) => {
    if (resp && resp.type === 'SESSION_RESPONSE') {
      currentSession = resp.session;
    }
  });

  const handleClick = async (e: MouseEvent) => {
    if (!currentSession) return;

    const target = e.target as Element | null;
    if (!target || !target.closest) return;

    // Find the nearest interactive element or use target
    const interactive = findInteractiveAncestor(target) ?? target;
    const fp = fingerprintElement(interactive);
    const key = toElementKey(fp);

    const data = await storage.getClickData();
    const entry = data[key] ?? {
      totalClicks: 0,
      sessionClicks: {},
      firstSeen: Date.now(),
    };

    entry.totalClicks++;
    entry.sessionClicks[currentSession.id] =
      (entry.sessionClicks[currentSession.id] ?? 0) + 1;

    data[key] = entry;
    await storage.setClickData(data);
  };

  document.addEventListener('click', handleClick, true);

  return {
    destroy() {
      document.removeEventListener('click', handleClick, true);
    },
  };
}

/**
 * Walk up the DOM to find the nearest interactive element
 * (a, button, [role="button"], input, select, etc.)
 */
function findInteractiveAncestor(el: Element): Element | null {
  const interactiveTags = new Set([
    'A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY', 'DETAILS',
  ]);
  const interactiveRoles = new Set([
    'button', 'link', 'tab', 'menuitem', 'option', 'checkbox', 'radio',
    'switch', 'treeitem',
  ]);

  let current: Element | null = el;
  while (current && current !== document.body) {
    if (interactiveTags.has(current.tagName)) return current;
    const role = current.getAttribute('role');
    if (role && interactiveRoles.has(role)) return current;
    if (current.hasAttribute('onclick')) return current;
    if (current.hasAttribute('tabindex')) return current;
    current = current.parentElement;
  }
  return null;
}
