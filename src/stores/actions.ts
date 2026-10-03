/**
 * All data mutations go through here so side effects stay consistent:
 * registering a visit creates a draft invoice, procedures and dispensed drugs
 * become invoice items, payments close visits, and every action is audited.
 */
import type { WritableAtom } from 'nanostores';
import { coverageFor, invoiceTotals, statusAfterPayment } from '../lib/billing';
import { DISCOUNT_PIN, ROLE_USER } from '../lib/constants';
import { isSameDay, nowISO, todayStr } from '../lib/date';
import { nextDailyNo, nextMrn, nextQueueNo, uid } from '../lib/id';
import { fefoDeduct, totalStock } from '../lib/stock';
import type {
  Appointment,
  AuditEntry,
  Batch,
  Diagnosis,
  Doctor,
  Insurer,
  Invoice,
  InvoiceItem,
  MedicalRecord,
  Medicine,
  Patient,
  Payer,
  Payment,
  PayMethod,
  Poli,
  Prescription,
  ProcedureMaster,
  RxItem,
  Schedule,
  Settings,
  ShiftClose,
  StockMovement,
  User,
  Visit,
  Vitals,
} from '../lib/types';
import {
  $appointments,
  $auditLog,
  $doctors,
  $insurers,
  $invoices,
  $lastCall,
  $medicalRecords,
  $medicines,
  $patients,
  $payments,
  $polis,
  $prescriptions,
  $procedureActions,
  $procedureMaster,
  $receipts,
  $schedules,
  $settings,
  $shifts,
  $stockMovements,
  $users,
  $visits,
} from './db';
import { $session } from './session';

// ---------- helpers ----------
export class ActionError extends Error {}
const fail = (msg: string): never => {
  throw new ActionError(msg);
};

function actor(): { userId: string; role: string } {
  const s = $session.get();
  return s ? { userId: s.userId, role: s.role } : { userId: ROLE_USER.SUPERADMIN, role: 'SUPERADMIN' };
}

export function audit(action: string, entity: string, entityId: string, detail?: string): void {
  const { userId, role } = actor();
  const entry: AuditEntry = { id: uid('AU'), at: nowISO(), userId, role, action, entity, entityId, detail };
  $auditLog.set([entry, ...$auditLog.get()].slice(0, 3000));
}

function patch<T extends { id: string }>(store: WritableAtom<T[]>, id: string, fn: (item: T) => NoInfer<T>): T {
  let updated: T | undefined;
  store.set(
    store.get().map((it) => {
      if (it.id !== id) return it;
      updated = fn(it);
      return updated;
    }),
  );
  if (!updated) fail('Data tidak ditemukan');
  return updated!;
}

const byId = <T extends { id: string }>(store: WritableAtom<T[]>, id: string): T | undefined => store.get().find((x) => x.id === id);
const mustGet = <T extends { id: string }>(store: WritableAtom<T[]>, id: string, label: string): T =>
  byId(store, id) ?? fail(`${label} tidak ditemukan`);

const patientName = (id: string) => byId($patients, id)?.name ?? id;

// ---------- patients ----------
export type PatientInput = Omit<Patient, 'id' | 'mrn' | 'createdAt' | 'updatedAt'>;

export function findPatientByNik(nik: string, exceptId?: string): Patient | undefined {
  return $patients.get().find((p) => p.nik === nik && p.id !== exceptId);
}

export function createPatient(input: PatientInput): Patient {
  const dup = findPatientByNik(input.nik);
  if (dup) fail(`NIK sudah terdaftar atas nama ${dup.name} (${dup.mrn})`);
  const now = nowISO();
  const p: Patient = { ...input, id: uid('P'), mrn: nextMrn($patients.get().map((x) => x.mrn)), createdAt: now, updatedAt: now };
  $patients.set([p, ...$patients.get()]);
  audit('Membuat pasien baru', 'Pasien', p.mrn, p.name);
  return p;
}

export function updatePatient(id: string, input: Partial<PatientInput>): Patient {
  if (input.nik) {
    const dup = findPatientByNik(input.nik, id);
    if (dup) fail(`NIK sudah dipakai oleh ${dup.name} (${dup.mrn})`);
  }
  const p = patch($patients, id, (x) => ({ ...x, ...input, updatedAt: nowISO() }));
  audit('Memperbarui data pasien', 'Pasien', p.mrn, p.name);
  return p;
}

// ---------- registration & queue ----------
export interface RegisterInput {
  patientId: string;
  poliId: string;
  doctorId: string;
  type: Visit['type'];
  source: Visit['source'];
  referral?: Visit['referral'];
  payer: Payer;
  sepNo?: string;
  appointmentId?: string;
}

function invoiceItem(payer: Payer, insurers: Insurer[], item: Omit<InvoiceItem, 'id' | 'coveredByPayer'>, covered?: number): InvoiceItem {
  return { ...item, id: uid('II'), coveredByPayer: covered ?? coverageFor(payer, insurers, item.qty * item.price) };
}

