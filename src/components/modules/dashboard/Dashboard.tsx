import { useMemo } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { AlertTriangle, CalendarClock, ClipboardPlus, HeartPulse, ListOrdered, Package, Pill, Receipt, Stethoscope, UserPlus, Users, Wallet } from 'lucide-preact';
import { invoiceTotals } from '../../../lib/billing';
import { PAY_METHOD_LABEL, VISIT_STATUS } from '../../../lib/constants';
import { addDays, daysBetween, isSameDay, toDateStr, todayStr } from '../../../lib/date';
import { dateShort, rupiah, timeHM } from '../../../lib/format';
import { announce } from '../../../lib/speech';
import { nearestExpiry, stockStatus, totalStock, STOCK_STATUS } from '../../../lib/stock';
import { $invoices, $medicalRecords, $medicines, $patients, $payments, $prescriptions, $visits } from '../../../stores/db';
import { $currentUser, $session } from '../../../stores/session';
import { $badges, $doctorMap, $patientMap, $poliMap, $sessionDoctorId, $todayVisits } from '../../../stores/selectors';
import { callVisit, startExam } from '../../../stores/actions';
import { StatusPill, Badge } from '../../ui/Badge';
import { Donut, HBarList, LineChart } from '../../ui/Charts';
import { Card, EmptyState, PageHeader, PageSkeleton, StatCard } from '../../ui/Display';
import { go, run, useReady } from '../../ui/hooks';
import { PatientCell } from '../shared';
import { RX_STATUS } from '../../../lib/constants';

const paidAmount = (p: { methods: { amount: number }[] }) => p.methods.reduce((a, m) => a + m.amount, 0);

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
}

