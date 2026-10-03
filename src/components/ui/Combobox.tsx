import type { ComponentChildren } from 'preact';
import { useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import { Search } from 'lucide-preact';

interface Props<T> {
  items: T[];
  filter: (item: T, q: string) => boolean;
  renderItem: (item: T) => ComponentChildren;
  itemKey: (item: T) => string;
  onSelect: (item: T) => void;
  placeholder?: string;
  label?: string;
  limit?: number;
  autoFocus?: boolean;
  emptyText?: string;
  clearOnSelect?: boolean;
  isDisabled?: (item: T) => boolean;
}

/** Searchable list with keyboard navigation (ArrowUp/Down, Enter, Esc). */
export function Combobox<T>({ items, filter, renderItem, itemKey, onSelect, placeholder = 'Cari...', label, limit = 8, autoFocus, emptyText = 'Tidak ditemukan', clearOnSelect = true, isDisabled }: Props<T>) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const wrap = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items.slice(0, limit);
    return items.filter((i) => filter(i, term)).slice(0, limit);
  }, [q, items, limit]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const choose = (item: T) => {
    if (isDisabled?.(item)) return;
    onSelect(item);
    if (clearOnSelect) setQ('');
    setOpen(false);
  };

  return (
    <div class="relative" ref={wrap}>
      {label && (
        <label for={`cb-${id}`} class="field-label">
          {label}
        </label>
      )}
      <div class="relative">
        <Search size={16} class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle" />
        <input
          id={`cb-${id}`}
          class="input pl-9"
          role="combobox"
          aria-expanded={open}
          aria-controls={`cb-list-${id}`}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `cb-${id}-${active}` : undefined}
          placeholder={placeholder}
          value={q}
          autoFocus={autoFocus}
          data-autofocus={autoFocus ? '' : undefined}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onInput={(e) => {
            setQ((e.target as HTMLInputElement).value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter' && open && results[active]) {
              e.preventDefault();
              choose(results[active]);
            } else if (e.key === 'Escape' && open) {
              e.stopPropagation();
              setOpen(false);
            }
          }}
        />
      </div>
      {open && (
        <ul id={`cb-list-${id}`} role="listbox" class="absolute z-40 mt-1 max-h-72 w-full overflow-auto rounded-[var(--radius-field)] border border-border bg-white py-1 shadow-lift">
          {results.length === 0 && <li class="px-3 py-2 text-sm text-muted">{emptyText}</li>}
          {results.map((item, i) => {
            const disabled = isDisabled?.(item);
            return (
              <li
                key={itemKey(item)}
                id={`cb-${id}-${i}`}
                role="option"
                aria-selected={i === active}
                aria-disabled={disabled}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(item);
                }}
                class={`px-3 py-2 text-sm ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${i === active ? 'bg-primary-soft' : ''}`}
              >
                {renderItem(item)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
