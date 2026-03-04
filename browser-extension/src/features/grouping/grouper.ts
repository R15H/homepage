import type { DetectedList, ActiveGroup } from './types';

/**
 * Find which list items match a given pattern.
 *
 * @param list - The detected list
 * @param pattern - String or regex pattern
 * @param isRegex - Whether to treat pattern as regex
 * @returns Indices of matching items
 */
export function findMatches(
  list: DetectedList,
  pattern: string,
  isRegex: boolean
): number[] {
  if (!pattern) return [];

  const indices: number[] = [];

  for (let i = 0; i < list.items.length; i++) {
    const text = list.items[i].textContent ?? '';
    if (matchesPattern(text, pattern, isRegex)) {
      indices.push(i);
    }
  }

  return indices;
}

function matchesPattern(text: string, pattern: string, isRegex: boolean): boolean {
  if (isRegex) {
    try {
      const re = new RegExp(pattern, 'i');
      return re.test(text);
    } catch {
      return false; // Invalid regex
    }
  }
  return text.toLowerCase().includes(pattern.toLowerCase());
}

/**
 * Apply a group: collapse matching items into a fold element.
 * Inserts the fold before the first matched item and moves matched items inside it.
 */
export function applyGroup(
  list: DetectedList,
  pattern: string,
  isRegex: boolean,
  label: string
): ActiveGroup {
  const matchedIndices = findMatches(list, pattern, isRegex);
  if (matchedIndices.length === 0) {
    return {
      id: generateId(),
      listSelector: list.selector,
      pattern,
      isRegex,
      label,
      matchedIndices: [],
      foldElement: null,
    };
  }

  // Create fold element
  const fold = document.createElement('div');
  fold.className = 'ps-fold';
  fold.dataset.psGroup = 'true';

  const header = document.createElement('div');
  header.className = 'ps-fold-header';
  header.innerHTML = `
    <span class="ps-fold-arrow">&#9654;</span>
    <span>${escapeHtml(label || pattern)}</span>
    <span class="ps-fold-count">${matchedIndices.length}</span>
    <button class="ps-fold-remove" title="Remove group">&times;</button>
  `;

  const content = document.createElement('div');
  content.className = 'ps-fold-content';

  fold.appendChild(header);
  fold.appendChild(content);

  // Toggle fold on header click
  header.addEventListener('click', (e) => {
    if ((e.target as Element).closest('.ps-fold-remove')) return;
    fold.classList.toggle('open');
  });

  // Insert fold before the first matched item
  const firstItem = list.items[matchedIndices[0]];
  firstItem.parentElement?.insertBefore(fold, firstItem);

  // Move matched items into fold content
  for (const idx of matchedIndices) {
    const item = list.items[idx];
    content.appendChild(item);
  }

  const group: ActiveGroup = {
    id: generateId(),
    listSelector: list.selector,
    pattern,
    isRegex,
    label,
    matchedIndices,
    foldElement: fold,
  };

  // Remove button handler
  const removeBtn = header.querySelector('.ps-fold-remove');
  removeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    removeGroup(group, list);
  });

  return group;
}

/**
 * Remove a group: restore items to their original positions and remove the fold.
 */
export function removeGroup(group: ActiveGroup, list: DetectedList): void {
  if (!group.foldElement) return;

  const parent = group.foldElement.parentElement;
  if (!parent) return;

  // Move items back before the fold
  const content = group.foldElement.querySelector('.ps-fold-content');
  if (content) {
    while (content.firstChild) {
      parent.insertBefore(content.firstChild, group.foldElement);
    }
  }

  group.foldElement.remove();
  group.foldElement = null;
}

function generateId(): string {
  return `ps-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
