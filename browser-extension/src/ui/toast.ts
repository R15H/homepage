import { getShadowRoot } from './widget';

let activeToast: HTMLElement | null = null;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

export interface ToastOptions {
  message: string;
  action?: { label: string; onClick: () => void };
  duration?: number; // ms, default 5000
}

/** Show a toast notification inside the shadow DOM */
export function showToast(options: ToastOptions): void {
  const root = getShadowRoot();
  if (!root) return;

  // Remove existing toast
  hideToast();

  const toast = document.createElement('div');
  toast.className = 'ps-toast';

  const msg = document.createElement('span');
  msg.textContent = options.message;
  toast.appendChild(msg);

  if (options.action) {
    const btn = document.createElement('button');
    btn.className = 'ps-toast-action';
    btn.textContent = options.action.label;
    btn.addEventListener('click', () => {
      options.action!.onClick();
      hideToast();
    });
    toast.appendChild(btn);
  }

  root.appendChild(toast);
  activeToast = toast;

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  // Auto-dismiss
  const duration = options.duration ?? 5000;
  dismissTimer = setTimeout(hideToast, duration);
}

export function hideToast(): void {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
  if (activeToast) {
    activeToast.classList.remove('visible');
    const el = activeToast;
    setTimeout(() => el.remove(), 300);
    activeToast = null;
  }
}
