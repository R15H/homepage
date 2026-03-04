import type { ElementFingerprint, ElementKey } from './types';

/**
 * Generate a stable fingerprint for a DOM element.
 * Strategy: walk up the DOM to find the nearest ancestor with a stable id,
 * then build a path of tag:nth-of-type selectors down to the target.
 */
export function fingerprintElement(el: Element): ElementFingerprint {
  const selector = buildSelector(el);
  const pageUrl = normalizeUrl(window.location.href);
  return { selector, pageUrl };
}

/** Convert a fingerprint to a storage key */
export function toElementKey(fp: ElementFingerprint): ElementKey {
  return `${fp.pageUrl}::${fp.selector}`;
}

/** Parse a storage key back to a fingerprint */
export function fromElementKey(key: ElementKey): ElementFingerprint {
  const sep = key.indexOf('::');
  return {
    pageUrl: key.slice(0, sep),
    selector: key.slice(sep + 2),
  };
}

/** Normalize a URL to origin + pathname (strip query, hash) */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return url;
  }
}

/**
 * Build a CSS selector path for an element.
 * Uses stable id attributes when available, falls back to tag:nth-of-type.
 * Enriched with data-testid, role, aria-label when present.
 */
function buildSelector(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current !== document.documentElement) {
    const part = selectorPart(current);
    parts.unshift(part);

    // Stop at a stable id anchor
    if (hasStableId(current)) break;

    current = current.parentElement;
  }

  return parts.join(' > ');
}

function selectorPart(el: Element): string {
  // Prefer stable id
  if (hasStableId(el)) {
    return `#${CSS.escape(el.id)}`;
  }

  // Prefer data-testid
  const testId = el.getAttribute('data-testid');
  if (testId) {
    return `[data-testid="${CSS.escape(testId)}"]`;
  }

  let selector = el.tagName.toLowerCase();

  // Add role or aria-label for specificity
  const role = el.getAttribute('role');
  if (role) selector += `[role="${role}"]`;

  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) selector += `[aria-label="${CSS.escape(ariaLabel)}"]`;

  // nth-of-type for positional disambiguation
  const parent = el.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children).filter(
      (s) => s.tagName === el.tagName
    );
    if (siblings.length > 1) {
      const index = siblings.indexOf(el) + 1;
      selector += `:nth-of-type(${index})`;
    }
  }

  return selector;
}

/** Check if an element has a stable (non-generated) id */
function hasStableId(el: Element): boolean {
  if (!el.id) return false;
  // Heuristic: skip ids that look auto-generated (contain long hex, uuid patterns)
  if (/^[a-f0-9-]{20,}$/i.test(el.id)) return false;
  if (/^:r[0-9a-z]+:$/i.test(el.id)) return false; // React-generated ids
  return true;
}

/**
 * Try to find a DOM element from its selector.
 * Returns null if not found.
 */
export function resolveSelector(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}
