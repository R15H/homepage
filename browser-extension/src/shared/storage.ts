import { STORAGE_KEYS } from './constants';
import type {
  ClickDataStore,
  Session,
  Settings,
  OnboardingState,
  ManualHiddenStore,
  GroupStore,
} from './types';
import { DEFAULT_SETTINGS, DEFAULT_ONBOARDING } from './types';

/** Typed wrapper around chrome.storage.local */
export const storage = {
  async getClickData(): Promise<ClickDataStore> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CLICK_DATA);
    return result[STORAGE_KEYS.CLICK_DATA] ?? {};
  },

  async setClickData(data: ClickDataStore): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.CLICK_DATA]: data });
  },

  async getSessions(): Promise<Session[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SESSIONS);
    return result[STORAGE_KEYS.SESSIONS] ?? [];
  },

  async setSessions(sessions: Session[]): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.SESSIONS]: sessions });
  },

  async getCurrentSession(): Promise<Session | null> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CURRENT_SESSION);
    return result[STORAGE_KEYS.CURRENT_SESSION] ?? null;
  },

  async setCurrentSession(session: Session): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_SESSION]: session });
  },

  async getManualHidden(): Promise<ManualHiddenStore> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.MANUAL_HIDDEN);
    return result[STORAGE_KEYS.MANUAL_HIDDEN] ?? {};
  },

  async setManualHidden(data: ManualHiddenStore): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.MANUAL_HIDDEN]: data });
  },

  async getGroups(): Promise<GroupStore> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.GROUPS);
    return result[STORAGE_KEYS.GROUPS] ?? [];
  },

  async setGroups(groups: GroupStore): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.GROUPS]: groups });
  },

  async getSettings(): Promise<Settings> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.SETTINGS] ?? {}) };
  },

  async setSettings(settings: Settings): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
  },

  async getOnboarding(): Promise<OnboardingState> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ONBOARDING);
    return { ...DEFAULT_ONBOARDING, ...(result[STORAGE_KEYS.ONBOARDING] ?? {}) };
  },

  async setOnboarding(state: OnboardingState): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.ONBOARDING]: state });
  },
};
