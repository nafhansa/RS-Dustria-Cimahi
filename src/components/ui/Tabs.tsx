import type { ComponentChildren } from 'preact';

export interface TabItem<K extends string> {
  key: K;
  label: ComponentChildren;
  count?: number;
  disabled?: boolean;
}

/** Underlined tab list (ARIA tabs pattern with arrow-key navigation). */
export function Tabs<K extends string>({ tabs, value, onChange, class: cls = '' }: { tabs: TabItem<K>[]; value: K; onChange: (k: K) => void; class?: string }) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const enabled = tabs.filter((t) => !t.disabled);
    const i = enabled.findIndex((t) => t.key === value);
    const next = enabled[(i + (e.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length];
    onChange(next.key);
    setTimeout(() => (document.querySelector(`[data-tab="${next.key}"]`) as HTMLElement | null)?.focus());
  };
  return (
    <div role="tablist" class={`flex gap-1 overflow-x-auto border-b border-border ${cls}`} onKeyDown={onKey}>
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            data-tab={t.key}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={t.disabled}
            onClick={() => onChange(t.key)}
            class={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition ${
              active ? 'border-primary text-primary-strong' : 'border-transparent text-muted hover:border-border hover:text-text'
            } disabled:opacity-40`}
          >
            {t.label}
            {t.count !== undefined && (
              <span class={`tabular rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${active ? 'bg-primary text-white' : 'bg-surface-2 text-muted'}`}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
