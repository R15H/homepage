import { fingerprintElement } from '@shared/element-id';
import { MIN_LIST_ITEMS, STRUCTURAL_LIST_THRESHOLD } from '@shared/constants';
import type { DetectedList } from './types';

/**
 * Detect list-like structures on the page.
 *
 * Three detection strategies:
 * 1. Semantic: ul, ol, dl, [role="list"] with enough items
 * 2. Structural: containers where most children share the same tag+class
 * 3. Table: tbody with enough rows
 */
export function detectLists(): DetectedList[] {
  const lists: DetectedList[] = [];
  const seen = new Set<Element>();

  // 1. Semantic lists
  const semanticSelectors = 'ul, ol, dl, [role="list"]';
  document.querySelectorAll(semanticSelectors).forEach((container) => {
    if (seen.has(container)) return;
    const items = getListItems(container);
    if (items.length >= MIN_LIST_ITEMS) {
      seen.add(container);
      lists.push({
        container,
        items,
        type: 'semantic',
        selector: fingerprintElement(container).selector,
      });
    }
  });

  // 2. Structural lists (heuristic)
  // Look for div/section/main containers with repeated child patterns
  const candidates = document.querySelectorAll('div, section, main, aside, nav');
  candidates.forEach((container) => {
    if (seen.has(container)) return;
    const children = Array.from(container.children);
    if (children.length < MIN_LIST_ITEMS) return;

    // Count tag+class signatures
    const signatures = new Map<string, Element[]>();
    for (const child of children) {
      const sig = childSignature(child);
      const list = signatures.get(sig) ?? [];
      list.push(child);
      signatures.set(sig, list);
    }

    // Find dominant signature
    for (const [, items] of signatures) {
      if (items.length / children.length >= STRUCTURAL_LIST_THRESHOLD
          && items.length >= MIN_LIST_ITEMS) {
        seen.add(container);
        lists.push({
          container,
          items,
          type: 'structural',
          selector: fingerprintElement(container).selector,
        });
        break;
      }
    }
  });

  // 3. Tables
  document.querySelectorAll('tbody').forEach((tbody) => {
    if (seen.has(tbody)) return;
    const rows = Array.from(tbody.querySelectorAll(':scope > tr'));
    if (rows.length >= MIN_LIST_ITEMS) {
      seen.add(tbody);
      lists.push({
        container: tbody,
        items: rows,
        type: 'table',
        selector: fingerprintElement(tbody).selector,
      });
    }
  });

  return lists;
}

function getListItems(container: Element): Element[] {
  const tag = container.tagName.toLowerCase();
  if (tag === 'ul' || tag === 'ol') {
    return Array.from(container.querySelectorAll(':scope > li'));
  }
  if (tag === 'dl') {
    // Group dt+dd pairs as items
    return Array.from(container.querySelectorAll(':scope > dt'));
  }
  // role="list"
  return Array.from(
    container.querySelectorAll(':scope > [role="listitem"], :scope > li')
  );
}

function childSignature(el: Element): string {
  return `${el.tagName}.${Array.from(el.classList).sort().join('.')}`;
}

/**
 * Check if a given element is inside a detected list.
 * Used for hover detection.
 */
export function findListAt(x: number, y: number, lists: DetectedList[]): DetectedList | null {
  for (const list of lists) {
    const rect = list.container.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return list;
    }
  }
  return null;
}