export function registerVisit(input: RegisterInput): Visit {
  const patient = mustGet($patients, input.patientId, 'Pasien');
  const poli = mustGet($polis, input.poliId, 'Poli');
  const doctor = mustGet($doctors, input.doctorId, 'Dokter');
  const today = todayStr();
  const todays = $visits.get().filter((v) => isSameDay(v.registeredAt, today));
  const active = todays.find((v) => v.patientId === patient.id && v.poliId === poli.id && !['SELESAI', 'BATAL'].includes(v.status));
  if (active) fail(`${patient.name} sudah terdaftar hari ini di ${poli.name} (${active.queueNo})`);

  const now = nowISO();
  const visit: Visit = {
    id: uid('V'),
    regNo: nextDailyNo('REG', $visits.get().map((v) => v.regNo)),
    patientId: patient.id,
    poliId: poli.id,
    doctorId: doctor.id,
    type: input.type,
    source: input.source,
    referral: input.source === 'RUJUKAN' ? input.referral : undefined,
    payer: input.payer,
    sepNo: input.payer.type === 'BPJS' ? input.sepNo : undefined,
    queueNo: nextQueueNo(poli.queuePrefix, todays.filter((v) => v.poliId === poli.id).map((v) => v.queueNo)),
    status: 'MENUNGGU' as const,
    appointmentId: input.appointmentId,
    registeredAt: now,
  };

  const masters = $procedureMaster.get();
  const insurers = $insurers.get();
  const pm = (id: string) => masters.find((m) => m.id === id);
  const items: InvoiceItem[] = [];
  const adm = pm(input.type === 'IGD' ? 'PRC-ADM-IGD' : 'PRC-ADM');
  if (adm) items.push(invoiceItem(input.payer, insurers, { category: 'ADMIN', name: adm.name, qty: 1, price: adm.priceUmum, refId: adm.id }));
  const firstVisit = !$visits.get().some((v) => v.patientId === patient.id && v.status !== 'BATAL');
  const card = pm('PRC-KARTU');
  if (firstVisit && card) items.push(invoiceItem(input.payer, insurers, { category: 'ADMIN', name: card.name, qty: 1, price: card.priceUmum, refId: card.id }));
  const konId =
    input.type === 'IGD' ? 'PRC-KON-IGD' : doctor.name.startsWith('drg.') ? 'PRC-KON-GI' : doctor.specialty.startsWith('Spesialis') ? 'PRC-KON-SP' : 'PRC-KON-UM';
  const kon = pm(konId);
  if (kon)
    items.push(invoiceItem(input.payer, insurers, { category: 'DOKTER', name: `${kon.name} - ${doctor.name}`, qty: 1, price: kon.priceUmum, refId: kon.id }));

  const invoice: Invoice = {
    id: uid('INV'),
    invoiceNo: nextDailyNo('INV', $invoices.get().map((i) => i.invoiceNo)),
    visitId: visit.id,
    patientId: patient.id,
    items,
    status: 'DRAFT' as const,
    createdAt: now,
  };
  $visits.set([visit, ...$visits.get()]);
  $invoices.set([invoice, ...$invoices.get()]);
  audit('Mendaftarkan kunjungan', 'Kunjungan', visit.regNo, `${patient.name} ke ${poli.name} (${visit.queueNo})`);
  return visit;
}

const CANCELLABLE: Visit['status'][] = ['TERDAFTAR', 'MENUNGGU', 'DIPANGGIL'];
export const canCancelVisit = (v: Visit) => CANCELLABLE.includes(v.status);

export function cancelVisit(id: string, reason: string): Visit {
  const v = mustGet($visits, id, 'Kunjungan');
  if (!canCancelVisit(v)) fail('Kunjungan yang sudah diperiksa tidak dapat dibatalkan');
  if (!reason.trim()) fail('Alasan pembatalan wajib diisi');
  const updated = patch($visits, id, (x) => ({ ...x, status: 'BATAL' as const, cancelReason: reason, finishedAt: nowISO() }));
  $invoices.set($invoices.get().map((i) => (i.visitId === id ? { ...i, status: 'BATAL', cancelReason: 'Kunjungan dibatalkan' } : i)));
  audit('Membatalkan kunjungan', 'Kunjungan', v.regNo, reason);
  return updated;
}

export function callVisit(id: string): Visit {
  const v = mustGet($visits, id, 'Kunjungan');
  if (!['MENUNGGU', 'DIPANGGIL'].includes(v.status)) fail('Pasien tidak dalam antrian');
  const at = nowISO();
  const updated = patch($visits, id, (x) => ({ ...x, status: 'DIPANGGIL' as const, calledAt: at, skipped: false }));
  $lastCall.set({ visitId: id, at });
  audit(v.status === 'DIPANGGIL' ? 'Memanggil ulang antrian' : 'Memanggil antrian', 'Antrian', v.queueNo, patientName(v.patientId));
  return updated;
}

export function skipVisit(id: string): Visit {
  const v = mustGet($visits, id, 'Kunjungan');
  if (v.status !== 'DIPANGGIL') fail('Hanya pasien yang dipanggil yang dapat dilewati');
  const updated = patch($visits, id, (x) => ({ ...x, status: 'MENUNGGU' as const, skipped: true }));
  audit('Melewati antrian', 'Antrian', v.queueNo, patientName(v.patientId));
  return updated;
}

export function requeueVisit(id: string): Visit {
  const v = mustGet($visits, id, 'Kunjungan');
  const updated = patch($visits, id, (x) => ({ ...x, status: 'MENUNGGU' as const, skipped: false }));
  audit('Mengembalikan ke antrian', 'Antrian', v.queueNo, patientName(v.patientId));
  return updated;
}

/** Moves visit to DIPERIKSA (if needed) and returns its medical record, creating a draft. */
export function startExam(visitId: string): MedicalRecord {
  const v = mustGet($visits, visitId, 'Kunjungan');
  if (v.status === 'BATAL') fail('Kunjungan sudah dibatalkan');
  if (['MENUNGGU', 'DIPANGGIL', 'TERDAFTAR'].includes(v.status)) {
    patch($visits, visitId, (x) => ({ ...x, status: 'DIPERIKSA' as const, examStartedAt: nowISO(), calledAt: x.calledAt ?? nowISO(), skipped: false }));
    audit('Memulai pemeriksaan', 'Kunjungan', v.regNo, patientName(v.patientId));
  }
  return getOrCreateMR(visitId);
}

