import type { ComponentChildren } from 'preact';
import type { Tone } from '../../lib/constants';

export const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted ring-1 ring-inset ring-border',
  primary: 'bg-primary-soft text-primary-strong ring-1 ring-inset ring-primary/15',
  success: 'bg-success-soft text-success-strong ring-1 ring-inset ring-success/20',
  warning: 'bg-warning-soft text-warning-strong ring-1 ring-inset ring-warning/25',
  info: 'bg-info-soft text-info-strong ring-1 ring-inset ring-info/20',
  danger: 'bg-danger-soft text-danger-strong ring-1 ring-inset ring-danger/20',
};

const DOT: Record<Tone, string> = {
  neutral: 'bg-subtle',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
  danger: 'bg-danger',
};

export function Badge({ tone = 'neutral', children, class: cls = '', title }: { tone?: Tone; children: ComponentChildren; class?: string; title?: string }) {
  return (
    <span class={`badge ${TONE_CLASS[tone]} ${cls}`} title={title}>
      {children}
    </span>
  );
}

/** Status pill: colour plus a dot and always a text label (never colour alone). */
export function StatusPill({ status }: { status: { label: string; tone: Tone } | undefined }) {
  if (!status) return null;
  return (
    <span class={`badge ${TONE_CLASS[status.tone]}`}>
      <span class={`h-1.5 w-1.5 rounded-full ${DOT[status.tone]}`} aria-hidden="true" />
      {status.label}
    </span>
  );
}
