import type { Insurer, Invoice, Payer, Payment } from './types';

/** Portion of `amount` covered by the payer (BPJS: full package, insurance: coverage %, umum: 0). */
export function coverageFor(payer: Payer, insurers: Insurer[], amount: number): number {
  if (payer.type === 'BPJS') return amount;
  if (payer.type === 'ASURANSI') {
    const pct = insurers.find((i) => i.id === payer.insurerId)?.coveragePct ?? 0;
    return Math.round((amount * pct) / 100);
  }
  return 0;
}

export interface InvoiceTotals {
  subtotal: number;
  covered: number;
  discount: number;
  due: number;
  paid: number;
  remaining: number;
}

export function invoiceTotals(inv: Invoice, payments: Payment[] = []): InvoiceTotals {
  const subtotal = inv.items.reduce((a, it) => a + it.qty * it.price, 0);
  const covered = inv.items.reduce((a, it) => a + it.coveredByPayer, 0);
  const discount = Math.min(inv.discount?.amount ?? 0, Math.max(subtotal - covered, 0));
  const due = Math.max(subtotal - covered - discount, 0);
  const paid = payments.filter((p) => p.invoiceId === inv.id).reduce((a, p) => a + p.methods.reduce((s, m) => s + m.amount, 0), 0);
  return { subtotal, covered, discount, due, paid, remaining: Math.max(due - paid, 0) };
}

/** Invoice status after a payment is applied. */
export function statusAfterPayment(totals: InvoiceTotals): 'LUNAS' | 'SEBAGIAN' | 'BELUM_BAYAR' {
  if (totals.paid >= totals.due) return 'LUNAS';
  if (totals.paid > 0) return 'SEBAGIAN';
  return 'BELUM_BAYAR';
}
