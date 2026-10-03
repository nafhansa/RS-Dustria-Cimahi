import { useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { ClipboardPlus, Eye, Printer, XCircle } from 'lucide-preact';
import { VISIT_STATUS } from '../../../lib/constants';
import { todayStr } from '../../../lib/date';
import { dateShort, timeHM } from '../../../lib/format';
import type { Visit, VisitStatus } from '../../../lib/types';
import { $doctors, $polis, $visits } from '../../../stores/db';
import { $doctorMap, $patientMap, $poliMap } from '../../../stores/selectors';
import { canCancelVisit, cancelVisit } from '../../../stores/actions';
import { confirmDialog } from '../../../stores/ui';
import { StatusPill } from '../../ui/Badge';
import { DataTable, type Column } from '../../ui/DataTable';
import { PageHeader } from '../../ui/Display';
import { run, useReady } from '../../ui/hooks';
import { PatientCell, PayerBadge, SearchInput } from '../shared';

export async function askCancelVisit(v: Visit) {
  const r = await confirmDialog({
    title: `Batalkan registrasi ${v.regNo}?`,
    message: 'Tagihan draft akan dibatalkan dan slot kuota dokter dikembalikan.',
    input: { label: 'Alasan pembatalan', placeholder: 'Contoh: pasien pulang sebelum dipanggil' },
    confirmLabel: 'Batalkan Registrasi',
    tone: 'danger',
  });
  if (r.ok) run(() => cancelVisit(v.id, r.text ?? ''), 'Registrasi dibatalkan', v.regNo);
}

export default function RegistrationList() {
  const ready = useReady();
  const visits = useStore($visits);
  const polis = useStore($polis);
  const doctors = useStore($doctors);
  const pMap = useStore($patientMap);
  const poliMap = useStore($poliMap);
  const docMap = useStore($doctorMap);
  const [date, setDate] = useState(todayStr());
  const [q, setQ] = useState('');
  const [poli, setPoli] = useState('');
  const [doc, setDoc] = useState('');
  const [status, setStatus] = useState('');
  const [payer, setPayer] = useState('');

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return visits.filter((v) => {
      if (date && !v.registeredAt.startsWith(date)) return false;
      if (poli && v.poliId !== poli) return false;
      if (doc && v.doctorId !== doc) return false;
      if (status && v.status !== status) return false;
      if (payer && v.payer.type !== payer) return false;
      if (term) {
        const p = pMap.get(v.patientId);
        if (!(v.regNo.toLowerCase().includes(term) || p?.name.toLowerCase().includes(term) || p?.mrn.toLowerCase().includes(term) || v.queueNo.toLowerCase().includes(term))) return false;
      }
      return true;
    });
  }, [visits, date, q, poli, doc, status, payer, pMap]);

  const columns: Column<Visit>[] = [
    { key: 'reg', header: 'No Registrasi', sort: (v) => v.regNo, render: (v) => <span class="tabular font-medium">{v.regNo}</span> },
    { key: 'time', header: 'Waktu', sort: (v) => v.registeredAt, render: (v) => <span class="tabular">{date ? timeHM(v.registeredAt) : `${dateShort(v.registeredAt)} ${timeHM(v.registeredAt)}`}</span> },
    { key: 'patient', header: 'Pasien', sort: (v) => pMap.get(v.patientId)?.name ?? '', render: (v) => { const p = pMap.get(v.patientId); return p ? <PatientCell p={p} href={`/app/pasien/detail?id=${p.id}`} /> : '-'; } },
    { key: 'poli', header: 'Poli', sort: (v) => poliMap.get(v.poliId)?.name ?? '', render: (v) => <span>{poliMap.get(v.poliId)?.name}{v.type === 'IGD' && <span class="badge ml-1 bg-danger text-white">IGD</span>}</span> },
    { key: 'doc', header: 'Dokter', render: (v) => <span class="text-sm">{docMap.get(v.doctorId)?.name}</span> },
    { key: 'payer', header: 'Penjamin', render: (v) => <PayerBadge payer={v.payer} /> },
    { key: 'queue', header: 'Antrian', sort: (v) => v.queueNo, render: (v) => <span class="tabular font-semibold">{v.queueNo}</span> },
    { key: 'status', header: 'Status', sort: (v) => v.status, render: (v) => <StatusPill status={VISIT_STATUS[v.status]} /> },
    {
      key: 'act',
      header: <span class="sr-only">Aksi</span>,
      class: 'text-right',
      render: (v) => (
        <div class="flex justify-end gap-1">
          <a href={`/app/pendaftaran/detail?id=${v.id}`} class="btn-icon h-8 w-8" title="Detail" aria-label={`Detail ${v.regNo}`}>
            <Eye size={16} />
          </a>
          <a href={`/app/pendaftaran/detail?id=${v.id}&print=1`} class="btn-icon h-8 w-8" title="Cetak Bukti" aria-label={`Cetak bukti ${v.regNo}`}>
            <Printer size={16} />
          </a>
          <button
            type="button"
            class="btn-icon h-8 w-8 hover:text-danger"
            disabled={!canCancelVisit(v)}
            title={canCancelVisit(v) ? 'Batalkan' : 'Tidak dapat dibatalkan: pasien sudah diperiksa atau kunjungan sudah ditutup'}
            aria-label={`Batalkan ${v.regNo}`}
            onClick={() => askCancelVisit(v)}
          >
            <XCircle size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Pendaftaran"
        subtitle="Registrasi kunjungan hari ini dan riwayat."
        actions={
          <a href="/app/pendaftaran/baru" class="btn btn-primary">
            <ClipboardPlus size={16} /> Pendaftaran Baru
          </a>
        }
      />
      <div class="card">
        <div class="grid gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-6">
          <SearchInput class="lg:col-span-2" value={q} onValue={setQ} placeholder="Cari no registrasi, nama, No RM..." />
          <div class="flex gap-2">
            <input type="date" class="input" value={date} onInput={(e) => setDate((e.target as HTMLInputElement).value)} aria-label="Filter tanggal" />
            {date && (
              <button type="button" class="btn btn-ghost btn-sm" onClick={() => setDate('')} title="Semua tanggal">
                Semua
              </button>
            )}
          </div>
          <select class="input" value={poli} onChange={(e) => setPoli((e.target as HTMLSelectElement).value)} aria-label="Filter poli">
            <option value="">Semua poli</option>
            {polis.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select class="input" value={doc} onChange={(e) => setDoc((e.target as HTMLSelectElement).value)} aria-label="Filter dokter">
            <option value="">Semua dokter</option>
            {doctors
              .filter((d) => !poli || d.poliId === poli)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
          <div class="flex gap-2">
            <select class="input" value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value)} aria-label="Filter status">
              <option value="">Semua status</option>
              {(Object.keys(VISIT_STATUS) as VisitStatus[]).map((s) => (
                <option key={s} value={s}>
                  {VISIT_STATUS[s].label}
                </option>
              ))}
            </select>
            <select class="input" value={payer} onChange={(e) => setPayer((e.target as HTMLSelectElement).value)} aria-label="Filter penjamin">
              <option value="">Penjamin</option>
              <option value="UMUM">Umum</option>
              <option value="BPJS">BPJS</option>
              <option value="ASURANSI">Asuransi</option>
            </select>
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(v) => v.id}
          loading={!ready}
          initialSort={{ key: 'time', dir: 'desc' }}
          caption="Daftar registrasi"
          pageSizes={[25, 10, 50]}
          empty={{ title: 'Tidak ada registrasi', description: 'Tidak ada registrasi sesuai filter. Ubah tanggal atau buat pendaftaran baru.' }}
        />
      </div>
    </div>
  );
}
