import { atom } from 'nanostores';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';
export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
}

export const $toasts = atom<Toast[]>([]);
let toastId = 0;

export function toast(title: string, opts: { tone?: ToastTone; message?: string; duration?: number } = {}): void {
  const t: Toast = { id: ++toastId, tone: opts.tone ?? 'success', title, message: opts.message };
  $toasts.set([...$toasts.get(), t].slice(-5));
  setTimeout(() => dismissToast(t.id), opts.duration ?? 4000);
}
export const dismissToast = (id: number) => $toasts.set($toasts.get().filter((t) => t.id !== id));

export interface ConfirmRequest {
  id: number;
  title: string;
  message?: string;
  confirmLabel?: string;
  tone?: 'primary' | 'danger';
  /** When set, the dialog shows a textarea and requires input. */
  input?: { label: string; placeholder?: string; required?: boolean };
  /** When set, the dialog asks for an authorization PIN. */
  pin?: boolean;
  resolve: (value: { ok: boolean; text?: string; pin?: string }) => void;
}
export const $confirm = atom<ConfirmRequest | null>(null);

/** Promise-based confirm dialog rendered by the global Overlays island. */
let confirmId = 0;
export function confirmDialog(req: Omit<ConfirmRequest, 'resolve' | 'id'>): Promise<{ ok: boolean; text?: string; pin?: string }> {
  return new Promise((resolve) => $confirm.set({ ...req, id: ++confirmId, resolve }));
}

export const $info = atom<{ title: string; message?: string } | null>(null);

/** Out-of-scope features open an informative modal instead of doing nothing. */
export function showInfo(title: string, message = 'Fitur ini tersedia pada versi produksi. Pada demo ini integrasi hanya disimulasikan.'): void {
  $info.set({ title, message });
}

export const $searchOpen = atom(false);
export const $roleSwitchOpen = atom(false);
export const $sidebarOpen = atom(false);
