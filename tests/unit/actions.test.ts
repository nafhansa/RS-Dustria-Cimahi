import { beforeEach, describe, expect, it } from 'vitest';
import { setPersistentEngine } from '@nanostores/persistent';
import { invoiceTotals } from '../../src/lib/billing';
import { totalStock } from '../../src/lib/stock';
import patients from '../../src/data/seed/patients.json';
import doctors from '../../src/data/seed/doctors.json';
import polis from '../../src/data/seed/polyclinics.json';
import schedules from '../../src/data/seed/schedules.json';
import appointments from '../../src/data/seed/appointments.json';
import visits from '../../src/data/seed/visits.json';
import medicalRecords from '../../src/data/seed/medical-records.json';
import procedureMaster from '../../src/data/seed/procedures.json';
import procedureActions from '../../src/data/seed/procedure-actions.json';
import medicines from '../../src/data/seed/medicines.json';
import stockMovements from '../../src/data/seed/stock-movements.json';
import prescriptions from '../../src/data/seed/prescriptions.json';
import invoices from '../../src/data/seed/invoices.json';
import payments from '../../src/data/seed/payments.json';
import insurers from '../../src/data/seed/insurers.json';
import users from '../../src/data/seed/users.json';
import auditLog from '../../src/data/seed/audit-log.json';

const memory: Record<string, string> = {};
setPersistentEngine(memory, { addEventListener() {}, removeEventListener() {} });

const db = await import('../../src/stores/db');
const { login } = await import('../../src/stores/session');
const A = await import('../../src/stores/actions');

const seed = { patients, doctors, polis, schedules, appointments, visits, medicalRecords, procedureMaster, procedureActions, medicines, stockMovements, prescriptions, invoices, payments, insurers, users, auditLog } as unknown as Record<string, unknown[]>;

const umumPatient = () => db.$patients.get().find((p) => p.payer.type === 'UMUM')!;
const bpjsPatient = () => db.$patients.get().find((p) => p.payer.type === 'BPJS')!;
const register = (patientId: string, poliId = 'POL-A', doctorId = 'D01') => {
  const p = db.$patients.get().find((x) => x.id === patientId)!;
  return A.registerVisit({ patientId, poliId, doctorId, type: 'RAJAL', source: 'WALKIN', payer: p.payer, sepNo: p.payer.type === 'BPJS' ? '0301R00100000000001' : undefined });
};
const invoiceOf = (visitId: string) => db.$invoices.get().find((i) => i.visitId === visitId)!;

beforeEach(() => {
  db.loadSeed(seed);
  login('SUPERADMIN');
  // make sure the test patients have no visit today
  const today = new Date().toISOString().slice(0, 10);
  db.$visits.set(db.$visits.get().filter((v) => !v.registeredAt.startsWith(today)));
});

describe('registerVisit', () => {
  it('creates a waiting visit, queue number and a draft invoice with admin + consultation', () => {
    const p = umumPatient();
    const v = register(p.id);
    expect(v.status).toBe('MENUNGGU');
    expect(v.queueNo).toBe('A-001');
    expect(v.regNo).toMatch(/^REG-\d{6}-\d{4}$/);
    const inv = invoiceOf(v.id);
    expect(inv.status).toBe('DRAFT');
    expect(inv.items.map((i) => i.category)).toEqual(['ADMIN', 'DOKTER']);
    expect(register(bpjsPatient().id).queueNo).toBe('A-002');
    expect(db.$auditLog.get()[0].action).toBe('Mendaftarkan kunjungan');
  });
  it('rejects a duplicate active registration in the same poli', () => {
    const p = umumPatient();
    register(p.id);
    expect(() => register(p.id)).toThrow(/sudah terdaftar/);
  });
  it('cancels only before examination and voids the invoice', () => {
    const v = register(umumPatient().id);
    A.cancelVisit(v.id, 'Pasien pulang');
    expect(db.$visits.get().find((x) => x.id === v.id)!.status).toBe('BATAL');
    expect(invoiceOf(v.id).status).toBe('BATAL');
    const v2 = register(bpjsPatient().id);
    A.startExam(v2.id);
    expect(() => A.cancelVisit(v2.id, 'x')).toThrow();
  });
});

