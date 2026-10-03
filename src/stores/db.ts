import { atom, type WritableAtom } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import { SCHEMA_VERSION, HOSPITAL } from '../lib/constants';
import { hydrateDates } from '../lib/date';
import { nextBookingCode, PENDING_KEY } from '../lib/booking';
import type {
  Appointment,
  AuditEntry,
  Doctor,
  GoodsReceipt,
  Insurer,
  Invoice,
  MedicalRecord,
  Medicine,
  Patient,
  Payment,
  Poli,
  Prescription,
  ProcedureAction,
  ProcedureMaster,
  Schedule,
  Settings,
  ShiftClose,
  StockMovement,
  User,
  Visit,
} from '../lib/types';

const json = { encode: JSON.stringify, decode: JSON.parse };
const coll = <T>(key: string) => persistentAtom<T[]>(`rsd:${key}`, [], json);

export const $patients = coll<Patient>('patients');
export const $doctors = coll<Doctor>('doctors');
export const $polis = coll<Poli>('polis');
export const $schedules = coll<Schedule>('schedules');
export const $appointments = coll<Appointment>('appointments');
export const $visits = coll<Visit>('visits');
export const $medicalRecords = coll<MedicalRecord>('mr');
export const $procedureMaster = coll<ProcedureMaster>('procedures');
export const $procedureActions = coll<ProcedureAction>('procedure-actions');
export const $medicines = coll<Medicine>('meds');
export const $stockMovements = coll<StockMovement>('stock-movements');
export const $prescriptions = coll<Prescription>('rx');
export const $invoices = coll<Invoice>('inv');
export const $payments = coll<Payment>('pay');
export const $insurers = coll<Insurer>('insurers');
export const $users = coll<User>('users');
export const $auditLog = coll<AuditEntry>('audit');
export const $receipts = coll<GoodsReceipt>('receipts');
export const $shifts = coll<ShiftClose>('shifts');

export const DEFAULT_SETTINGS: Settings = {
  hospitalName: HOSPITAL.name,
  address: HOSPITAL.address,
  phone: HOSPITAL.phone,
  emergencyPhone: HOSPITAL.emergencyPhone,
  email: HOSPITAL.email,
  receiptFormat: 'A5',
  showWatermark: true,
};
export const $settings = persistentAtom<Settings>('rsd:settings', DEFAULT_SETTINGS, json);

/** Last queue call, broadcast to the TV display through the storage event. */
export const $lastCall = persistentAtom<{ visitId: string; at: string } | null>('rsd:last-call', null, json);

const $schema = persistentAtom<string>('rsd:schema', '');
/** True once data is present in localStorage (seeded or restored). */
export const $ready = atom(false);

/** Seed file keys mapped to stores. */
const SEED_MAP: [string, WritableAtom<unknown[]>][] = [
  ['patients', $patients],
  ['doctors', $doctors],
  ['polis', $polis],
  ['schedules', $schedules],
  ['appointments', $appointments],
  ['visits', $visits],
  ['medicalRecords', $medicalRecords],
  ['procedureMaster', $procedureMaster],
  ['procedureActions', $procedureActions],
  ['medicines', $medicines],
  ['stockMovements', $stockMovements],
  ['prescriptions', $prescriptions],
  ['invoices', $invoices],
  ['payments', $payments],
  ['insurers', $insurers],
  ['users', $users],
  ['auditLog', $auditLog],
] as unknown as [string, WritableAtom<unknown[]>][];

/** Load raw seed (with relative date tokens) into all stores. */
export function loadSeed(raw: Record<string, unknown[]>, base = new Date()): void {
  const data = hydrateDates(raw, base);
  for (const [key, store] of SEED_MAP) store.set((data[key] as unknown[]) ?? []);
  $receipts.set([]);
  $shifts.set([]);
  $lastCall.set(null);
  $settings.set(DEFAULT_SETTINGS);
  $schema.set(SCHEMA_VERSION);
}

let loading: Promise<void> | null = null;

export async function resetDb(): Promise<void> {
  $ready.set(false);
  const res = await fetch('/seed.json', { cache: 'no-cache' });
  const raw = (await res.json()) as Record<string, unknown[]>;
  loadSeed(raw);
  importPendingBookings();
  $ready.set(true);
}

/** Ensure data exists; seeds on first visit or when SCHEMA_VERSION changed. */
export function initDb(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ($ready.get()) return Promise.resolve();
  if ($schema.get() === SCHEMA_VERSION && $patients.get().length > 0) {
    importPendingBookings();
    $ready.set(true);
    return Promise.resolve();
  }
  loading ??= resetDb().finally(() => (loading = null));
  return loading;
}

export const PENDING_BOOKINGS_KEY = PENDING_KEY;

/** Bookings made on the public site are queued in a separate key, then merged here. */
export function importPendingBookings(): void {
  if (typeof localStorage === 'undefined') return;
  let pending: Appointment[] = [];
  try {
    pending = JSON.parse(localStorage.getItem(PENDING_BOOKINGS_KEY) || '[]');
  } catch {
    pending = [];
  }
  if (!pending.length) return;
  const current = $appointments.get();
  const ids = new Set(current.map((a) => a.id));
  const codes = current.map((a) => a.code);
  const fresh: Appointment[] = [];
  for (const a of pending) {
    if (ids.has(a.id)) continue;
    // a seeded booking may already use this code: renumber instead of dropping the booking
    const code = codes.includes(a.code) ? nextBookingCode(a.date, codes) : a.code;
    codes.push(code);
    fresh.push({ ...a, code });
  }
  if (fresh.length) {
    $appointments.set([...fresh, ...$appointments.get()]);
    $auditLog.set([
      ...fresh.map((a) => ({
        id: `AU-${a.id}`,
        at: a.createdAt,
        userId: 'PUBLIK',
        role: 'PUBLIK',
        action: 'Booking online dibuat',
        entity: 'Janji Temu',
        entityId: a.code,
        detail: a.name,
      })),
      ...$auditLog.get(),
    ]);
  }
  localStorage.removeItem(PENDING_BOOKINGS_KEY);
}

if (typeof window !== 'undefined' && $schema.get() === SCHEMA_VERSION && $patients.get().length > 0) {
  importPendingBookings();
  $ready.set(true);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === PENDING_BOOKINGS_KEY && e.newValue && $ready.get()) importPendingBookings();
  });
}
