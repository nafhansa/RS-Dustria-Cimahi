import type { ComponentChildren } from 'preact';
import { Check } from 'lucide-preact';
import { initials } from '../../lib/format';

export function PageHeader({ title, subtitle, actions, back }: { title: ComponentChildren; subtitle?: ComponentChildren; actions?: ComponentChildren; back?: { href: string; label: string } }) {
  return (
    <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div class="min-w-0">
        {back && (
          <a href={back.href} class="mb-1 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
            ← {back.label}
          </a>
        )}
        <h1 class="text-2xl font-bold text-text">{title}</h1>
        {subtitle && <p class="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div class="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon, hint, tone = 'primary', href }: { label: string; value: ComponentChildren; icon?: ComponentChildren; hint?: ComponentChildren; tone?: 'primary' | 'success' | 'info' | 'warning'; href?: string }) {
  const toneCls = { primary: 'bg-primary-soft text-primary', success: 'bg-success-soft text-success-strong', info: 'bg-info-soft text-info-strong', warning: 'bg-warning-soft text-warning-strong' }[tone];
  const body = (
    <div class="card card-pad flex h-full items-start justify-between gap-3 transition hover:shadow-lift">
      <div class="min-w-0">
        <p class="text-sm font-medium text-muted">{label}</p>
        <p class="tabular mt-1.5 text-2xl font-bold text-text">{value}</p>
        {hint && <p class="mt-1 text-xs text-subtle">{hint}</p>}
      </div>
      {icon && <div class={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneCls}`}>{icon}</div>}
    </div>
  );
  return href ? (
    <a href={href} class="block">
      {body}
    </a>
  ) : (
    body
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ComponentChildren; title: string; description?: string; action?: ComponentChildren }) {
  return (
    <div class="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon && <div class="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-subtle">{icon}</div>}
      <p class="font-medium text-text">{title}</p>
      {description && <p class="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div class="mt-2">{action}</div>}
    </div>
  );
}

export function Stepper({ steps, current, onStep }: { steps: string[]; current: number; onStep?: (i: number) => void }) {
  return (
    <ol class="flex items-center gap-2" aria-label="Langkah">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} class="flex flex-1 items-center gap-2" aria-current={active ? 'step' : undefined}>
            <button
              type="button"
              disabled={!onStep || i > current}
              onClick={() => onStep?.(i)}
              class="flex items-center gap-2 text-left disabled:cursor-default"
            >
              <span
                class={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  done ? 'bg-primary text-white' : active ? 'bg-primary-soft text-primary-strong ring-2 ring-primary' : 'bg-surface-2 text-muted'
                }`}
              >
                {done ? <Check size={16} /> : i + 1}
              </span>
              <span class={`hidden text-sm font-medium sm:block ${active ? 'text-text' : 'text-muted'}`}>{s}</span>
            </button>
            {i < steps.length - 1 && <span class={`h-0.5 flex-1 rounded ${done ? 'bg-primary' : 'bg-border'}`} />}
          </li>
        );
      })}
    </ol>
  );
}

const AVATAR_TONES = ['bg-primary-soft text-primary-strong', 'bg-info-soft text-info-strong', 'bg-success-soft text-success-strong', 'bg-warning-soft text-warning-strong', 'bg-surface-2 text-ink'];

export function Avatar({ name, size = 36, class: cls = '' }: { name: string; size?: number; class?: string }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return (
    <span
      class={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length]} ${cls}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function Card({ title, actions, children, class: cls = '', bodyClass = 'card-pad' }: { title?: ComponentChildren; actions?: ComponentChildren; children: ComponentChildren; class?: string; bodyClass?: string }) {
  return (
    <section class={`card ${cls}`}>
      {(title || actions) && (
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
          {title && <h2 class="text-base font-semibold text-text">{title}</h2>}
          {actions && <div class="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div class={bodyClass}>{children}</div>
    </section>
  );
}

export function KV({ items, cols = 2 }: { items: [ComponentChildren, ComponentChildren][]; cols?: 1 | 2 | 3 }) {
  const colCls = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }[cols];
  return (
    <dl class={`grid grid-cols-1 gap-x-6 gap-y-3 ${colCls}`}>
      {items.map(([k, v], i) => (
        <div key={i} class="min-w-0">
          <dt class="text-xs font-medium tracking-wide text-subtle uppercase">{k}</dt>
          <dd class="mt-0.5 text-sm break-words text-text">{v || '-'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Skeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div class="space-y-3" aria-busy="true" aria-label="Memuat">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} class="skeleton h-5" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat data">
      <div class="skeleton mb-2 h-8 w-64" />
      <div class="skeleton mb-6 h-4 w-96 max-w-full" />
      <div class="card card-pad">
        <Skeleton lines={6} />
      </div>
    </div>
  );
}

export function NotFound({ what, back }: { what: string; back: { href: string; label: string } }) {
  return (
    <div class="card">
      <EmptyState title={`${what} tidak ditemukan`} description="Data mungkin sudah dihapus atau tautan tidak valid. Periksa kembali atau kembali ke daftar." action={<a href={back.href} class="btn btn-secondary">{back.label}</a>} />
    </div>
  );
}