describe('end-to-end service flow (umum)', () => {
  it('exam -> procedure -> e-resep -> pharmacy FEFO -> cashier -> paid', () => {
    const p = umumPatient();
    const v = register(p.id);
    A.callVisit(v.id);
    expect(db.$lastCall.get()?.visitId).toBe(v.id);
    const mr = A.startExam(v.id);
    A.saveVitals(mr.id, { sys: 150, dia: 95, pulse: 80, temp: 36.6, weight: 70, height: 170 });
    expect(db.$medicalRecords.get().find((m) => m.id === mr.id)!.vitals!.bmi).toBe(24.2);

    A.addProcedure(v.id, 'PRC-EKG', 1, 'D01');
    expect(invoiceOf(v.id).items.some((i) => i.category === 'TINDAKAN' && i.name === 'Pemeriksaan EKG')).toBe(true);

    const amlo = db.$medicines.get().find((m) => m.id === 'M004')!;
    const before = totalStock(amlo);
    A.submitPrescription(v.id, [{ medicineId: 'M004', dose: '5 mg', frequency: '1x1', route: 'Oral', durationDays: 30, qty: 30, instruction: 'Sesudah makan' }]);
    expect(() => A.completeExam(mr.id)).toThrow(/diagnosa/);
    A.saveMRDraft(mr.id, { soap: { s: 'Pusing', o: 'TD 150/95', a: 'Hipertensi', p: 'Amlodipine' }, diagnoses: [{ code: 'I10', name: 'Hipertensi esensial', type: 'PRIMER' }] });
    const done = A.completeExam(mr.id);
    expect(done.next).toBe('FARMASI');
    expect(db.$medicalRecords.get().find((m) => m.id === mr.id)!.status).toBe('FINAL');
    expect(() => A.saveMRDraft(mr.id, { soap: { s: 'x', o: '', a: 'x', p: 'x' } })).toThrow(/terkunci/);
    A.addAddendum(mr.id, 'Hasil EKG normal');

    const rx = db.$prescriptions.get().find((r) => r.visitId === v.id)!;
    expect(rx.status).toBe('BARU');
    expect(() => A.prepareRx(rx.id)).toThrow(/ditelaah/);
    expect(() => A.reviewRx(rx.id, { admin: true, pharmaceutical: false, clinical: true })).toThrow();
    A.reviewRx(rx.id, { admin: true, pharmaceutical: true, clinical: true });
    A.prepareRx(rx.id);
    const after = db.$medicines.get().find((m) => m.id === 'M004')!;
    expect(totalStock(after)).toBe(before - 30);
    const earliest = [...amlo.batches].sort((a, b) => a.expiry.localeCompare(b.expiry))[0];
    const outMoves = db.$stockMovements.get().filter((s) => s.ref === rx.rxNo);
    expect(outMoves[0].batchNo).toBe(earliest.batchNo);
    expect(invoiceOf(v.id).items.some((i) => i.category === 'OBAT')).toBe(true);

    A.markRxReady(rx.id);
    const ho = A.handoverRx(rx.id, p.name);
    expect(ho.next).toBe('KASIR');
    const inv = invoiceOf(v.id);
    expect(inv.status).toBe('BELUM_BAYAR');

    const t = invoiceTotals(inv, db.$payments.get());
    expect(() => A.applyDiscount(inv.id, 1000, 'x', '0000')).toThrow(/PIN/);
    // split payment: cash + debit
    const cash = 50000;
    const pay = A.pay(inv.id, { methods: [{ type: 'TUNAI', amount: cash }, { type: 'DEBIT', amount: t.remaining - cash, bank: 'BCA', ref: '123456' }], cashReceived: 100000 });
    expect(pay.change).toBe(50000);
    expect(invoiceOf(v.id).status).toBe('LUNAS');
    expect(db.$visits.get().find((x) => x.id === v.id)!.status).toBe('SELESAI');
    expect(pay.receiptNo).toMatch(/^KW-\d{6}-\d{4}$/);
  });
});

