import { useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { ArrowRight, BarChart3 } from 'lucide-preact';
import { invoiceTotals } from '../../../lib/billing';
import { INVOICE_STATUS } from '../../../lib/constants';
import { todayStr } from '../../../lib/date';
import { dateShort, rupiah, timeHM } from '../../../lib/format';
import type { Invoice } from '../../../lib/types';
import { $invoices, $payments, $visits } from '../../../stores/db';
import { $patientMap } from '../../../stores/selectors';
import { StatusPill } from '../../ui/Badge';
import { DataTable, type Column } from '../../ui/DataTable';
import { PageHeader } from '../../ui/Display';
import { Tabs } from '../../ui/Tabs';
import { useReady } from '../../ui/hooks';
import { PayerBadge, SearchInput } from '../shared';

type TabKey = 'open' | 'SEBAGIAN' | 'LUNAS' | 'BATAL';

export default function InvoiceList() {
  const ready = useReady();
  const invoices = useStore($invoices);
  const payments = useStore($payments);
  const visits = useStore($visits);
  const pMap = useStore($patientMap);
  const [tab, setTab] = useState<TabKey>('open');
  const [q, setQ] = useState('');
  const [date, setDate] = useState(todayStr());
  const [payer, setPayer] = useState('');
  const visitMap = useMemo(() => new Map(visits.map((v) => [v.id, v])), [visits]);

  const match = (i: Invoice, k: TabKey) => (k === 'open' ? i.status === 'BELUM_BAYAR' || i.status === 'DRAFT' : i.status === k);
  const base = invoices.filter((i) => {
    if (date && !i.createdAt.startsWith(date) && !(i.status === 'BELUM_BAYAR' || i.status === 'SEBAGIAN')) return false;
    if (payer && visitMap.get(i.visitId)?.payer.type !== payer) return false;
    const t = q.trim().toLowerCase();
    if (t) {
      const p = pMap.get(i.patientId);
      if (!(i.invoiceNo.toLowerCase().includes(t) || p?.name.toLowerCase().includes(t) || p?.mrn.toLowerCase().includes(t))) return false;
    }
    return true;
  });
  const rows = base.filter((i) => match(i, tab));
  const count = (k: TabKey) => base.filter((i) => match(i, k)).length;

  const columns: Column<Invoice>[] = [
    { key: 'no', header: 'No Invoice', sort: (i) => i.invoiceNo, render: (i) => <span class="tabular font-semibold">{i.invoiceNo}</span> },
    { key: 'date', header: 'Tanggal', sort: (i) => i.createdAt, render: (i) => <span class="tabular">{dateShort(i.createdAt)} {timeHM(i.createdAt)}</span> },
    { key: 'p', header: 'Pasien', sort: (i) => pMap.get(i.patientId)?.name ?? '', render: (i) => { const p = pMap.get(i.patientId); return <div><p class="font-medium">{p?.name}</p><p class="tabular text-xs text-muted">{p?.mrn}</p></div>; } },
    { key: 'payer', header: 'Penjamin', render: (i) => { const v = visitMap.get(i.visitId); return v ? <PayerBadge payer={v.payer} /> : '-'; } },
    { key: 'total', header: 'Total', class: 'num text-right', headerClass: 'text-right', sort: (i) => invoiceTotals(i).subtotal, render: (i) => rupiah(invoiceTotals(i).subtotal) },
    { key: 'cov', header: 'Ditanggung', class: 'num text-right text-success-strong', headerClass: 'text-right', render: (i) => rupiah(invoiceTotals(i).covered) },
    { key: 'due', header: 'Harus Dibayar', class: 'num text-right font-semibold', headerClass: 'text-right', sort: (i) => invoiceTotals(i, payments).remaining, render: (i) => { const t = invoiceTotals(i, payments); return i.status === 'LUNAS' ? rupiah(t.due) : rupiah(t.remaining); } },
    { key: 'st', header: 'Status', render: (i) => <StatusPill status={INVOICE_STATUS[i.status]} /> },
    {
      key: 'act',
      header: <span class="sr-only">Aksi</span>,
      class: 'text-right',
      render: (i) => (
        <a href={`/app/kasir/tagihan?id=${i.id}`} class={`btn btn-sm ${i.status === 'BELUM_BAYAR' || i.status === 'SEBAGIAN' ? 'btn-primary' : 'btn-secondary'}`}>
          {i.status === 'BELUM_BAYAR' || i.status === 'SEBAGIAN' ? 'Proses' : 'Lihat'} <ArrowRight size={14} />
        </a>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Kasir · Tagihan"
        subtitle="Tagihan dibuat otomatis saat pendaftaran dan bertambah dari tindakan serta obat. Tagihan draft dapat dibayar setelah pelayanan selesai."
        actions={
          <a href="/app/kasir/rekap" class="btn btn-secondary">
            <BarChart3 size={16} /> Rekap Kas Harian
          </a>
        }
      />
      <div class="card">
        <Tabs
          class="px-3"
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'open', label: 'Belum Dibayar', count: count('open') },
            { key: 'SEBAGIAN', label: 'Sebagian', count: count('SEBAGIAN') },
            { key: 'LUNAS', label: 'Lunas', count: count('LUNAS') },
            { key: 'BATAL', label: 'Batal', count: count('BATAL') },
          ]}
        />
        <div class="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchInput class="min-w-[240px] flex-1" value={q} onValue={setQ} placeholder="Cari no invoice, nama, No RM..." />
          <div class="flex items-center gap-2">
            <input type="date" class="input w-auto" value={date} onInput={(e) => setDate((e.target as HTMLInputElement).value)} aria-label="Filter tanggal" />
            {date && (
              <button type="button" class="btn btn-ghost btn-sm" onClick={() => setDate('')}>
                Semua tanggal
              </button>
            )}
          </div>
          <select class="input w-auto" value={payer} onChange={(e) => setPayer((e.target as HTMLSelectElement).value)} aria-label="Filter penjamin">
            <option value="">Semua penjamin</option>
            <option value="UMUM">Umum</option>
            <option value="BPJS">BPJS</option>
            <option value="ASURANSI">Asuransi</option>
          </select>
        </div>
        <DataTable columns={columns} rows={rows} rowKey={(i) => i.id} loading={!ready} initialSort={{ key: 'date', dir: 'desc' }} pageSizes={[25, 10, 50]} empty={{ title: 'Tidak ada tagihan', description: 'Ubah filter tanggal untuk melihat tagihan lain.' }} />
      </div>
    </div>
  );
}
