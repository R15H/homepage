/** Minimum number of daily sessions before auto-hide activates */
export const MIN_SESSIONS_FOR_AUTO_HIDE = 3;

/** Threshold: hide if element has zero clicks in more than this fraction of sessions */
export const AUTO_HIDE_SESSION_THRESHOLD = 0.5;

/** Maximum autocomplete suggestions shown */
export const MAX_AUTOCOMPLETE_SUGGESTIONS = 20;

/** Minimum list items for a container to be considered a list */
export const MIN_LIST_ITEMS = 3;

/** Fraction of children sharing the same tag+class to qualify as a structural list */
export const STRUCTURAL_LIST_THRESHOLD = 0.6;

/** Storage keys */
export const STORAGE_KEYS = {
  CLICK_DATA: 'ps_click_data',
  SESSIONS: 'ps_sessions',
  CURRENT_SESSION: 'ps_current_session',
  MANUAL_HIDDEN: 'ps_manual_hidden',
  GROUPS: 'ps_groups',
  SETTINGS: 'ps_settings',
  ONBOARDING: 'ps_onboarding',
} as const;

/** Data attribute prefix for extension-injected state */
export const DATA_PREFIX = 'data-ps';

/** Shadow DOM host ID */
export const SHADOW_HOST_ID = 'page-simplifier-root';