describe('BPJS and IGD scenarios', () => {
  it('BPJS visit without prescription is fully covered and auto-settled', () => {
    const v = register(bpjsPatient().id);
    const mr = A.startExam(v.id);
    A.saveMRDraft(mr.id, { soap: { s: 'Kontrol', o: '-', a: 'DM', p: 'Lanjut' }, diagnoses: [{ code: 'E11.9', name: 'DM tipe 2', type: 'PRIMER' }] });
    const res = A.completeExam(mr.id);
    expect(res.next).toBe('SELESAI');
    expect(invoiceOf(v.id).status).toBe('LUNAS');
    expect(invoiceTotals(invoiceOf(v.id)).due).toBe(0);
  });
  it('partial payment keeps status SEBAGIAN', () => {
    const v = register(umumPatient().id);
    const mr = A.startExam(v.id);
    A.saveMRDraft(mr.id, { soap: { s: 'a', o: '', a: 'b', p: 'c' }, diagnoses: [{ code: 'J06.9', name: 'ISPA', type: 'PRIMER' }] });
    expect(A.completeExam(mr.id).next).toBe('KASIR');
    const inv = invoiceOf(v.id);
    A.pay(inv.id, { methods: [{ type: 'QRIS', amount: 10000, ref: 'QR1' }] });
    expect(invoiceOf(v.id).status).toBe('SEBAGIAN');
  });
  it('out-of-stock medicine requires substitution', () => {
    const v = register(umumPatient().id);
    A.startExam(v.id);
    const rx = A.submitPrescription(v.id, [{ medicineId: 'M002', dose: '500 mg', frequency: '3x1', route: 'Oral', durationDays: 5, qty: 15, instruction: 'Sesudah makan' }]);
    A.reviewRx(rx.id, { admin: true, pharmaceutical: true, clinical: true });
    expect(() => A.prepareRx(rx.id)).toThrow(/Stok/);
    A.updateRxItems(rx.id, [{ ...rx.items[0], substituteId: 'M003' }]);
    A.prepareRx(rx.id);
    expect(invoiceOf(v.id).items.find((i) => i.category === 'OBAT')!.name).toBe('Amoxa-D 500 mg');
  });
});

describe('appointments', () => {
  it('check-in creates a patient when NIK is new and registers the visit', () => {
    const appt = db.$appointments.get().find((a) => a.status === 'BOOKED' && !db.$patients.get().some((p) => p.nik === a.nik))!;
    const count = db.$patients.get().length;
    const v = A.checkInAppointment(appt.id);
    expect(db.$patients.get().length).toBe(count + 1);
    expect(v.source).toBe('BOOKING');
    expect(db.$appointments.get().find((a) => a.id === appt.id)!.status).toBe('CHECKED_IN');
  });
});

describe('stock receiving and adjustment', () => {
  it('adds batches and records movements', () => {
    const before = totalStock(db.$medicines.get().find((m) => m.id === 'M002')!);
    A.receiveGoods({ supplier: 'PBF Test', invoiceRef: 'F-1', date: '2026-10-03', lines: [{ medicineId: 'M002', batchNo: 'NEW1', expiry: '2099-01-01', qty: 100, buyPrice: 900 }] });
    expect(totalStock(db.$medicines.get().find((m) => m.id === 'M002')!)).toBe(before + 100);
    A.adjustStock('M002', -10, 'Rusak');
    expect(totalStock(db.$medicines.get().find((m) => m.id === 'M002')!)).toBe(before + 90);
  });
});
