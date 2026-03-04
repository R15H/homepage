/** Unique fingerprint for a DOM element on a given page */
export interface ElementFingerprint {
  /** CSS-like selector path from nearest stable ancestor */
  selector: string;
  /** Normalized page URL (origin + pathname, no query/hash) */
  pageUrl: string;
}

/** Composite key for storage: "pageUrl::selector" */
export type ElementKey = string;

/** Click data for a single element across sessions */
export interface ElementClickData {
  /** Total clicks across all sessions */
  totalClicks: number;
  /** Map of sessionId (YYYY-MM-DD) → click count in that session */
  sessionClicks: Record<string, number>;
  /** First seen timestamp */
  firstSeen: number;
}

/** All click data keyed by ElementKey */
export type ClickDataStore = Record<ElementKey, ElementClickData>;

/** A daily session record */
export interface Session {
  id: string; // YYYY-MM-DD
  startTime: number;
  endTime: number;
}

/** Settings configurable by the user */
export interface Settings {
  autoHideEnabled: boolean;
  fabVisible: boolean;
  fabPosition: 'bottom-right' | 'bottom-left';
}

export const DEFAULT_SETTINGS: Settings = {
  autoHideEnabled: true,
  fabVisible: true,
  fabPosition: 'bottom-right',
};

/** Onboarding milestones (each fires once) */
export interface OnboardingState {
  fabIntroShown: boolean;
  groupingHintShown: boolean;
  autoHideNoticeShown: boolean;
}

export const DEFAULT_ONBOARDING: OnboardingState = {
  fabIntroShown: false,
  groupingHintShown: false,
  autoHideNoticeShown: false,
};

/** Manually hidden elements per page */
export type ManualHiddenStore = Record<string, string[]>; // pageUrl → selectors[]

/** A saved group rule */
export interface GroupRule {
  id: string;
  pageUrl: string;
  listSelector: string;
  pattern: string;
  isRegex: boolean;
  label: string;
}

/** All group rules */
export type GroupStore = GroupRule[];

/** Feature handle returned by each feature's init() */
export interface FeatureHandle {
  destroy(): void;
}

/** Message types for content ↔ background communication */
export type Message =
  | { type: 'GET_SESSION'; }
  | { type: 'SESSION_RESPONSE'; session: Session; }
  | { type: 'GET_ALL_SESSIONS'; }
  | { type: 'ALL_SESSIONS_RESPONSE'; sessions: Session[]; }
  | { type: 'SETTINGS_CHANGED'; settings: Settings; };