export function getOrCreateMR(visitId: string): MedicalRecord {
  const existing = $medicalRecords.get().find((m) => m.visitId === visitId);
  if (existing) return existing;
  const v = mustGet($visits, visitId, 'Kunjungan');
  const mr: MedicalRecord = {
    id: uid('MR'),
    visitId,
    patientId: v.patientId,
    doctorId: v.doctorId,
    soap: { s: '', o: '', a: '', p: '' },
    diagnoses: [],
    procedures: [],
    status: 'DRAFT' as const,
    addenda: [],
    updatedAt: nowISO(),
  };
  $medicalRecords.set([mr, ...$medicalRecords.get()]);
  return mr;
}

// ---------- appointments ----------
export function checkInAppointment(id: string): Visit {
  const a = mustGet($appointments, id, 'Janji temu');
  if (a.status !== 'BOOKED') fail('Janji temu ini sudah diproses');
  let patient = findPatientByNik(a.nik);
  if (!patient) {
    patient = createPatient({
      nik: a.nik,
      name: a.name,
      gender: a.gender ?? (Number(a.nik.slice(6, 8)) > 40 ? 'P' : 'L'),
      birthDate: a.birthDate,
      phone: a.phone,
      nationality: 'WNI',
      address: { street: '-', city: 'Kota Cimahi', province: 'Jawa Barat' },
      payer: a.payerType === 'BPJS' ? { type: 'BPJS', insurerId: 'INS-BPJS' } : { type: a.payerType, insurerId: a.payerType === 'UMUM' ? 'INS-UMUM' : undefined },
      allergies: [],
      notes: `Dibuat otomatis dari booking online ${a.code}`,
    });
  }
  const visit = registerVisit({
    patientId: patient.id,
    poliId: a.poliId,
    doctorId: a.doctorId,
    type: 'RAJAL',
    source: 'BOOKING',
    payer: patient.payer,
    appointmentId: a.id,
  });
  patch($appointments, id, (x) => ({ ...x, status: 'CHECKED_IN' as const, patientId: patient!.id, visitId: visit.id }));
  audit('Check-in booking online', 'Janji Temu', a.code, `${patient.name} -> ${visit.queueNo}`);
  return visit;
}

export function rescheduleAppointment(id: string, date: string, time: string): Appointment {
  const a = mustGet($appointments, id, 'Janji temu');
  if (a.status !== 'BOOKED') fail('Hanya booking aktif yang dapat dijadwal ulang');
  const updated = patch($appointments, id, (x) => ({ ...x, date, time }));
  audit('Menjadwal ulang booking', 'Janji Temu', a.code, `${a.date} ${a.time} -> ${date} ${time}`);
  return updated;
}

export function cancelAppointment(id: string, reason: string): Appointment {
  const a = mustGet($appointments, id, 'Janji temu');
  if (a.status !== 'BOOKED') fail('Booking ini tidak dapat dibatalkan');
  const updated = patch($appointments, id, (x) => ({ ...x, status: 'CANCELLED' as const, cancelReason: reason }));
  audit('Membatalkan booking', 'Janji Temu', a.code, reason);
  return updated;
}

// ---------- medical record ----------
function assertDraft(mr: MedicalRecord) {
  if (mr.status === 'FINAL') fail('Rekam medis sudah ditandatangani dan terkunci. Gunakan addendum.');
}

export function saveVitals(mrId: string, vitals: Omit<Vitals, 'recordedBy' | 'recordedAt'>): MedicalRecord {
  const mr = mustGet($medicalRecords, mrId, 'Rekam medis');
  assertDraft(mr);
  const bmi = vitals.weight && vitals.height ? +(vitals.weight / (vitals.height / 100) ** 2).toFixed(1) : undefined;
  const updated = patch($medicalRecords, mrId, (x) => ({
    ...x,
    vitals: { ...vitals, bmi, recordedBy: actor().userId, recordedAt: nowISO() },
    updatedAt: nowISO(),
  }));
  audit('Mengisi tanda vital', 'Rekam Medis', mustGet($visits, mr.visitId, 'Kunjungan').regNo, patientName(mr.patientId));
  return updated;
}

export function saveMRDraft(mrId: string, data: Partial<Pick<MedicalRecord, 'soap' | 'diagnoses' | 'followUp'>>, silent = false): MedicalRecord {
  const mr = mustGet($medicalRecords, mrId, 'Rekam medis');
  assertDraft(mr);
  const updated = patch($medicalRecords, mrId, (x) => ({ ...x, ...data, updatedAt: nowISO() }));
  if (!silent) audit('Menyimpan draft rekam medis', 'Rekam Medis', mustGet($visits, mr.visitId, 'Kunjungan').regNo, patientName(mr.patientId));
  return updated;
}

