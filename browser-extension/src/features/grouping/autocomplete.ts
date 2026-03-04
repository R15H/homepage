import { MAX_AUTOCOMPLETE_SUGGESTIONS } from '@shared/constants';

/**
 * Extract autocomplete suggestions from list items.
 *
 * Strategy:
 * - Tokenize innerText of each item into words
 * - Count word frequency
 * - Exclude words that appear in ALL items (not useful for grouping)
 * - Rank by frequency descending
 * - Return top N suggestions
 */
export function getSuggestions(items: Element[]): string[] {
  const wordCounts = new Map<string, number>();
  const totalItems = items.length;

  // Count which items each word appears in
  const wordItemCount = new Map<string, number>();

  for (const item of items) {
    const text = item.textContent ?? '';
    const words = extractWords(text);
    const uniqueWords = new Set(words);

    for (const word of uniqueWords) {
      wordItemCount.set(word, (wordItemCount.get(word) ?? 0) + 1);
    }

    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
    }
  }

  // Filter: exclude words in ALL items (useless) and very short words
  const candidates: Array<{ word: string; count: number }> = [];
  for (const [word, count] of wordCounts) {
    const itemCount = wordItemCount.get(word) ?? 0;
    if (itemCount >= totalItems) continue; // appears in all items
    if (word.length < 2) continue;
    candidates.push({ word, count });
  }

  // Sort by frequency desc, then alphabetically
  candidates.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.word.localeCompare(b.word);
  });

  return candidates
    .slice(0, MAX_AUTOCOMPLETE_SUGGESTIONS)
    .map((c) => c.word);
}

/** Filter suggestions based on user input */
export function filterSuggestions(suggestions: string[], input: string): string[] {
  if (!input) return suggestions.slice(0, 8);
  const lower = input.toLowerCase();
  return suggestions.filter((s) => s.toLowerCase().includes(lower));
}

function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);
}
