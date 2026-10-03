import { daysBetween, todayStr } from './date';
import type { Batch, Medicine } from './types';

export const totalStock = (m: Pick<Medicine, 'batches'>) => m.batches.reduce((a, b) => a + b.qty, 0);

export function nearestExpiry(m: Pick<Medicine, 'batches'>): string | undefined {
  return m.batches
    .filter((b) => b.qty > 0)
    .map((b) => b.expiry)
    .sort()[0];
}

export type StockStatus = 'AMAN' | 'MENIPIS' | 'HABIS' | 'HAMPIR_ED';
export const STOCK_STATUS = {
  AMAN: { label: 'Aman', tone: 'success' },
  MENIPIS: { label: 'Menipis', tone: 'warning' },
  HABIS: { label: 'Habis', tone: 'danger' },
  HAMPIR_ED: { label: 'Hampir ED', tone: 'warning' },
} as const;

export const NEAR_EXPIRY_DAYS = 90;

export function stockStatus(m: Medicine, today = todayStr()): StockStatus {
  const total = totalStock(m);
  if (total <= 0) return 'HABIS';
  const ed = nearestExpiry(m);
  if (ed && daysBetween(today, ed) <= NEAR_EXPIRY_DAYS) return 'HAMPIR_ED';
  if (total < m.minStock) return 'MENIPIS';
  return 'AMAN';
}

/**
 * First-Expired-First-Out deduction. Returns new batches and the per-batch quantities taken.
 * Throws when stock is insufficient.
 */
export function fefoDeduct(batches: Batch[], qty: number): { batches: Batch[]; taken: { batchNo: string; qty: number }[] } {
  const available = batches.reduce((a, b) => a + b.qty, 0);
  if (qty > available) throw new Error(`Stok tidak mencukupi (tersedia ${available}, diminta ${qty})`);
  const order = [...batches].map((b, i) => ({ ...b, i })).sort((a, b) => a.expiry.localeCompare(b.expiry));
  let left = qty;
  const taken: { batchNo: string; qty: number }[] = [];
  const next = batches.map((b) => ({ ...b }));
  for (const b of order) {
    if (left <= 0) break;
    if (b.qty <= 0) continue;
    const take = Math.min(b.qty, left);
    next[b.i].qty -= take;
    left -= take;
    taken.push({ batchNo: b.batchNo, qty: take });
  }
  return { batches: next, taken };
}

/** Allergy check: does any patient allergy match the medicine name, generic name, or allergy tags? */
export function allergyMatch(allergies: string[], m: Pick<Medicine, 'name' | 'genericName' | 'allergyTags'>): string | undefined {
  const hay = [m.name, m.genericName ?? '', ...m.allergyTags].map((s) => s.toLowerCase()).filter((s) => s.length > 2);
  return allergies.find((a) => {
    const k = a.toLowerCase().trim();
    return k.length > 2 && hay.some((h) => h.includes(k) || k.includes(h));
  });
}

/** Quantity for a prescription line: per-dose count x frequency x days (liquids/topicals: 1 unit). */
export function rxQty(m: Pick<Medicine, 'form'>, frequency: string, days: number): number {
  if (['SIRUP', 'SALEP', 'TETES'].includes(m.form)) return 1;
  const match = /^(\d+)\s*x\s*(\d+)/i.exec(frequency);
  if (!match) return Math.max(days, 1);
  return Number(match[1]) * Number(match[2]) * Math.max(days, 1);
}