export function addProcedure(visitId: string, procedureId: string, qty: number, performerId: string, note?: string) {
  const v = mustGet($visits, visitId, 'Kunjungan');
  if (['BATAL', 'SELESAI'].includes(v.status)) fail('Kunjungan sudah ditutup');
  const pm = mustGet($procedureMaster, procedureId, 'Tindakan');
  if (!pm.active) fail('Tindakan nonaktif');
  if (qty < 1) fail('Jumlah minimal 1');
  const inv = $invoices.get().find((i) => i.visitId === visitId && i.status !== 'BATAL');
  if (inv && inv.status === 'LUNAS') fail('Tagihan kunjungan ini sudah lunas');
  const action = { id: uid('PA'), visitId, procedureId, qty, performerId, note, price: pm.priceUmum, at: nowISO() };
  $procedureActions.set([action, ...$procedureActions.get()]);
  const mr = $medicalRecords.get().find((m) => m.visitId === visitId);
  if (mr) patch($medicalRecords, mr.id, (x) => ({ ...x, procedures: [...x.procedures, action.id] }));
  if (inv) {
    const item = invoiceItem(v.payer, $insurers.get(), { category: 'TINDAKAN', name: pm.name, qty, price: pm.priceUmum, refId: action.id });
    patch($invoices, inv.id, (x) => ({ ...x, items: [...x.items, item] }));
  }
  audit('Menambah tindakan', 'Tindakan', pm.code, `${pm.name} x${qty} - ${patientName(v.patientId)}`);
  return action;
}

export function removeProcedure(actionId: string): void {
  const a = mustGet($procedureActions, actionId, 'Tindakan');
  const mr = $medicalRecords.get().find((m) => m.visitId === a.visitId);
  if (mr?.status === 'FINAL') fail('Rekam medis sudah terkunci');
  const inv = $invoices.get().find((i) => i.visitId === a.visitId && i.status !== 'BATAL');
  if (inv && ['LUNAS', 'SEBAGIAN'].includes(inv.status)) fail('Tagihan sudah dibayar');
  $procedureActions.set($procedureActions.get().filter((x) => x.id !== actionId));
  if (mr) patch($medicalRecords, mr.id, (x) => ({ ...x, procedures: x.procedures.filter((p) => p !== actionId) }));
  if (inv) patch($invoices, inv.id, (x) => ({ ...x, items: x.items.filter((it) => it.refId !== actionId) }));
  audit('Menghapus tindakan', 'Tindakan', byId($procedureMaster, a.procedureId)?.code ?? a.procedureId);
}

export function submitPrescription(visitId: string, items: RxItem[]): Prescription {
  const v = mustGet($visits, visitId, 'Kunjungan');
  if (!items.length) fail('Resep belum berisi obat');
  const existing = $prescriptions.get().find((r) => r.visitId === visitId && r.status !== 'BATAL');
  if (existing) fail(`Resep ${existing.rxNo} sudah dikirim ke farmasi`);
  const now = nowISO();
  const rx: Prescription = {
    id: uid('RX'),
    rxNo: nextDailyNo('RX', $prescriptions.get().map((r) => r.rxNo)),
    visitId,
    patientId: v.patientId,
    doctorId: v.doctorId,
    items,
    status: 'BARU' as const,
    createdAt: now,
    updatedAt: now,
  };
  $prescriptions.set([rx, ...$prescriptions.get()]);
  const mr = getOrCreateMR(visitId);
  patch($medicalRecords, mr.id, (x) => ({ ...x, prescriptionId: rx.id }));
  audit('Mengirim e-resep ke farmasi', 'Resep', rx.rxNo, `${items.length} item - ${patientName(v.patientId)}`);
  return rx;
}

export function validateExam(mr: MedicalRecord): string[] {
  const errs: string[] = [];
  if (!mr.diagnoses.length) errs.push('Minimal 1 diagnosa (ICD-10) wajib diisi');
  if (!mr.diagnoses.some((d) => d.type === 'PRIMER') && mr.diagnoses.length) errs.push('Tentukan satu diagnosa primer');
  if (!mr.soap.s.trim()) errs.push('Subjective (S) wajib diisi');
  if (!mr.soap.a.trim()) errs.push('Assessment (A) wajib diisi');
  if (!mr.soap.p.trim()) errs.push('Plan (P) wajib diisi');
  return errs;
}

/** Locks the record (electronic signature) and moves the visit to pharmacy or cashier. */
export function completeExam(mrId: string): { visit: Visit; next: 'FARMASI' | 'KASIR' | 'SELESAI' } {
  const mr = mustGet($medicalRecords, mrId, 'Rekam medis');
  assertDraft(mr);
  const errs = validateExam(mr);
  if (errs.length) fail(errs.join('. '));
  const signer = actor();
  const user = byId($users, signer.userId);
  patch($medicalRecords, mrId, (x) => ({ ...x, status: 'FINAL' as const, signedAt: nowISO(), signedBy: user?.doctorId ?? x.doctorId }));
  const v = mustGet($visits, mr.visitId, 'Kunjungan');
  audit('Menyelesaikan & menandatangani rekam medis', 'Rekam Medis', v.regNo, patientName(v.patientId));
  const rx = $prescriptions.get().find((r) => r.visitId === v.id && r.status !== 'BATAL');
  if (rx && rx.status !== 'DISERAHKAN') {
    const visit = patch($visits, v.id, (x) => ({ ...x, status: 'FARMASI' as const }));
    return { visit, next: 'FARMASI' };
  }
  return moveToCashier(v.id);
}

export function addAddendum(mrId: string, text: string): MedicalRecord {
  const mr = mustGet($medicalRecords, mrId, 'Rekam medis');
  if (mr.status !== 'FINAL') fail('Addendum hanya untuk rekam medis yang sudah dikunci');
  if (!text.trim()) fail('Isi addendum wajib diisi');
  const updated = patch($medicalRecords, mrId, (x) => ({ ...x, addenda: [...x.addenda, { text, by: actor().userId, at: nowISO() }] }));
  audit('Menambah addendum rekam medis', 'Rekam Medis', mustGet($visits, mr.visitId, 'Kunjungan').regNo, text.slice(0, 80));
  return updated;
}

