import { ensureSession, getAllSessions } from '@features/tracking/session';
import { onMessage } from '@shared/messaging';

// === Session Management ===

// Ensure session on service worker startup
ensureSession();

// Heartbeat: update session endTime every minute
chrome.alarms.create('ps-heartbeat', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'ps-heartbeat') {
    ensureSession();
  }
});

// === Message Handler ===

onMessage(async (message) => {
  switch (message.type) {
    case 'GET_SESSION': {
      const session = await ensureSession();
      return { type: 'SESSION_RESPONSE', session };
    }
    case 'GET_ALL_SESSIONS': {
      const sessions = await getAllSessions();
      return { type: 'ALL_SESSIONS_RESPONSE', sessions };
    }
  }
});
