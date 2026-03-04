import { storage } from '@shared/storage';
import type { Session } from '@shared/types';

/** Get today's date as YYYY-MM-DD */
export function todayId(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Ensure a session exists for today.
 * If the current session is from a previous day, archive it and start a new one.
 * Called from the background service worker on startup and via alarm.
 */
export async function ensureSession(): Promise<Session> {
  const today = todayId();
  const current = await storage.getCurrentSession();

  if (current && current.id === today) {
    // Update endTime heartbeat
    const updated = { ...current, endTime: Date.now() };
    await storage.setCurrentSession(updated);
    return updated;
  }

  // Archive previous session if it exists
  if (current) {
    const sessions = await storage.getSessions();
    sessions.push(current);
    await storage.setSessions(sessions);
  }

  // Start new session
  const newSession: Session = {
    id: today,
    startTime: Date.now(),
    endTime: Date.now(),
  };
  await storage.setCurrentSession(newSession);
  return newSession;
}

/** Get all archived sessions plus the current one */
export async function getAllSessions(): Promise<Session[]> {
  const sessions = await storage.getSessions();
  const current = await storage.getCurrentSession();
  if (current) sessions.push(current);
  return sessions;
}
