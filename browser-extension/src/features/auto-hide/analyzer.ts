import { storage } from '@shared/storage';
import { normalizeUrl, fromElementKey } from '@shared/element-id';
import { MIN_SESSIONS_FOR_AUTO_HIDE, AUTO_HIDE_SESSION_THRESHOLD } from '@shared/constants';
import { getAllSessions } from '@features/tracking/session';
import type { AnalysisResult } from './types';

/**
 * Analyze click data and determine which elements on the current page
 * should be auto-hidden based on usage patterns.
 *
 * Rules:
 * 1. Never clicked across all sessions → hide
 * 2. Zero clicks in >50% of sessions → hide
 *
 * Requires at least MIN_SESSIONS_FOR_AUTO_HIDE sessions before activating.
 */
export async function analyzePageElements(): Promise<AnalysisResult[]> {
  const sessions = await getAllSessions();
  if (sessions.length < MIN_SESSIONS_FOR_AUTO_HIDE) {
    return [];
  }

  const pageUrl = normalizeUrl(window.location.href);
  const clickData = await storage.getClickData();
  const sessionIds = sessions.map((s) => s.id);
  const totalSessions = sessionIds.length;

  const results: AnalysisResult[] = [];

  for (const [key, data] of Object.entries(clickData)) {
    const fp = fromElementKey(key);
    if (fp.pageUrl !== pageUrl) continue;

    // Count sessions where the element had zero clicks
    let zeroSessions = 0;
    for (const sid of sessionIds) {
      if (!data.sessionClicks[sid] || data.sessionClicks[sid] === 0) {
        zeroSessions++;
      }
    }

    const zeroFraction = zeroSessions / totalSessions;

    // Rule 1: never clicked at all
    if (data.totalClicks === 0) {
      results.push({
        key,
        shouldHide: true,
        reason: 'never-clicked',
        frequency: 0,
        zeroSessionFraction: 1,
      });
      continue;
    }

    // Rule 2: zero clicks in >50% of sessions
    if (zeroFraction > AUTO_HIDE_SESSION_THRESHOLD) {
      results.push({
        key,
        shouldHide: true,
        reason: 'low-frequency',
        frequency: data.totalClicks / totalSessions,
        zeroSessionFraction: zeroFraction,
      });
      continue;
    }

    results.push({
      key,
      shouldHide: false,
      reason: null,
      frequency: data.totalClicks / totalSessions,
      zeroSessionFraction: zeroFraction,
    });
  }

  return results;
}