/** Visit to cashier; when the patient owes nothing (fully covered) it is settled automatically. */
export function moveToCashier(visitId: string): { visit: Visit; next: 'KASIR' | 'SELESAI' } {
  const inv = $invoices.get().find((i) => i.visitId === visitId && i.status !== 'BATAL');
  let visit = patch($visits, visitId, (x) => ({ ...x, status: 'KASIR' as const }));
  if (!inv) return { visit, next: 'KASIR' };
  const invoice = patch($invoices, inv.id, (x) => ({ ...x, status: x.status === 'DRAFT' ? ('BELUM_BAYAR' as const) : x.status }));
  const t = invoiceTotals(invoice, $payments.get());
  if (t.due === 0 && invoice.status !== 'LUNAS') {
    const pay: Payment = {
      id: uid('PAY'),
      invoiceId: inv.id,
      receiptNo: nextDailyNo('KW', $payments.get().map((p) => p.receiptNo)),
      methods: [],
      note: 'Ditanggung penuh oleh penjamin',
      cashierId: 'SYSTEM',
      at: nowISO(),
    };
    $payments.set([pay, ...$payments.get()]);
    patch($invoices, inv.id, (x) => ({ ...x, status: 'LUNAS' as const }));
    visit = patch($visits, visitId, (x) => ({ ...x, status: 'SELESAI' as const, finishedAt: nowISO() }));
    audit('Tagihan ditanggung penuh penjamin', 'Tagihan', inv.invoiceNo, 'Status otomatis lunas');
    return { visit, next: 'SELESAI' };
  }
  return { visit, next: 'KASIR' };
}

// ---------- pharmacy ----------
export function updateRxItems(rxId: string, items: RxItem[]): Prescription {
  const rx = mustGet($prescriptions, rxId, 'Resep');
  if (!['BARU', 'DITELAAH'].includes(rx.status)) fail('Item resep tidak dapat diubah setelah disiapkan');
  return patch($prescriptions, rxId, (x) => ({ ...x, items, updatedAt: nowISO() }));
}

export function reviewRx(rxId: string, review: NonNullable<Prescription['review']>): Prescription {
  const rx = mustGet($prescriptions, rxId, 'Resep');
  if (rx.status !== 'BARU') fail('Resep sudah ditelaah');
  if (!review.admin || !review.pharmaceutical || !review.clinical) fail('Lengkapi seluruh checklist telaah resep');
  const updated = patch($prescriptions, rxId, (x) => ({ ...x, review, status: 'DITELAAH' as const, updatedAt: nowISO() }));
  audit('Telaah resep selesai', 'Resep', rx.rxNo, patientName(rx.patientId));
  return updated;
}

/** Deducts stock (FEFO) for every line and adds dispensed drugs to the invoice. All-or-nothing. */
export function prepareRx(rxId: string): Prescription {
  const rx = mustGet($prescriptions, rxId, 'Resep');
  if (rx.status !== 'DITELAAH') fail('Resep harus ditelaah sebelum disiapkan');
  const meds = $medicines.get().map((m) => ({ ...m, batches: m.batches.map((b) => ({ ...b })) }));
  const movements: StockMovement[] = [];
  const visit = mustGet($visits, rx.visitId, 'Kunjungan');
  const insurers = $insurers.get();
  const newItems: InvoiceItem[] = [];
  const now = nowISO();
  for (const it of rx.items) {
    const medId = it.substituteId || it.medicineId;
    const qty = it.qtyGiven ?? it.qty;
    if (qty <= 0) continue;
    const med = meds.find((m) => m.id === medId) ?? fail('Obat tidak ditemukan');
    let res;
    try {
      res = fefoDeduct(med.batches, qty);
    } catch {
      fail(`Stok ${med.name} tidak mencukupi (tersedia ${totalStock(med)}). Ubah jumlah atau pilih substitusi.`);
    }
    med.batches = res!.batches;
    for (const t of res!.taken)
      movements.push({ id: uid('SM'), medicineId: med.id, batchNo: t.batchNo, type: 'OUT', qty: -t.qty, ref: rx.rxNo, reason: 'Dispensing resep', at: now, by: actor().userId });
    newItems.push(invoiceItem(visit.payer, insurers, { category: 'OBAT', name: med.name, qty, price: med.sellPrice, refId: rx.id }));
  }
  $medicines.set(meds);
  $stockMovements.set([...movements, ...$stockMovements.get()]);
  const inv = $invoices.get().find((i) => i.visitId === rx.visitId && i.status !== 'BATAL');
  if (inv) patch($invoices, inv.id, (x) => ({ ...x, items: [...x.items.filter((i) => !(i.category === 'OBAT' && i.refId === rx.id)), ...newItems] }));
  const updated = patch($prescriptions, rxId, (x) => ({
    ...x,
    status: 'DISIAPKAN' as const,
    items: x.items.map((i) => ({ ...i, qtyGiven: i.qtyGiven ?? i.qty })),
    updatedAt: now,
  }));
  audit('Menyiapkan obat (stok berkurang FEFO)', 'Resep', rx.rxNo, `${newItems.length} item ke tagihan`);
  return updated;
}

