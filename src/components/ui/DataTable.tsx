import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-preact';

export interface Column<T> {
  key: string;
  header: ComponentChildren;
  render: (row: T, index: number) => ComponentChildren;
  sort?: (row: T) => string | number;
  class?: string;
  headerClass?: string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  pageSizes?: number[];
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  empty?: { title: string; description?: string; action?: ComponentChildren };
  onRowClick?: (row: T) => void;
  dense?: boolean;
  caption?: string;
}

/** Client-side table with sort, pagination (10/25/50), skeleton and empty state. */
export function DataTable<T>({ columns, rows, rowKey, loading, pageSizes = [10, 25, 50], initialSort, empty, onRowClick, caption }: Props<T>) {
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSizes[0]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sort) return rows;
    const get = col.sort;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'id')) * dir;
    });
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / size));
  useEffect(() => {
    if (page > pages) setPage(1);
  }, [pages]);
  const visible = sorted.slice((page - 1) * size, page * size);

  const toggleSort = (key: string) => {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  return (
    <div>
      <div class="overflow-x-auto">
        <table class="table">
          {caption && <caption class="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} class={c.headerClass} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.sort ? (
                    <button type="button" class="inline-flex items-center gap-1 uppercase hover:text-text" onClick={() => toggleSort(c.key)}>
                      {c.header}
                      {sort?.key === c.key ? sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : <ArrowUpDown size={12} class="opacity-40" />}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }, (_, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <td key={c.key}>
                        <div class="skeleton h-4 w-full max-w-[140px]" />
                      </td>
                    ))}
                  </tr>
                ))
              : visible.map((r, i) => (
                  <tr key={rowKey(r)} class={onRowClick ? 'cursor-pointer' : undefined} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                    {columns.map((c) => (
                      <td key={c.key} class={c.class}>
                        {c.render(r, (page - 1) * size + i)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && (
          <div class="flex flex-col items-center justify-center gap-2 border-t border-border px-6 py-12 text-center">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-subtle">
              <Inbox size={22} />
            </div>
            <p class="font-medium text-text">{empty?.title ?? 'Belum ada data'}</p>
            {empty?.description && <p class="max-w-sm text-sm text-muted">{empty.description}</p>}
            {empty?.action}
          </div>
        )}
      </div>
      {!loading && rows.length > 0 && (
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2.5 text-sm text-muted">
          <div class="flex items-center gap-2">
            <label for="page-size">Tampilkan</label>
            <select
              id="page-size"
              class="input w-auto py-1 pr-8 text-xs"
              value={size}
              onChange={(e) => {
                setSize(Number((e.target as HTMLSelectElement).value));
                setPage(1);
              }}
            >
              {pageSizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span class="tabular">
              {(page - 1) * size + 1}-{Math.min(page * size, rows.length)} dari {rows.length}
            </span>
          </div>
          <nav class="flex items-center gap-1" aria-label="Paginasi">
            <button type="button" class="btn-icon h-8 w-8" disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Halaman sebelumnya">
              <ChevronLeft size={16} />
            </button>
            <span class="tabular px-2">
              {page} / {pages}
            </span>
            <button type="button" class="btn-icon h-8 w-8" disabled={page === pages} onClick={() => setPage(page + 1)} aria-label="Halaman berikutnya">
              <ChevronRight size={16} />
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
