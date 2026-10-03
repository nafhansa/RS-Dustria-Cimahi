import { useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { ArrowRight, Package, PackagePlus } from 'lucide-preact';
import { RX_STATUS } from '../../../lib/constants';
import { dateShort, timeHM } from '../../../lib/format';
import type { Prescription, RxStatus } from '../../../lib/types';
import { $prescriptions, $visits } from '../../../stores/db';
import { $doctorMap, $patientMap, $poliMap } from '../../../stores/selectors';
import { StatusPill } from '../../ui/Badge';
import { DataTable, type Column } from '../../ui/DataTable';
import { PageHeader } from '../../ui/Display';
import { Tabs } from '../../ui/Tabs';
import { useReady } from '../../ui/hooks';
import { AllergyBadge, PayerBadge, SearchInput } from '../shared';
import { todayStr } from '../../../lib/date';

const TABS: RxStatus[] = ['BARU', 'DITELAAH', 'DISIAPKAN', 'SIAP', 'DISERAHKAN', 'BATAL'];

export default function PharmacyQueue() {
  const ready = useReady();
  const rxs = useStore($prescriptions);
  const visits = useStore($visits);
  const pMap = useStore($patientMap);
  const docMap = useStore($doctorMap);
  const poliMap = useStore($poliMap);
  const [tab, setTab] = useState<RxStatus>('BARU');
  const [q, setQ] = useState('');
  const [todayOnly, setTodayOnly] = useState(true);
  const visitMap = useMemo(() => new Map(visits.map((v) => [v.id, v])), [visits]);

  const t = todayStr();
  const base = rxs.filter((r) => !todayOnly || r.createdAt.startsWith(t) || ['BARU', 'DITELAAH', 'DISIAPKAN', 'SIAP'].includes(r.status));
  const counts = Object.fromEntries(TABS.map((s) => [s, base.filter((r) => r.status === s).length]));
  const rows = base.filter((r) => {
    if (r.status !== tab) return false;
    const term = q.trim().toLowerCase();
    if (!term) return true;
    const p = pMap.get(r.patientId);
    return r.rxNo.toLowerCase().includes(term) || !!p?.name.toLowerCase().includes(term) || !!p?.mrn.toLowerCase().includes(term);
  });

  const columns: Column<Prescription>[] = [
    { key: 'no', header: 'No Resep', sort: (r) => r.rxNo, render: (r) => <span class="tabular font-semibold">{r.rxNo}</span> },
    { key: 'time', header: 'Waktu', sort: (r) => r.createdAt, render: (r) => <span class="tabular">{r.createdAt.startsWith(t) ? timeHM(r.createdAt) : `${dateShort(r.createdAt)} ${timeHM(r.createdAt)}`}</span> },
    {
      key: 'p',
      header: 'Pasien',
      sort: (r) => pMap.get(r.patientId)?.name ?? '',
      render: (r) => {
        const p = pMap.get(r.patientId);
        return p ? (
          <div class="flex flex-wrap items-center gap-2">
            <div>
              <p class="font-medium">{p.name}</p>
              <p class="tabular text-xs text-muted">{p.mrn}</p>
            </div>
            <AllergyBadge allergies={p.allergies} />
          </div>
        ) : (
          '-'
        );
      },
    },
    { key: 'doc', header: 'Dokter', render: (r) => <span class="text-sm">{docMap.get(r.doctorId)?.name}</span> },
    { key: 'poli', header: 'Poli', render: (r) => poliMap.get(visitMap.get(r.visitId)?.poliId ?? '')?.name },
    { key: 'items', header: 'Item', class: 'num text-right', headerClass: 'text-right', render: (r) => r.items.length },
    { key: 'payer', header: 'Penjamin', render: (r) => { const v = visitMap.get(r.visitId); return v ? <PayerBadge payer={v.payer} /> : '-'; } },
    { key: 'st', header: 'Status', render: (r) => <StatusPill status={RX_STATUS[r.status]} /> },
    {
      key: 'act',
      header: <span class="sr-only">Aksi</span>,
      class: 'text-right',
      render: (r) => (
        <a href={`/app/farmasi/resep?id=${r.id}`} class={`btn btn-sm ${['BARU', 'DITELAAH', 'DISIAPKAN', 'SIAP'].includes(r.status) ? 'btn-primary' : 'btn-secondary'}`}>
          {['DISERAHKAN', 'BATAL'].includes(r.status) ? 'Lihat' : 'Proses'} <ArrowRight size={14} />
        </a>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Farmasi · Resep Masuk"
        subtitle="Antrian e-resep dari poliklinik. Proses: telaah → siapkan (stok berkurang FEFO) → etiket → serahkan."
        actions={
          <>
            <a href="/app/farmasi/stok" class="btn btn-secondary">
              <Package size={16} /> Stok Obat
            </a>
            <a href="/app/farmasi/penerimaan" class="btn btn-secondary">
              <PackagePlus size={16} /> Penerimaan Barang
            </a>
          </>
        }
      />
      <div class="card">
        <Tabs class="px-3" value={tab} onChange={setTab} tabs={TABS.map((s) => ({ key: s, label: RX_STATUS[s].label, count: counts[s] }))} />
        <div class="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchInput class="min-w-[240px] flex-1" value={q} onValue={setQ} placeholder="Cari no resep, nama, No RM..." />
          <label class="inline-flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" class="checkbox" checked={todayOnly} onChange={(e) => setTodayOnly((e.target as HTMLInputElement).checked)} /> Hanya hari ini (resep aktif selalu tampil)
          </label>
        </div>
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} loading={!ready} initialSort={{ key: 'time', dir: tab === 'DISERAHKAN' ? 'desc' : 'asc' }} empty={{ title: `Tidak ada resep berstatus ${RX_STATUS[tab].label}` }} />
      </div>
    </div>
  );
}
