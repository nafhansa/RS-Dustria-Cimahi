import { describe, expect, it } from 'vitest';
import { allergyMatch, fefoDeduct, rxQty, stockStatus, totalStock } from '../../src/lib/stock';
import { coverageFor, invoiceTotals, statusAfterPayment } from '../../src/lib/billing';
import type { Invoice, Medicine } from '../../src/lib/types';

const batches = [
  { batchNo: 'LATE', expiry: '2027-12-01', qty: 50, buyPrice: 100 },
  { batchNo: 'EARLY', expiry: '2026-12-01', qty: 10, buyPrice: 100 },
  { batchNo: 'MID', expiry: '2027-03-01', qty: 20, buyPrice: 100 },
];

describe('FEFO', () => {
  it('takes from the earliest expiry first and spans batches', () => {
    const r = fefoDeduct(batches, 25);
    expect(r.taken).toEqual([
      { batchNo: 'EARLY', qty: 10 },
      { batchNo: 'MID', qty: 15 },
    ]);
    expect(r.batches.find((b) => b.batchNo === 'EARLY')!.qty).toBe(0);
    expect(r.batches.find((b) => b.batchNo === 'MID')!.qty).toBe(5);
    expect(r.batches.find((b) => b.batchNo === 'LATE')!.qty).toBe(50);
  });
  it('does not mutate input', () => {
    fefoDeduct(batches, 5);
    expect(batches[1].qty).toBe(10);
  });
  it('throws when stock is insufficient', () => {
    expect(() => fefoDeduct(batches, 81)).toThrow(/tidak mencukupi/);
  });
});

describe('stock helpers', () => {
  const med: Medicine = { id: 'M', code: 'X', name: 'Amoxicillin 500 mg', genericName: 'Amoxicillin', category: 'GENERIK', form: 'KAPSUL', unit: 'kapsul', sellPrice: 1000, minStock: 100, allergyTags: ['penisilin'], batches };
  it('status', () => {
    expect(totalStock(med)).toBe(80);
    expect(stockStatus(med, '2026-01-01')).toBe('MENIPIS');
    expect(stockStatus({ ...med, batches: [] }, '2026-01-01')).toBe('HABIS');
    expect(stockStatus(med, '2026-11-15')).toBe('HAMPIR_ED');
    expect(stockStatus({ ...med, minStock: 10 }, '2026-01-01')).toBe('AMAN');
  });
  it('allergy matching by tag and name', () => {
    expect(allergyMatch(['Penisilin'], med)).toBe('Penisilin');
    expect(allergyMatch(['Seafood'], med)).toBeUndefined();
    expect(allergyMatch(['amoxicillin'], { ...med, allergyTags: [] })).toBe('amoxicillin');
  });
  it('prescription quantity', () => {
    expect(rxQty({ form: 'TABLET' }, '3x1', 5)).toBe(15);
    expect(rxQty({ form: 'TABLET' }, '1x1', 30)).toBe(30);
    expect(rxQty({ form: 'SIRUP' }, '3x1', 5)).toBe(1);
  });
});

describe('billing', () => {
  const insurers = [{ id: 'INS-SS', name: 'Asuransi', type: 'ASURANSI' as const, coveragePct: 80 }];
  it('coverage by payer', () => {
    expect(coverageFor({ type: 'UMUM' }, insurers, 100000)).toBe(0);
    expect(coverageFor({ type: 'BPJS' }, insurers, 100000)).toBe(100000);
    expect(coverageFor({ type: 'ASURANSI', insurerId: 'INS-SS' }, insurers, 100000)).toBe(80000);
  });
  it('totals with discount and payments', () => {
    const inv: Invoice = {
      id: 'I1',
      invoiceNo: 'INV',
      visitId: 'V',
      patientId: 'P',
      status: 'BELUM_BAYAR',
      createdAt: '',
      discount: { amount: 20000, reason: 'x', approvedBy: 'u' },
      items: [
        { id: 'a', category: 'ADMIN', name: 'Adm', qty: 1, price: 25000, coveredByPayer: 0 },
        { id: 'b', category: 'OBAT', name: 'Obat', qty: 10, price: 5000, coveredByPayer: 10000 },
      ],
    };
    const t = invoiceTotals(inv, [{ id: 'p', invoiceId: 'I1', receiptNo: 'KW', methods: [{ type: 'TUNAI', amount: 20000 }], cashierId: 'u', at: '' }]);
    expect(t).toEqual({ subtotal: 75000, covered: 10000, discount: 20000, due: 45000, paid: 20000, remaining: 25000 });
    expect(statusAfterPayment(t)).toBe('SEBAGIAN');
    expect(statusAfterPayment({ ...t, paid: 45000 })).toBe('LUNAS');
  });
  it('discount never exceeds patient portion', () => {
    const inv: Invoice = { id: 'I', invoiceNo: '', visitId: '', patientId: '', status: 'BELUM_BAYAR', createdAt: '', discount: { amount: 999999, reason: '', approvedBy: '' }, items: [{ id: 'a', category: 'ADMIN', name: 'x', qty: 1, price: 1000, coveredByPayer: 0 }] };
    expect(invoiceTotals(inv).due).toBe(0);
  });
});
