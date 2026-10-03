import { computed } from 'nanostores';
import { isSameDay, todayStr } from '../lib/date';
import { stockStatus } from '../lib/stock';
import {
  $appointments,
  $doctors,
  $insurers,
  $invoices,
  $medicines,
  $patients,
  $polis,
  $prescriptions,
  $procedureMaster,
  $users,
  $visits,
} from './db';
import { $session } from './session';

const mapOf = <T extends { id: string }>(arr: T[]) => new Map(arr.map((x) => [x.id, x]));

export const $patientMap = computed($patients, mapOf);
export const $doctorMap = computed($doctors, mapOf);
export const $poliMap = computed($polis, mapOf);
export const $medMap = computed($medicines, mapOf);
export const $procMap = computed($procedureMaster, mapOf);
export const $insurerMap = computed($insurers, mapOf);
export const $userMap = computed($users, mapOf);

/** Person name by id: user, doctor, or the id itself. */
export const $personName = computed([$userMap, $doctorMap], (users, doctors) => (id: string) => {
  if (id === 'SYSTEM') return 'Sistem';
  if (id === 'PUBLIK') return 'Pasien (online)';
  return users.get(id)?.name ?? doctors.get(id)?.name ?? id;
});

export const $todayVisits = computed($visits, (vs) => {
  const t = todayStr();
  return vs.filter((v) => isSameDay(v.registeredAt, t));
});

export const $activeQueue = computed($todayVisits, (vs) => vs.filter((v) => v.status === 'MENUNGGU' || v.status === 'DIPANGGIL'));

export const $pharmacyPending = computed($prescriptions, (rx) => rx.filter((r) => ['BARU', 'DITELAAH', 'DISIAPKAN', 'SIAP'].includes(r.status)));

export const $cashierOpen = computed($invoices, (inv) => inv.filter((i) => i.status === 'BELUM_BAYAR' || i.status === 'SEBAGIAN'));

export const $appointmentsPending = computed($appointments, (a) => {
  const t = todayStr();
  return a.filter((x) => x.status === 'BOOKED' && x.date >= t);
});

export const $stockAlerts = computed($medicines, (meds) => meds.filter((m) => m.active !== false && stockStatus(m) !== 'AMAN'));

/** Doctor in session (for the Dokter role), used to default worklist filters. */
export const $sessionDoctorId = computed([$session, $users], (s, users) => {
  if (!s || s.role !== 'DOKTER') return undefined;
  return users.find((u) => u.id === s.userId)?.doctorId;
});

export const $worklistWaiting = computed([$todayVisits, $sessionDoctorId], (vs, docId) =>
  vs.filter((v) => ['MENUNGGU', 'DIPANGGIL', 'DIPERIKSA'].includes(v.status) && (!docId || v.doctorId === docId)),
);

export const $badges = computed(
  [$activeQueue, $pharmacyPending, $cashierOpen, $appointmentsPending, $stockAlerts, $worklistWaiting],
  (queue, rx, cashier, appts, stock, worklist) => ({
    queue: queue.length,
    pharmacy: rx.filter((r) => r.status !== 'SIAP').length,
    cashier: cashier.length,
    appointments: appts.length,
    stock: stock.length,
    worklist: worklist.length,
  }),
);
