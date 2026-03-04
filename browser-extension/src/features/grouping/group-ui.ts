import { getShadowRoot } from '@ui/widget';
import { getSuggestions, filterSuggestions } from './autocomplete';
import { findMatches, applyGroup } from './grouper';
import type { DetectedList, ActiveGroup } from './types';

let panelEl: HTMLElement | null = null;
let currentList: DetectedList | null = null;
let suggestions: string[] = [];
let activeGroups: ActiveGroup[] = [];

/**
 * Open the grouping panel near a detected list.
 * Shows a text input with autocomplete and a regex toggle.
 */
export function openGroupPanel(list: DetectedList): void {
  const root = getShadowRoot();
  if (!root) return;

  closeGroupPanel();
  currentList = list;
  suggestions = getSuggestions(list.items);

  // Create panel
  panelEl = document.createElement('div');
  panelEl.className = 'ps-group-panel open';

  const rect = list.container.getBoundingClientRect();
  panelEl.style.position = 'fixed';
  panelEl.style.top = `${Math.max(8, rect.top)}px`;
  panelEl.style.left = `${Math.min(rect.right + 8, window.innerWidth - 280)}px`;
  panelEl.style.zIndex = '2147483645';

  panelEl.innerHTML = `
    <div class="ps-group-input-wrap">
      <input class="ps-group-input" type="text" placeholder="Type to group items..." />
      <button class="ps-regex-toggle" title="Toggle regex mode">.*</button>
    </div>
    <div style="position:relative;">
      <div class="ps-autocomplete"></div>
    </div>
    <div class="ps-group-preview"></div>
  `;

  root.appendChild(panelEl);

  const input = panelEl.querySelector('.ps-group-input') as HTMLInputElement;
  const regexBtn = panelEl.querySelector('.ps-regex-toggle') as HTMLButtonElement;
  const autocompleteEl = panelEl.querySelector('.ps-autocomplete') as HTMLElement;
  const previewEl = panelEl.querySelector('.ps-group-preview') as HTMLElement;

  let isRegex = false;
  let selectedIdx = -1;

  // Input handler with autocomplete
  input.addEventListener('input', () => {
    const value = input.value;
    updatePreview(value, isRegex, previewEl);
    showAutocomplete(value, autocompleteEl, input);
    selectedIdx = -1;
  });

  // Keyboard navigation for autocomplete
  input.addEventListener('keydown', (e) => {
    const items = autocompleteEl.querySelectorAll('.ps-autocomplete-item');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIdx = Math.min(selectedIdx + 1, items.length - 1);
      updateSelection(items, selectedIdx);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIdx = Math.max(selectedIdx - 1, -1);
      updateSelection(items, selectedIdx);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIdx >= 0 && items[selectedIdx]) {
        input.value = items[selectedIdx].textContent ?? '';
        autocompleteEl.classList.remove('open');
        updatePreview(input.value, isRegex, previewEl);
      } else if (input.value) {
        // Apply the group
        const group = applyGroup(currentList!, input.value, isRegex, input.value);
        if (group.matchedIndices.length > 0) {
          activeGroups.push(group);
        }
        input.value = '';
        previewEl.textContent = '';
        autocompleteEl.classList.remove('open');
      }
    } else if (e.key === 'Escape') {
      if (autocompleteEl.classList.contains('open')) {
        autocompleteEl.classList.remove('open');
      } else {
        closeGroupPanel();
      }
    }
  });

  // Regex toggle
  regexBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isRegex = !isRegex;
    regexBtn.classList.toggle('on', isRegex);
    updatePreview(input.value, isRegex, previewEl);
  });

  // Auto-focus
  input.focus();

  // Close on outside click
  const closeHandler = (e: Event) => {
    if (panelEl && !panelEl.contains(e.target as Node)) {
      closeGroupPanel();
      root.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => root.addEventListener('click', closeHandler), 100);
}

function showAutocomplete(
  input: string,
  autocompleteEl: HTMLElement,
  inputEl: HTMLInputElement
): void {
  const filtered = filterSuggestions(suggestions, input);
  if (filtered.length === 0 || !input) {
    autocompleteEl.classList.remove('open');
    return;
  }

  autocompleteEl.innerHTML = filtered
    .map((s) => `<div class="ps-autocomplete-item">${escapeHtml(s)}</div>`)
    .join('');
  autocompleteEl.classList.add('open');

  // Click handler for items
  autocompleteEl.querySelectorAll('.ps-autocomplete-item').forEach((item) => {
    item.addEventListener('click', () => {
      inputEl.value = item.textContent ?? '';
      autocompleteEl.classList.remove('open');
      inputEl.focus();
    });
  });
}

function updateSelection(items: NodeListOf<Element>, idx: number): void {
  items.forEach((item, i) => {
    item.classList.toggle('selected', i === idx);
  });
}

function updatePreview(pattern: string, isRegex: boolean, previewEl: HTMLElement): void {
  if (!currentList || !pattern) {
    previewEl.textContent = '';
    return;
  }
  const matches = findMatches(currentList, pattern, isRegex);
  previewEl.textContent = matches.length > 0
    ? `${matches.length} of ${currentList.items.length} items match`
    : 'No matches';
}

export function closeGroupPanel(): void {
  panelEl?.remove();
  panelEl = null;
  currentList = null;
}

export function getActiveGroups(): ActiveGroup[] {
  return activeGroups;
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
