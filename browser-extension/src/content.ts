/**
 * Content script entry point.
 * Thin glue that imports and wires all features together.
 */

import { initTracker } from '@features/tracking';
import { initAutoHide } from '@features/auto-hide';
import { initManualHide } from '@features/manual-hide';
import { initGrouping } from '@features/grouping';
import { initWidget } from '@ui/widget';
import { storage } from '@shared/storage';
import { showTooltip } from '@ui/tooltip';
import type { FeatureHandle } from '@shared/types';

// All active feature handles
const handles: FeatureHandle[] = [];

async function init(): Promise<void> {
  const settings = await storage.getSettings();

  // 1. Behavior tracking (always active)
  handles.push(initTracker());

  // 2. UI Widget (FAB)
  let manualHideHandle: ReturnType<typeof initManualHide> | null = null;

  if (settings.fabVisible) {
    const widget = initWidget({
      onHideModeToggle: (active) => {
        if (!manualHideHandle) {
          manualHideHandle = initManualHide();
          handles.push(manualHideHandle);
        }
        manualHideHandle.setActive(active);
      },
      onShowAll: () => {
        manualHideHandle?.showAll();
      },
    });
    handles.push(widget);

    // Onboarding: pulse FAB on first install
    showOnboardingHint(widget);
  }

  // 3. Auto-hide (runs after delay)
  handles.push(initAutoHide());

  // 4. Initialize manual hide (for restoring previously hidden elements)
  manualHideHandle = initManualHide();
  handles.push(manualHideHandle);

  // 5. Grouping (list detection + hover indicator)
  handles.push(initGrouping());

  // 6. SPA navigation support
  observeNavigation();
}

/** Show first-time onboarding tooltip */
async function showOnboardingHint(
  widget: ReturnType<typeof initWidget>
): Promise<void> {
  const onboarding = await storage.getOnboarding();
  if (onboarding.fabIntroShown) return;

  onboarding.fabIntroShown = true;
  await storage.setOnboarding(onboarding);

  setTimeout(() => {
    showTooltip(
      'Click to simplify this page',
      { x: window.innerWidth - 40, y: window.innerHeight - 30 },
      6000
    );
  }, 2000);
}

/** Watch for SPA navigation (URL changes without full page reload) */
function observeNavigation(): void {
  let lastUrl = location.href;

  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Re-run features that depend on page content
      // For now, a simple approach: destroy and re-init after a delay
      // This could be optimized per-feature in the future
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Run
init();