function AdminDashboard({ full }: { full: boolean }) {
  const visits = useStore($visits);
  const today = useStore($todayVisits);
  const patients = useStore($patients);
  const payments = useStore($payments);
  const pMap = useStore($patientMap);
  const poliMap = useStore($poliMap);
  const docMap = useStore($doctorMap);
  const badges = useStore($badges);
  const t = todayStr();

  const activeToday = today.filter((v) => v.status !== 'BATAL');
  const newPatients = patients.filter((p) => isSameDay(p.createdAt, t)).length;
  const revenueToday = payments.filter((p) => isSameDay(p.at, t)).reduce((a, p) => a + paidAmount(p), 0);

  const last7 = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = toDateStr(addDays(base, i - 6));
      return {
        label: new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
        value: visits.filter((v) => v.status !== 'BATAL' && v.registeredAt.startsWith(d)).length,
      };
    });
  }, [visits]);

  const perPoli = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of visits) if (v.status !== 'BATAL' && daysBetween(v.registeredAt, t) <= 6) counts.set(v.poliId, (counts.get(v.poliId) ?? 0) + 1);
    return [...counts.entries()].map(([id, value]) => ({ label: poliMap.get(id)?.name ?? id, value })).sort((a, b) => b.value - a.value);
  }, [visits, poliMap]);

  const recent = [...today].sort((a, b) => b.registeredAt.localeCompare(a.registeredAt)).slice(0, 5);

  return (
    <>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Kunjungan hari ini" value={activeToday.length} icon={<Users size={20} />} hint={`${today.filter((v) => v.status === 'SELESAI').length} selesai`} href="/app/pendaftaran" />
        <StatCard label="Pasien baru hari ini" value={newPatients} icon={<UserPlus size={20} />} tone="info" hint={`Total ${patients.length} pasien`} href="/app/pasien" />
        <StatCard label="Antrian aktif" value={badges.queue} icon={<ListOrdered size={20} />} tone="warning" hint="Menunggu & dipanggil" href="/app/antrian" />
        <StatCard label="Pendapatan hari ini" value={rupiah(revenueToday)} icon={<Wallet size={20} />} tone="success" hint={`${payments.filter((p) => isSameDay(p.at, t)).length} transaksi`} href={full ? '/app/kasir/rekap' : undefined} />
      </div>

      {full && (
        <div class="mt-4 grid gap-4 sm:grid-cols-3">
          <StatCard label="Resep menunggu farmasi" value={badges.pharmacy} icon={<Pill size={20} />} href="/app/farmasi" />
          <StatCard label="Tagihan belum dibayar" value={badges.cashier} icon={<Receipt size={20} />} tone="warning" href="/app/kasir" />
          <StatCard label="Peringatan stok obat" value={badges.stock} icon={<Package size={20} />} tone="info" href="/app/farmasi/stok" />
        </div>
      )}

      <div class="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Kunjungan 7 hari terakhir" class="xl:col-span-2">
          <LineChart data={last7} label="Grafik kunjungan 7 hari terakhir" format={(n) => `${n} kunjungan`} />
        </Card>
        <Card title="Distribusi per poli (7 hari)">
          <HBarList data={perPoli.slice(0, 7)} format={(n) => `${n}`} />
        </Card>
      </div>

      <div class="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Registrasi terakhir hari ini" class="xl:col-span-2" bodyClass="" actions={<a href="/app/pendaftaran" class="link text-sm">Lihat semua</a>}>
          {recent.length === 0 ? (
            <EmptyState title="Belum ada registrasi hari ini" />
          ) : (
            <div class="overflow-x-auto">
              <table class="table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Pasien</th>
                    <th>Poli / Dokter</th>
                    <th>Antrian</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((v) => {
                    const p = pMap.get(v.patientId);
                    return (
                      <tr key={v.id}>
                        <td class="tabular">{timeHM(v.registeredAt)}</td>
                        <td>{p ? <PatientCell p={p} href={`/app/pendaftaran/detail?id=${v.id}`} /> : '-'}</td>
                        <td>
                          <p class="font-medium">{poliMap.get(v.poliId)?.name}</p>
                          <p class="text-xs text-muted">{docMap.get(v.doctorId)?.name}</p>
                        </td>
                        <td class="tabular font-semibold">{v.queueNo}</td>
                        <td>
                          <StatusPill status={VISIT_STATUS[v.status]} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Pintasan">
          <div class="grid gap-3">
            <a href="/app/pasien/baru" class="btn btn-secondary justify-start">
              <UserPlus size={18} /> Pasien Baru
            </a>
            <a href="/app/pendaftaran/baru" class="btn btn-primary justify-start">
              <ClipboardPlus size={18} /> Daftarkan Kunjungan
            </a>
            <a href="/app/janji-temu" class="btn btn-secondary justify-start">
              <CalendarClock size={18} /> Booking Online ({badges.appointments})
            </a>
            <a href="/app/antrian/display" target="_blank" rel="noopener" class="btn btn-ghost justify-start">
              <ListOrdered size={18} /> Buka Layar Antrian (tab baru)
            </a>
          </div>
        </Card>
      </div>
    </>
  );
}

function DoctorDashboard() {
  const today = useStore($todayVisits);
  const docId = useStore($sessionDoctorId);
  const pMap = useStore($patientMap);
  const poliMap = useStore($poliMap);
  const mine = today.filter((v) => !docId || v.doctorId === docId);
  const waiting = mine.filter((v) => v.status === 'MENUNGGU' || v.status === 'DIPANGGIL').sort((a, b) => Number(!!a.skipped) - Number(!!b.skipped) || a.queueNo.localeCompare(b.queueNo));
  const inExam = mine.filter((v) => v.status === 'DIPERIKSA');
  const done = mine.filter((v) => ['FARMASI', 'KASIR', 'SELESAI'].includes(v.status));

  const callNext = () => {
    const next = waiting.find((v) => v.status === 'MENUNGGU') ?? waiting[0];
    if (!next) return;
    const v = run(() => callVisit(next.id), `Memanggil ${next.queueNo}`, pMap.get(next.patientId)?.name);
    if (!v) return;
    announce(v.queueNo, poliMap.get(v.poliId)?.name ?? '');
    run(() => startExam(v.id));
    setTimeout(() => go(`/app/rekam-medis/periksa?visit=${v.id}`), 600);
  };

  return (
    <>
      <div class="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pasien menunggu" value={waiting.length} icon={<ListOrdered size={20} />} tone="warning" />
        <StatCard label="Sedang diperiksa" value={inExam.length} icon={<Stethoscope size={20} />} tone="info" />
        <StatCard label="Selesai diperiksa" value={done.length} icon={<HeartPulse size={20} />} tone="success" />
      </div>
      <div class="card mt-6 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-primary-soft to-white p-6">
        <div>
          <p class="text-sm text-muted">Pasien berikutnya</p>
          {waiting[0] ? (
            <p class="mt-1 text-xl font-semibold">
              <span class="tabular mr-2 text-primary">{waiting.find((v) => v.status === 'MENUNGGU')?.queueNo ?? waiting[0].queueNo}</span>
              {pMap.get((waiting.find((v) => v.status === 'MENUNGGU') ?? waiting[0]).patientId)?.name}
            </p>
          ) : (
            <p class="mt-1 text-xl font-semibold">Tidak ada pasien menunggu</p>
          )}
        </div>
        <button type="button" class="btn btn-primary btn-lg" disabled={!waiting.length} onClick={callNext}>
          Panggil Pasien Berikutnya
        </button>
      </div>
      <Card title="Daftar pasien hari ini" class="mt-6" bodyClass="" actions={<a class="link text-sm" href="/app/rekam-medis">Buka worklist</a>}>
        <VisitMiniTable rows={mine} />
      </Card>
    </>
  );
}

function VisitMiniTable({ rows }: { rows: ReturnType<typeof $todayVisits.get> }) {
  const pMap = useStore($patientMap);
  const poliMap = useStore($poliMap);
  if (!rows.length) return <EmptyState title="Belum ada pasien" />;
  return (
    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>Antrian</th>
            <th>Pasien</th>
            <th>Poli</th>
            <th>Status</th>
            <th class="text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {[...rows]
            .sort((a, b) => a.queueNo.localeCompare(b.queueNo))
            .map((v) => {
              const p = pMap.get(v.patientId);
              return (
                <tr key={v.id}>
                  <td class="tabular font-semibold">{v.queueNo}</td>
                  <td>{p && <PatientCell p={p} />}</td>
                  <td>{poliMap.get(v.poliId)?.name}</td>
                  <td>
                    <StatusPill status={VISIT_STATUS[v.status]} />
                  </td>
                  <td class="text-right">
                    {v.status !== 'BATAL' && (
                      <a href={`/app/rekam-medis/periksa?visit=${v.id}`} class="btn btn-secondary btn-sm">
                        {['MENUNGGU', 'DIPANGGIL', 'DIPERIKSA'].includes(v.status) ? 'Periksa' : 'Lihat RM'}
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

function NurseDashboard() {
  const today = useStore($todayVisits);
  const mrs = useStore($medicalRecords);
  const active = today.filter((v) => ['MENUNGGU', 'DIPANGGIL', 'DIPERIKSA'].includes(v.status));
  const noVitals = active.filter((v) => !mrs.find((m) => m.visitId === v.id)?.vitals);
  return (
    <>
      <div class="grid gap-4 sm:grid-cols-3">
        <StatCard label="Antrian triase" value={active.length} icon={<ListOrdered size={20} />} tone="warning" href="/app/antrian" />
        <StatCard label="Belum diisi TTV" value={noVitals.length} icon={<HeartPulse size={20} />} href="/app/rekam-medis" />
        <StatCard label="Kunjungan hari ini" value={today.filter((v) => v.status !== 'BATAL').length} icon={<Users size={20} />} tone="info" />
      </div>
      <Card title="Pasien belum diisi tanda vital" class="mt-6" bodyClass="">
        <VisitMiniTable rows={noVitals} />
      </Card>
    </>
  );
}

function PharmacistDashboard() {
  const rx = useStore($prescriptions);
  const meds = useStore($medicines);
  const pMap = useStore($patientMap);
  const pending = rx.filter((r) => ['BARU', 'DITELAAH', 'DISIAPKAN', 'SIAP'].includes(r.status));
  const low = meds.filter((m) => ['MENIPIS', 'HABIS'].includes(stockStatus(m)));
  const ed = meds.filter((m) => stockStatus(m) === 'HAMPIR_ED');
  return (
    <>
      <div class="grid gap-4 sm:grid-cols-3">
        <StatCard label="Resep menunggu" value={pending.length} icon={<Pill size={20} />} href="/app/farmasi" />
        <StatCard label="Stok menipis / habis" value={low.length} icon={<Package size={20} />} tone="warning" href="/app/farmasi/stok" />
        <StatCard label="Mendekati kedaluwarsa" value={ed.length} icon={<AlertTriangle size={20} />} tone="info" href="/app/farmasi/stok" />
      </div>
      <div class="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Resep masuk" bodyClass="" actions={<a href="/app/farmasi" class="link text-sm">Buka antrian farmasi</a>}>
          {pending.length === 0 ? (
            <EmptyState title="Tidak ada resep menunggu" />
          ) : (
            <ul class="divide-y divide-border">
              {pending.slice(0, 8).map((r) => (
                <li key={r.id} class="flex items-center justify-between gap-3 px-5 py-3">
                  <div class="min-w-0">
                    <p class="tabular text-sm font-semibold">{r.rxNo}</p>
                    <p class="truncate text-xs text-muted">
                      {pMap.get(r.patientId)?.name} · {r.items.length} item
                    </p>
                  </div>
                  <StatusPill status={RX_STATUS[r.status]} />
                  <a href={`/app/farmasi/resep?id=${r.id}`} class="btn btn-secondary btn-sm">
                    Proses
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Peringatan stok" bodyClass="">
          <ul class="divide-y divide-border">
            {[...low, ...ed].slice(0, 10).map((m) => {
              const st = STOCK_STATUS[stockStatus(m)];
              return (
                <li key={m.id} class="flex items-center justify-between gap-3 px-5 py-3">
                  <div class="min-w-0">
                    <a href={`/app/farmasi/stok/detail?id=${m.id}`} class="truncate text-sm font-medium hover:text-primary">
                      {m.name}
                    </a>
                    <p class="tabular text-xs text-muted">
                      Stok {totalStock(m)} {m.unit} · min {m.minStock} · ED {dateShort(nearestExpiry(m))}
                    </p>
                  </div>
                  <StatusPill status={st} />
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}

function CashierDashboard() {
  const invoices = useStore($invoices);
  const payments = useStore($payments);
  const pMap = useStore($patientMap);
  const t = todayStr();
  const open = invoices.filter((i) => i.status === 'BELUM_BAYAR' || i.status === 'SEBAGIAN');
  const todayPays = payments.filter((p) => isSameDay(p.at, t));
  const byMethod = new Map<string, number>();
  for (const p of todayPays) for (const m of p.methods) byMethod.set(m.type, (byMethod.get(m.type) ?? 0) + m.amount);
  const total = [...byMethod.values()].reduce((a, b) => a + b, 0);
  return (
    <>
      <div class="grid gap-4 sm:grid-cols-3">
        <StatCard label="Tagihan terbuka" value={open.length} icon={<Receipt size={20} />} tone="warning" href="/app/kasir" />
        <StatCard label="Diterima hari ini" value={rupiah(total)} icon={<Wallet size={20} />} tone="success" href="/app/kasir/rekap" />
        <StatCard label="Transaksi hari ini" value={todayPays.length} icon={<Users size={20} />} tone="info" />
      </div>
      <div class="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Tagihan menunggu pembayaran" bodyClass="">
          {open.length === 0 ? (
            <EmptyState title="Semua tagihan sudah dibayar" />
          ) : (
            <ul class="divide-y divide-border">
              {open.map((i) => (
                <li key={i.id} class="flex items-center justify-between gap-3 px-5 py-3">
                  <div class="min-w-0">
                    <p class="tabular text-sm font-semibold">{i.invoiceNo}</p>
                    <p class="truncate text-xs text-muted">{pMap.get(i.patientId)?.name}</p>
                  </div>
                  <span class="tabular text-sm font-semibold">{rupiah(invoiceTotals(i, payments).remaining)}</span>
                  <a href={`/app/kasir/tagihan?id=${i.id}`} class="btn btn-primary btn-sm">
                    Proses
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Penerimaan per metode bayar (hari ini)">
          {total === 0 ? (
            <EmptyState title="Belum ada penerimaan hari ini" />
          ) : (
            <Donut data={[...byMethod.entries()].map(([k, v]) => ({ label: PAY_METHOD_LABEL[k as keyof typeof PAY_METHOD_LABEL], value: v }))} format={rupiah} label="Penerimaan per metode bayar" />
          )}
        </Card>
      </div>
    </>
  );
}

export default function Dashboard() {
  const ready = useReady();
  const session = useStore($session);
  const user = useStore($currentUser);
  if (!ready || !session) return <PageSkeleton />;
  const role = session.role;
  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${user?.name.split(',')[0] ?? ''}`}
        subtitle={
          <>
            Ringkasan operasional {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.{' '}
            <Badge tone="primary">{user?.title}</Badge>
          </>
        }
      />
      {(role === 'SUPERADMIN' || role === 'ADMIN') && <AdminDashboard full={role === 'SUPERADMIN'} />}
      {role === 'DOKTER' && <DoctorDashboard />}
      {role === 'PERAWAT' && <NurseDashboard />}
      {role === 'APOTEKER' && <PharmacistDashboard />}
      {role === 'KASIR' && <CashierDashboard />}
    </div>
  );
}