export function markRxReady(rxId: string): Prescription {
  const rx = mustGet($prescriptions, rxId, 'Resep');
  if (rx.status !== 'DISIAPKAN') fail('Obat belum disiapkan');
  const updated = patch($prescriptions, rxId, (x) => ({ ...x, status: 'SIAP' as const, updatedAt: nowISO() }));
  audit('Obat siap diserahkan', 'Resep', rx.rxNo);
  return updated;
}

export function handoverRx(rxId: string, receivedBy: string): { rx: Prescription; next: 'KASIR' | 'SELESAI' | 'FARMASI' } {
  const rx = mustGet($prescriptions, rxId, 'Resep');
  if (rx.status !== 'SIAP') fail('Obat belum ditandai siap');
  if (!receivedBy.trim()) fail('Nama penerima wajib diisi');
  const updated = patch($prescriptions, rxId, (x) => ({ ...x, status: 'DISERAHKAN' as const, receivedBy, updatedAt: nowISO() }));
  audit('Menyerahkan obat ke pasien', 'Resep', rx.rxNo, `Diterima oleh ${receivedBy}`);
  const v = mustGet($visits, rx.visitId, 'Kunjungan');
  if (v.status === 'FARMASI') return { rx: updated, next: moveToCashier(v.id).next };
  return { rx: updated, next: 'FARMASI' };
}

export function rejectRx(rxId: string, note: string): Prescription {
  const rx = mustGet($prescriptions, rxId, 'Resep');
  if (!['BARU', 'DITELAAH'].includes(rx.status)) fail('Resep yang sudah disiapkan tidak dapat ditolak');
  if (!note.trim()) fail('Catatan untuk dokter wajib diisi');
  const updated = patch($prescriptions, rxId, (x) => ({ ...x, status: 'BATAL' as const, rejectNote: note, updatedAt: nowISO() }));
  audit('Menolak resep / konfirmasi ke dokter', 'Resep', rx.rxNo, note);
  const v = mustGet($visits, rx.visitId, 'Kunjungan');
  if (v.status === 'FARMASI') moveToCashier(v.id);
  return updated;
}

// ---------- stock ----------
export type MedicineInput = Omit<Medicine, 'id' | 'batches'> & { id?: string };

export function saveMedicine(input: MedicineInput): Medicine {
  if (!input.name.trim()) fail('Nama obat wajib diisi');
  if (input.id) {
    const m = patch($medicines, input.id, (x) => ({ ...x, ...input, id: x.id, batches: x.batches }));
    audit('Memperbarui data obat', 'Obat', m.code, m.name);
    return m;
  }
  if ($medicines.get().some((m) => m.code === input.code)) fail(`Kode ${input.code} sudah dipakai`);
  const m: Medicine = { ...input, id: uid('M'), batches: [], active: true };
  $medicines.set([m, ...$medicines.get()]);
  audit('Menambah obat baru', 'Obat', m.code, m.name);
  return m;
}

export function adjustStock(medicineId: string, delta: number, reason: string, batch?: Partial<Batch>): Medicine {
  const med = mustGet($medicines, medicineId, 'Obat');
  if (!delta) fail('Jumlah penyesuaian tidak boleh 0');
  if (!reason.trim()) fail('Alasan penyesuaian wajib diisi');
  const now = nowISO();
  let batches = med.batches.map((b) => ({ ...b }));
  const movements: StockMovement[] = [];
  if (delta < 0) {
    let res;
    try {
      res = fefoDeduct(batches, -delta);
    } catch (e) {
      fail((e as Error).message);
    }
    batches = res!.batches;
    for (const t of res!.taken) movements.push({ id: uid('SM'), medicineId, batchNo: t.batchNo, type: 'ADJ', qty: -t.qty, reason, at: now, by: actor().userId });
  } else {
    const batchNo = batch?.batchNo?.trim() || `ADJ-${Date.now().toString(36).toUpperCase()}`;
    const existing = batches.find((b) => b.batchNo === batchNo);
    if (existing) existing.qty += delta;
    else batches.push({ batchNo, expiry: batch?.expiry || todayStr().replace(/^(\d{4})/, (y) => String(Number(y) + 1)), qty: delta, buyPrice: batch?.buyPrice ?? Math.round(med.sellPrice * 0.72) });
    movements.push({ id: uid('SM'), medicineId, batchNo, type: 'ADJ', qty: delta, reason, at: now, by: actor().userId });
  }
  const updated = patch($medicines, medicineId, (x) => ({ ...x, batches }));
  $stockMovements.set([...movements, ...$stockMovements.get()]);
  audit('Penyesuaian stok', 'Obat', med.code, `${delta > 0 ? '+' : ''}${delta} ${med.unit} - ${reason}`);
  return updated;
}

export interface ReceiptInput {
  supplier: string;
  invoiceRef: string;
  date: string;
  lines: { medicineId: string; batchNo: string; expiry: string; qty: number; buyPrice: number }[];
}

