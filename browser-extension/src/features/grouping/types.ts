/** A detected list on the page */
export interface DetectedList {
  /** The container element */
  container: Element;
  /** The list items */
  items: Element[];
  /** Type of detection */
  type: 'semantic' | 'structural' | 'table';
  /** CSS selector for the container */
  selector: string;
}

/** An active group (fold) applied to a list */
export interface ActiveGroup {
  /** Unique id */
  id: string;
  /** Selector for the list container */
  listSelector: string;
  /** Pattern used for matching */
  pattern: string;
  /** Whether pattern is regex */
  isRegex: boolean;
  /** Label for the fold */
  label: string;
  /** Indices of matched items */
  matchedIndices: number[];
  /** The fold element inserted into the DOM */
  foldElement: HTMLElement | null;
}
