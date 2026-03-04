import { storage } from '@shared/storage';
import { STORAGE_KEYS } from '@shared/constants';
import type { Settings } from '@shared/types';

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await storage.getSettings();

  // Auto-hide toggle
  const autoHideToggle = document.getElementById('auto-hide-toggle') as HTMLInputElement;
  autoHideToggle.checked = settings.autoHideEnabled;
  autoHideToggle.addEventListener('change', () => {
    updateSetting('autoHideEnabled', autoHideToggle.checked);
  });

  // FAB visibility toggle
  const fabToggle = document.getElementById('fab-toggle') as HTMLInputElement;
  fabToggle.checked = settings.fabVisible;
  fabToggle.addEventListener('change', () => {
    updateSetting('fabVisible', fabToggle.checked);
  });

  // Position radio buttons
  const radios = document.querySelectorAll<HTMLInputElement>('input[name="position"]');
  radios.forEach((radio) => {
    radio.checked = radio.value === settings.fabPosition;
    radio.addEventListener('change', () => {
      if (radio.checked) {
        updateSetting('fabPosition', radio.value as Settings['fabPosition']);
      }
    });
  });

  // Stats
  const sessions = await storage.getSessions();
  const currentSession = await storage.getCurrentSession();
  const totalSessions = sessions.length + (currentSession ? 1 : 0);

  const clickData = await storage.getClickData();
  const totalElements = Object.keys(clickData).length;

  (document.getElementById('stat-sessions') as HTMLElement).textContent =
    String(totalSessions);
  (document.getElementById('stat-elements') as HTMLElement).textContent =
    String(totalElements);

  // Clear data button
  const clearBtn = document.getElementById('clear-data') as HTMLButtonElement;
  clearBtn.addEventListener('click', async () => {
    if (confirm('Clear all tracking data? This cannot be undone.')) {
      await chrome.storage.local.remove([
        STORAGE_KEYS.CLICK_DATA,
        STORAGE_KEYS.SESSIONS,
        STORAGE_KEYS.CURRENT_SESSION,
        STORAGE_KEYS.MANUAL_HIDDEN,
        STORAGE_KEYS.GROUPS,
        STORAGE_KEYS.ONBOARDING,
      ]);
      window.close();
    }
  });
});

async function updateSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K]
): Promise<void> {
  const settings = await storage.getSettings();
  settings[key] = value;
  await storage.setSettings(settings);

  // Notify content scripts
  chrome.runtime.sendMessage({ type: 'SETTINGS_CHANGED', settings });
}
