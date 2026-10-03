import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect, useRef } from 'preact/hooks';
import { X } from 'lucide-preact';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface Props {
  open: boolean;
  onClose: () => void;
  title: ComponentChildren;
  description?: ComponentChildren;
  children: ComponentChildren;
  footer?: ComponentChildren;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'modal' | 'drawer';
}

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

/** Accessible dialog: traps focus, closes on Esc and backdrop click, restores focus on close. */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', variant = 'modal' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelectorAll<HTMLElement>(FOCUSABLE)[1] ?? node;
    setTimeout(() => first?.focus(), 20);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key === 'Tab' && node) {
        const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const a = items[0];
        const b = items[items.length - 1];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          b.focus();
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;
  const drawer = variant === 'drawer';
  return createPortal(
    <div class={`fixed inset-0 z-[70] flex ${drawer ? 'justify-end' : 'items-end justify-center p-0 sm:items-center sm:p-4'}`}>
      <div class="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-[fade_.15s_ease-out]" onClick={() => closeRef.current()} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        class={
          drawer
            ? 'relative flex h-full w-full max-w-xl flex-col bg-white shadow-lift animate-[slidein_.2s_ease-out] focus:outline-none'
            : `relative flex max-h-[92vh] w-full ${SIZES[size]} flex-col rounded-t-[var(--radius-modal)] bg-white shadow-lift animate-[pop_.16s_ease-out] focus:outline-none sm:rounded-[var(--radius-modal)]`
        }
      >
        <div class="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 id="modal-title" class="text-lg font-semibold text-text">
              {title}
            </h2>
            {description && <p class="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button type="button" class="btn-icon -mr-2 -mt-1" onClick={() => closeRef.current()} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div class="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface px-5 py-3 sm:rounded-b-[var(--radius-modal)]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
