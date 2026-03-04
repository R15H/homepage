import { fromElementKey, resolveSelector } from '@shared/element-id';
import { DATA_PREFIX } from '@shared/constants';
import { storage } from '@shared/storage';
import { showToast } from '@ui/toast';
import type { FeatureHandle } from '@shared/types';
import { analyzePageElements } from './analyzer';
import type { AnalysisResult } from './types';

const AUTO_HIDDEN_ATTR = `${DATA_PREFIX}-auto-hidden`;

/** Elements hidden by auto-hide on this page load */
let autoHiddenElements: Array<{ el: Element; key: string }> = [];

/**
 * Initialize auto-hide: analyze click data and hide rarely-used elements.
 * Runs once on page load after a delay to let the page settle.
 */
export function initAutoHide(): FeatureHandle {
  let destroyed = false;

  const timer = setTimeout(async () => {
    if (destroyed) return;

    const settings = await storage.getSettings();
    if (!settings.autoHideEnabled) return;

    const results = await analyzePageElements();
    const toHide = results.filter((r) => r.shouldHide);
    if (toHide.length === 0) return;

    applyAutoHide(toHide);

    // Show one-time notice
    const onboarding = await storage.getOnboarding();
    if (!onboarding.autoHideNoticeShown && autoHiddenElements.length > 0) {
      onboarding.autoHideNoticeShown = true;
      await storage.setOnboarding(onboarding);

      showToast({
        message: `${autoHiddenElements.length} rarely-used element${autoHiddenElements.length > 1 ? 's' : ''} hidden`,
        action: {
          label: 'Show All',
          onClick: () => restoreAutoHidden(),
        },
        duration: 6000,
      });
    }
  }, 1500); // Wait for page to settle

  return {
    destroy: () => {
      destroyed = true;
      clearTimeout(timer);
      restoreAutoHidden();
    },
  };
}

function applyAutoHide(results: AnalysisResult[]): void {
  for (const result of results) {
    const fp = fromElementKey(result.key);
    const el = resolveSelector(fp.selector);
    if (!el) continue;

    const htmlEl = el as HTMLElement;
    htmlEl.setAttribute(AUTO_HIDDEN_ATTR, result.reason ?? '');
    htmlEl.style.visibility = 'hidden';
    htmlEl.style.pointerEvents = 'none';
    htmlEl.setAttribute('aria-hidden', 'true');

    autoHiddenElements.push({ el, key: result.key });
  }
}

/** Restore all auto-hidden elements */
export function restoreAutoHidden(): void {
  for (const { el } of autoHiddenElements) {
    const htmlEl = el as HTMLElement;
    htmlEl.style.visibility = '';
    htmlEl.style.pointerEvents = '';
    htmlEl.removeAttribute('aria-hidden');
    htmlEl.removeAttribute(AUTO_HIDDEN_ATTR);
  }
  autoHiddenElements = [];
}