export function receiveGoods(input: ReceiptInput) {
  if (!input.supplier) fail('Pilih distributor (PBF)');
  if (!input.invoiceRef.trim()) fail('No faktur wajib diisi');
  const lines = input.lines.filter((l) => l.medicineId);
  if (!lines.length) fail('Tambahkan minimal satu baris obat');
  for (const l of lines) {
    if (!l.batchNo.trim()) fail('No batch wajib diisi di setiap baris');
    if (!l.expiry) fail('Tanggal kedaluwarsa wajib diisi');
    if (l.expiry <= todayStr()) fail('Tanggal kedaluwarsa harus setelah hari ini');
    if (!(l.qty > 0)) fail('Qty harus lebih dari 0');
  }
  const now = nowISO();
  const grNo = nextDailyNo('GR', $receipts.get().map((r) => r.grNo), 3);
  const meds = $medicines.get().map((m) => ({ ...m, batches: m.batches.map((b) => ({ ...b })) }));
  const movements: StockMovement[] = [];
  for (const l of lines) {
    const med = meds.find((m) => m.id === l.medicineId) ?? fail('Obat tidak ditemukan');
    const existing = med.batches.find((b) => b.batchNo === l.batchNo);
    if (existing) existing.qty += l.qty;
    else med.batches.push({ batchNo: l.batchNo, expiry: l.expiry, qty: l.qty, buyPrice: l.buyPrice });
    movements.push({ id: uid('SM'), medicineId: med.id, batchNo: l.batchNo, type: 'IN', qty: l.qty, ref: grNo, reason: `Penerimaan dari ${input.supplier}`, at: now, by: actor().userId });
  }
  $medicines.set(meds);
  $stockMovements.set([...movements, ...$stockMovements.get()]);
  const receipt = { id: uid('GR'), grNo, supplier: input.supplier, invoiceRef: input.invoiceRef, date: input.date, lines, by: actor().userId, at: now };
  $receipts.set([receipt, ...$receipts.get()]);
  audit('Penerimaan barang farmasi', 'Penerimaan', grNo, `${lines.length} item dari ${input.supplier}`);
  return receipt;
}

// ---------- billing ----------
const openInvoice = (id: string) => {
  const inv = mustGet($invoices, id, 'Tagihan');
  if (inv.status === 'BATAL') fail('Tagihan sudah dibatalkan');
  if (inv.status === 'LUNAS') fail('Tagihan sudah lunas');
  return inv;
};

export function addManualItem(invoiceId: string, item: { name: string; qty: number; price: number; category: InvoiceItem['category']; covered: boolean }): Invoice {
  const inv = openInvoice(invoiceId);
  if (!item.name.trim()) fail('Nama item wajib diisi');
  if (!(item.qty > 0) || !(item.price >= 0)) fail('Qty dan harga tidak valid');
  const visit = mustGet($visits, inv.visitId, 'Kunjungan');
  const newItem = invoiceItem(
    visit.payer,
    $insurers.get(),
    { category: item.category, name: item.name, qty: item.qty, price: item.price, manual: true },
    item.covered ? undefined : 0,
  );
  const updated = patch($invoices, invoiceId, (x) => ({ ...x, items: [...x.items, newItem], status: x.status === 'LUNAS' ? 'SEBAGIAN' : x.status }));
  audit('Menambah item manual', 'Tagihan', inv.invoiceNo, `${item.name} x${item.qty}`);
  return updated;
}

export function removeInvoiceItem(invoiceId: string, itemId: string): Invoice {
  const inv = openInvoice(invoiceId);
  const it = inv.items.find((i) => i.id === itemId) ?? fail('Item tidak ditemukan');
  if (!it.manual) fail('Hanya item manual yang dapat dihapus');
  const updated = patch($invoices, invoiceId, (x) => ({ ...x, items: x.items.filter((i) => i.id !== itemId) }));
  audit('Menghapus item manual', 'Tagihan', inv.invoiceNo, it.name);
  return updated;
}

export function applyDiscount(invoiceId: string, amount: number, reason: string, pin: string): Invoice {
  const inv = openInvoice(invoiceId);
  if (pin !== DISCOUNT_PIN) fail('PIN otorisasi salah');
  if (!reason.trim()) fail('Alasan diskon wajib diisi');
  const t = invoiceTotals({ ...inv, discount: undefined });
  if (amount < 0 || amount > t.subtotal - t.covered) fail('Nominal diskon melebihi tanggungan pasien');
  const updated = patch($invoices, invoiceId, (x) => ({ ...x, discount: amount > 0 ? { amount, reason, approvedBy: actor().userId } : undefined }));
  audit('Memberi diskon (otorisasi PIN)', 'Tagihan', inv.invoiceNo, `${amount} - ${reason}`);
  return updated;
}

export interface PayInput {
  methods: { type: PayMethod; amount: number; ref?: string; bank?: string }[];
  cashReceived?: number;
}

export function pay(invoiceId: string, input: PayInput): Payment {
  const inv = openInvoice(invoiceId);
  if (inv.status === 'DRAFT') fail('Kunjungan masih berjalan. Tagihan dapat dibayar setelah pemeriksaan/farmasi selesai.');
  const t = invoiceTotals(inv, $payments.get());
  const methods = input.methods.filter((m) => m.amount > 0);
  const amount = methods.reduce((a, m) => a + m.amount, 0);
  if (t.remaining > 0 && amount <= 0) fail('Masukkan nominal pembayaran');
  if (amount > t.remaining) fail('Nominal melebihi sisa tagihan');
  for (const m of methods) {
    if ((m.type === 'DEBIT' || m.type === 'KREDIT') && (!m.bank || !m.ref)) fail('Pilih bank dan isi no referensi kartu');
    if (m.type === 'TRANSFER' && !m.ref) fail('Isi no referensi transfer');
  }
  const cash = methods.filter((m) => m.type === 'TUNAI').reduce((a, m) => a + m.amount, 0);
  if (cash > 0 && (input.cashReceived ?? 0) < cash) fail('Uang tunai diterima kurang dari nominal tunai');
  const payment: Payment = {
    id: uid('PAY'),
    invoiceId,
    receiptNo: nextDailyNo('KW', $payments.get().map((p) => p.receiptNo)),
    methods,
    cashReceived: cash > 0 ? input.cashReceived : undefined,
    change: cash > 0 ? (input.cashReceived ?? 0) - cash : undefined,
    note: amount === 0 ? 'Ditanggung penuh oleh penjamin' : undefined,
    cashierId: actor().userId,
    at: nowISO(),
  };
  $payments.set([payment, ...$payments.get()]);
  const after = invoiceTotals(inv, $payments.get());
  const status = statusAfterPayment(after);
  patch($invoices, invoiceId, (x) => ({ ...x, status }));
  if (status === 'LUNAS') {
    const v = byId($visits, inv.visitId);
    if (v && v.status !== 'BATAL') patch($visits, v.id, (x) => ({ ...x, status: 'SELESAI' as const, finishedAt: nowISO() }));
  }
  audit(status === 'LUNAS' ? 'Pembayaran lunas' : 'Pembayaran sebagian', 'Tagihan', inv.invoiceNo, `${payment.receiptNo} - ${methods.map((m) => m.type).join(' + ') || 'Penjamin'}`);
  return payment;
}

