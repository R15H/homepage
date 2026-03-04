import type { FeatureHandle } from '@shared/types';
import { detectLists, findListAt } from './list-detector';
import { initListIndicator, showIndicatorNear, hideIndicator } from '@ui/list-indicator';
import { openGroupPanel, closeGroupPanel } from './group-ui';
import type { DetectedList } from './types';
import { storage } from '@shared/storage';
import { showTooltip } from '@ui/tooltip';

/**
 * Initialize the grouping feature:
 * - Detect lists on the page
 * - Show contextual indicator on list hover
 * - Open group panel when indicator is clicked
 */
export function initGrouping(): FeatureHandle {
  let lists: DetectedList[] = [];
  let hoveredList: DetectedList | null = null;
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;

  // Detect lists after a short delay for page to settle
  const detectTimer = setTimeout(() => {
    lists = detectLists();
    if (lists.length > 0) {
      showGroupingHint();
    }
  }, 2000);

  // Initialize the indicator icon
  const indicatorHandle = initListIndicator(() => {
    if (hoveredList) {
      openGroupPanel(hoveredList);
    }
  });

  // Track mouse movement to show/hide indicator near lists
  const handleMouseMove = (e: MouseEvent) => {
    if (lists.length === 0) return;

    const list = findListAt(e.clientX, e.clientY, lists);
    if (list) {
      if (hoveredList !== list) {
        hoveredList = list;
        showIndicatorNear(list.container);
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
      }
    } else if (hoveredList) {
      // Delay hiding to allow moving to indicator
      if (!hideTimeout) {
        hideTimeout = setTimeout(() => {
          hideIndicator();
          hoveredList = null;
          hideTimeout = null;
        }, 500);
      }
    }
  };

  document.addEventListener('mousemove', handleMouseMove, { passive: true });

  return {
    destroy() {
      clearTimeout(detectTimer);
      document.removeEventListener('mousemove', handleMouseMove);
      indicatorHandle.destroy();
      closeGroupPanel();
      if (hideTimeout) clearTimeout(hideTimeout);
    },
  };
}

async function showGroupingHint(): Promise<void> {
  const onboarding = await storage.getOnboarding();
  if (onboarding.groupingHintShown) return;

  onboarding.groupingHintShown = true;
  await storage.setOnboarding(onboarding);

  // Show a subtle tooltip near the first list after a delay
  setTimeout(() => {
    showTooltip(
      'Lists detected! Hover to group items.',
      { x: window.innerWidth - 60, y: window.innerHeight - 70 },
      5000
    );
  }, 3000);
}

export { detectLists } from './list-detector';
export { openGroupPanel, closeGroupPanel } from './group-ui';
