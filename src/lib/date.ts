const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** Local date as YYYY-MM-DD. */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local datetime as YYYY-MM-DDTHH:mm:ss (no timezone suffix, parsed as local time). */
export function toLocalISO(d: Date): string {
  return `${toDateStr(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export const nowISO = () => toLocalISO(new Date());
export const todayStr = () => toDateStr(new Date());

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** YYMMDD used in document numbers. */
export function yymmdd(d: Date = new Date()): string {
  return `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

export const isSameDay = (iso: string | undefined, day: string = todayStr()) => !!iso && iso.slice(0, 10) === day;

export function daysBetween(a: string, b: string): number {
  const da = new Date(a.slice(0, 10) + 'T00:00:00');
  const db = new Date(b.slice(0, 10) + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

const TOKEN_FULL = /^@(-?\d+)(?:T(\d\d):(\d\d))?$/;
const TOKEN_INLINE = /\{@(-?\d+)\}/g;

/** Resolve relative seed date tokens ("@-3", "@-3T09:30", "{@-3}") against `base`. */
export function hydrateDates<T>(value: T, base: Date = new Date()): T {
  if (typeof value === 'string') {
    const m = TOKEN_FULL.exec(value);
    if (m) {
      const d = addDays(base, Number(m[1]));
      if (m[2] === undefined) return toDateStr(d) as T;
      d.setHours(Number(m[2]), Number(m[3]), 0, 0);
      return toLocalISO(d) as T;
    }
    if (value.includes('{@')) return value.replace(TOKEN_INLINE, (_, n) => yymmdd(addDays(base, Number(n)))) as T;
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => hydrateDates(v, base)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = hydrateDates(v, base);
    return out as T;
  }
  return value;
}
