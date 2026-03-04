import { SHADOW_HOST_ID } from '@shared/constants';
import { storage } from '@shared/storage';
import type { Settings } from '@shared/types';

// SVG icons as strings
const ICON_EYE = `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`;
const ICON_HIDE = `<svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.8 11.8 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>`;
const ICON_SHOW_ALL = `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`;

export interface WidgetCallbacks {
  onHideModeToggle: (active: boolean) => void;
  onShowAll: () => void;
}

let shadowRoot: ShadowRoot | null = null;
let fabEl: HTMLElement | null = null;
let menuEl: HTMLElement | null = null;
let menuOpen = false;
let hideModeActive = false;

/** Create the shadow DOM host and inject the FAB widget */
export function initWidget(callbacks: WidgetCallbacks): {
  getShadowRoot: () => ShadowRoot;
  setHideModeActive: (active: boolean) => void;
  destroy: () => void;
} {
  // Create shadow host
  const host = document.createElement('div');
  host.id = SHADOW_HOST_ID;
  host.style.cssText = 'all:initial; position:fixed; z-index:2147483646;';
  document.body.appendChild(host);
  shadowRoot = host.attachShadow({ mode: 'open' });

  // Inject styles
  const style = document.createElement('style');
  style.textContent = CSS_TEXT;
  shadowRoot.appendChild(style);

  // Create FAB
  fabEl = document.createElement('button');
  fabEl.className = 'ps-fab bottom-right';
  fabEl.innerHTML = ICON_EYE;
  fabEl.title = 'Page Simplifier';
  shadowRoot.appendChild(fabEl);

  // Create menu
  menuEl = document.createElement('div');
  menuEl.className = 'ps-menu bottom-right';
  menuEl.innerHTML = `
    <button class="ps-menu-item" data-action="hide-mode">
      ${ICON_HIDE}
      <span class="label">Hide Mode</span>
      <span class="toggle" data-toggle="hide"></span>
    </button>
    <div class="ps-divider"></div>
    <button class="ps-menu-item" data-action="show-all">
      ${ICON_SHOW_ALL}
      <span class="label">Show All Hidden</span>
    </button>
  `;
  shadowRoot.appendChild(menuEl);

  // Event handlers
  fabEl.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  menuEl.addEventListener('click', (e) => {
    const item = (e.target as Element).closest('.ps-menu-item') as HTMLElement | null;
    if (!item) return;
    e.stopPropagation();

    const action = item.dataset.action;
    if (action === 'hide-mode') {
      hideModeActive = !hideModeActive;
      updateHideModeUI();
      callbacks.onHideModeToggle(hideModeActive);
    } else if (action === 'show-all') {
      callbacks.onShowAll();
      closeMenu();
    }
  });

  // Close menu when clicking elsewhere
  document.addEventListener('click', () => closeMenu());

  // Apply saved position
  storage.getSettings().then(applyPosition);

  return {
    getShadowRoot: () => shadowRoot!,
    setHideModeActive: (active: boolean) => {
      hideModeActive = active;
      updateHideModeUI();
    },
    destroy: () => {
      host.remove();
      shadowRoot = null;
      fabEl = null;
      menuEl = null;
    },
  };
}

function toggleMenu() {
  menuOpen = !menuOpen;
  menuEl?.classList.toggle('open', menuOpen);
}

function closeMenu() {
  menuOpen = false;
  menuEl?.classList.remove('open');
}

function updateHideModeUI() {
  fabEl?.classList.toggle('active', hideModeActive);
  const toggle = menuEl?.querySelector('[data-toggle="hide"]');
  toggle?.classList.toggle('on', hideModeActive);
}

function applyPosition(settings: Settings) {
  const pos = settings.fabPosition;
  fabEl?.classList.remove('bottom-right', 'bottom-left');
  fabEl?.classList.add(pos);
  menuEl?.classList.remove('bottom-right', 'bottom-left');
  menuEl?.classList.add(pos);
}

export function getShadowRoot(): ShadowRoot | null {
  return shadowRoot;
}

// CSS text is inlined to avoid extra fetch in content script
const CSS_TEXT = `/* Inlined from widget.css */
:host {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  color: #333;
}
.ps-fab {
  position: fixed;
  z-index: 2147483646;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(90, 90, 90, 0.35);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s, transform 0.2s, background 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  padding: 0;
}
.ps-fab.bottom-right { bottom: 20px; right: 20px; }
.ps-fab.bottom-left { bottom: 20px; left: 20px; }
.ps-fab:hover { opacity: 1; background: rgba(90, 90, 90, 0.7); transform: scale(1.1); }
.ps-fab.active { background: rgba(220, 50, 50, 0.8); }
.ps-fab.pulse { animation: ps-pulse 0.6s ease-in-out 3; }
@keyframes ps-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.25); } }
.ps-fab svg { width: 20px; height: 20px; fill: white; }

.ps-menu {
  position: fixed;
  z-index: 2147483646;
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.18);
  padding: 8px 0;
  min-width: 180px;
  display: none;
}
.ps-menu.open { display: block; }
.ps-menu.bottom-right { bottom: 64px; right: 20px; }
.ps-menu.bottom-left { bottom: 64px; left: 20px; }

.ps-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  font-size: 13px;
  color: #333;
  transition: background 0.15s;
}
.ps-menu-item:hover { background: #f0f0f0; }
.ps-menu-item svg { width: 16px; height: 16px; flex-shrink: 0; }
.ps-menu-item .label { flex: 1; }

.ps-menu-item .toggle {
  width: 32px; height: 18px; border-radius: 9px;
  background: #ccc; position: relative; transition: background 0.2s;
}
.ps-menu-item .toggle.on { background: #4CAF50; }
.ps-menu-item .toggle::after {
  content: ''; position: absolute; width: 14px; height: 14px;
  border-radius: 50%; background: white; top: 2px; left: 2px; transition: left 0.2s;
}
.ps-menu-item .toggle.on::after { left: 16px; }

.ps-divider { height: 1px; background: #e0e0e0; margin: 4px 0; }

.ps-toast {
  position: fixed; bottom: 72px; left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: #333; color: white;
  padding: 10px 20px; border-radius: 8px; font-size: 13px;
  z-index: 2147483647; opacity: 0;
  transition: opacity 0.3s, transform 0.3s;
  display: flex; align-items: center; gap: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.ps-toast.visible { opacity: 1; transform: translateX(-50%) translateY(0); }
.ps-toast-action {
  color: #64B5F6; cursor: pointer; border: none;
  background: none; font-size: 13px; font-weight: 600; padding: 0;
}
.ps-toast-action:hover { text-decoration: underline; }

.ps-tooltip {
  position: fixed; z-index: 2147483647;
  background: #333; color: white;
  padding: 8px 14px; border-radius: 6px; font-size: 12px;
  max-width: 220px; opacity: 0; transition: opacity 0.3s; pointer-events: none;
}
.ps-tooltip.visible { opacity: 1; }
.ps-tooltip::after {
  content: ''; position: absolute; bottom: -6px; right: 16px;
  border-left: 6px solid transparent; border-right: 6px solid transparent;
  border-top: 6px solid #333;
}
`;