export function cancelInvoice(invoiceId: string, reason: string, pin: string): Invoice {
  const inv = openInvoice(invoiceId);
  if (pin !== DISCOUNT_PIN) fail('PIN otorisasi salah');
  if (!reason.trim()) fail('Alasan pembatalan wajib diisi');
  if ($payments.get().some((p) => p.invoiceId === invoiceId && p.methods.length)) fail('Tagihan yang sudah ada pembayaran tidak dapat dibatalkan');
  const updated = patch($invoices, invoiceId, (x) => ({ ...x, status: 'BATAL' as const, cancelReason: reason }));
  const v = byId($visits, inv.visitId);
  if (v && v.status === 'KASIR') patch($visits, v.id, (x) => ({ ...x, status: 'SELESAI' as const, finishedAt: nowISO() }));
  audit('Membatalkan tagihan (otorisasi PIN)', 'Tagihan', inv.invoiceNo, reason);
  return updated;
}

export function currentShift(d = new Date()): { name: string; start: number; end: number } {
  const h = d.getHours();
  if (h >= 7 && h < 14) return { name: 'Pagi (07.00 - 14.00)', start: 7, end: 14 };
  if (h >= 14 && h < 21) return { name: 'Siang (14.00 - 21.00)', start: 14, end: 21 };
  return { name: 'Malam (21.00 - 07.00)', start: 21, end: 7 };
}

export function closeShift(data: Omit<ShiftClose, 'id' | 'by' | 'at' | 'diff'>): ShiftClose {
  const s: ShiftClose = { ...data, diff: data.physicalCash - data.expectedCash, id: uid('SH'), by: actor().userId, at: nowISO() };
  $shifts.set([s, ...$shifts.get()]);
  audit('Tutup shift kasir', 'Kas', s.shift, `Selisih ${s.diff}`);
  return s;
}

// ---------- master data ----------
export function saveProcedureMaster(input: Omit<ProcedureMaster, 'id'> & { id?: string }): ProcedureMaster {
  if (!input.name.trim() || !input.code.trim()) fail('Kode dan nama wajib diisi');
  if (input.id) {
    const p = patch($procedureMaster, input.id, (x) => ({ ...x, ...input, id: x.id }));
    audit('Memperbarui master tindakan', 'Master Tindakan', p.code, p.name);
    return p;
  }
  const p: ProcedureMaster = { ...input, id: uid('PRC') };
  $procedureMaster.set([...$procedureMaster.get(), p]);
  audit('Menambah master tindakan', 'Master Tindakan', p.code, p.name);
  return p;
}

type MasterKind = 'doctors' | 'polis' | 'schedules' | 'insurers' | 'users';
const MASTER: Record<MasterKind, { store: WritableAtom<{ id: string; active?: boolean }[]>; label: string; prefix: string }> = {
  doctors: { store: $doctors as never, label: 'Dokter', prefix: 'D' },
  polis: { store: $polis as never, label: 'Poli', prefix: 'POL' },
  schedules: { store: $schedules as never, label: 'Jadwal', prefix: 'SCH' },
  insurers: { store: $insurers as never, label: 'Penjamin', prefix: 'INS' },
  users: { store: $users as never, label: 'Pengguna', prefix: 'U' },
};

export function saveMaster(kind: MasterKind, input: Record<string, unknown> & { id?: string }): void {
  const { store, label, prefix } = MASTER[kind];
  if (input.id && store.get().some((x) => x.id === input.id)) {
    patch(store, input.id, (x) => ({ ...x, ...input }));
    audit(`Memperbarui master ${label.toLowerCase()}`, `Master ${label}`, input.id);
  } else {
    const id = uid(prefix);
    store.set([...store.get(), { active: true, ...input, id }]);
    audit(`Menambah master ${label.toLowerCase()}`, `Master ${label}`, id);
  }
}

export function toggleMasterActive(kind: MasterKind | 'procedures' | 'medicines', id: string): boolean {
  const store = (kind === 'procedures' ? $procedureMaster : kind === 'medicines' ? $medicines : MASTER[kind].store) as unknown as WritableAtom<{ id: string; active?: boolean }[]>;
  const item = patch(store, id, (x) => ({ ...x, active: x.active === false }));
  audit(item.active ? 'Mengaktifkan data master' : 'Menonaktifkan data master', 'Master', id);
  return item.active !== false;
}

export function saveSettings(s: Settings): void {
  $settings.set(s);
  audit('Memperbarui pengaturan', 'Pengaturan', 'RS');
}

// typed re-exports for convenience in UI code
export type { Doctor, Poli, Schedule, User, Diagnosis };
