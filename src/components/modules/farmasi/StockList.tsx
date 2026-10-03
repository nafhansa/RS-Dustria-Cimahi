import { useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { ClipboardList, Download, PackagePlus, Pencil, Plus, SlidersHorizontal } from 'lucide-preact';
import { downloadCsv } from '../../../lib/csv';
import { MED_CATEGORY_LABEL, MED_FORM_LABEL } from '../../../lib/constants';
import { dateShort, rupiah } from '../../../lib/format';
import { nearestExpiry, stockStatus, STOCK_STATUS, totalStock } from '../../../lib/stock';
import type { Medicine, MedicineCategory, MedicineForm } from '../../../lib/types';
import { $medicines } from '../../../stores/db';
import { adjustStock, saveMedicine, type MedicineInput } from '../../../stores/actions';
import { toast } from '../../../stores/ui';
import { Badge, StatusPill } from '../../ui/Badge';
import { DataTable, type Column } from '../../ui/DataTable';
import { PageHeader, StatCard } from '../../ui/Display';
import { Input, RadioGroup, Select } from '../../ui/Field';
import { Modal } from '../../ui/Modal';
import { TagInput } from '../../ui/TagInput';
import { run, useReady } from '../../ui/hooks';
import { SearchInput } from '../shared';
import { AlertTriangle, Package, PackageX } from 'lucide-preact';

const EMPTY: MedicineInput = { code: '', name: '', genericName: '', category: 'GENERIK', form: 'TABLET', unit: 'tablet', sellPrice: 0, minStock: 50, allergyTags: [], active: true };

export default function StockList() {
  const ready = useReady();
  const meds = useStore($medicines);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [status, setStatus] = useState(() => (typeof location !== 'undefined' ? new URLSearchParams(location.search).get('status') ?? '' : ''));
  const [form, setFormF] = useState('');
  const [edit, setEdit] = useState<MedicineInput | null>(null);
  const [editErr, setEditErr] = useState<Record<string, string>>({});
  const [adj, setAdj] = useState<Medicine | null>(null);
  const [adjForm, setAdjForm] = useState({ dir: 'IN' as 'IN' | 'OUT', qty: '', reason: '', batchNo: '', expiry: '' });

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return meds.filter((m) => {
      if (t && !(m.name.toLowerCase().includes(t) || m.code.toLowerCase().includes(t) || (m.genericName ?? '').toLowerCase().includes(t))) return false;
      if (cat && m.category !== cat) return false;
      if (form && m.form !== form) return false;
      if (status && stockStatus(m) !== status) return false;
      return true;
    });
  }, [meds, q, cat, status, form]);

  const counts = useMemo(() => {
    const c = { AMAN: 0, MENIPIS: 0, HABIS: 0, HAMPIR_ED: 0 };
    for (const m of meds) c[stockStatus(m)]++;
    return c;
  }, [meds]);

  const openNew = () => {
    const nextCode = `OBT-${String(meds.reduce((mx, m) => Math.max(mx, Number(m.code.replace(/\D/g, '')) || 0), 0) + 1).padStart(3, '0')}`;
    setEditErr({});
    setEdit({ ...EMPTY, code: nextCode });
  };

  const saveEdit = () => {
    if (!edit) return;
    const e: Record<string, string> = {};
    if (!edit.name.trim()) e.name = 'Nama obat wajib diisi';
    if (!edit.code.trim()) e.code = 'Kode wajib diisi';
    if (!(edit.sellPrice > 0)) e.sellPrice = 'Harga jual harus lebih dari 0';
    setEditErr(e);
    if (Object.keys(e).length) return;
    if (run(() => saveMedicine(edit), edit.id ? 'Data obat diperbarui' : 'Obat baru ditambahkan', edit.name)) setEdit(null);
  };

  const saveAdj = () => {
    if (!adj) return;
    const qty = Number(adjForm.qty);
    if (!(qty > 0)) return toast('Jumlah harus lebih dari 0', { tone: 'warning' });
    if (!adjForm.reason.trim()) return toast('Alasan penyesuaian wajib diisi', { tone: 'warning' });
    const delta = adjForm.dir === 'IN' ? qty : -qty;
    if (run(() => adjustStock(adj.id, delta, adjForm.reason, adjForm.dir === 'IN' ? { batchNo: adjForm.batchNo, expiry: adjForm.expiry } : undefined), 'Stok disesuaikan', `${adj.name}: ${delta > 0 ? '+' : ''}${delta} ${adj.unit}`)) setAdj(null);
  };

  const columns: Column<Medicine>[] = [
    { key: 'code', header: 'Kode', sort: (m) => m.code, render: (m) => <span class="tabular text-sm text-muted">{m.code}</span> },
    {
      key: 'name',
      header: 'Nama Obat',
      sort: (m) => m.name,
      render: (m) => (
        <a href={`/app/farmasi/stok/detail?id=${m.id}`} class="group">
          <p class={`font-medium group-hover:text-primary ${m.active === false ? 'text-subtle line-through' : ''}`}>{m.name}</p>
          <p class="text-xs text-muted">{m.genericName}</p>
        </a>
      ),
    },
    { key: 'cat', header: 'Golongan', sort: (m) => m.category, render: (m) => <Badge tone={m.category === 'NARKOTIKA' || m.category === 'PSIKOTROPIKA' ? 'danger' : m.category === 'OTC' ? 'success' : 'neutral'}>{MED_CATEGORY_LABEL[m.category]}</Badge> },
    { key: 'form', header: 'Sediaan', render: (m) => `${MED_FORM_LABEL[m.form]} / ${m.unit}` },
    { key: 'stock', header: 'Stok', class: 'num text-right', headerClass: 'text-right', sort: (m) => totalStock(m), render: (m) => <span class="font-semibold">{totalStock(m)}</span> },
    { key: 'min', header: 'Min', class: 'num text-right text-muted', headerClass: 'text-right', render: (m) => m.minStock },
    { key: 'price', header: 'Harga Jual', class: 'num text-right', headerClass: 'text-right', sort: (m) => m.sellPrice, render: (m) => rupiah(m.sellPrice) },
    { key: 'ed', header: 'ED Terdekat', sort: (m) => nearestExpiry(m) ?? '9999', render: (m) => <span class="tabular text-sm">{dateShort(nearestExpiry(m))}</span> },
    { key: 'st', header: 'Status', sort: (m) => stockStatus(m), render: (m) => <StatusPill status={STOCK_STATUS[stockStatus(m)]} /> },
    {
      key: 'act',
      header: <span class="sr-only">Aksi</span>,
      class: 'text-right',
      render: (m) => (
        <div class="flex justify-end gap-1">
          <button type="button" class="btn-icon h-8 w-8" title="Edit" aria-label={`Edit ${m.name}`} onClick={() => { setEditErr({}); setEdit({ ...m }); }}>
            <Pencil size={16} />
          </button>
          <button type="button" class="btn-icon h-8 w-8" title="Penyesuaian stok" aria-label={`Penyesuaian stok ${m.name}`} onClick={() => { setAdj(m); setAdjForm({ dir: 'IN', qty: '', reason: '', batchNo: '', expiry: '' }); }}>
            <SlidersHorizontal size={16} />
          </button>
          <a href={`/app/farmasi/stok/detail?id=${m.id}`} class="btn-icon h-8 w-8" title="Lihat kartu stok" aria-label={`Kartu stok ${m.name}`}>
            <ClipboardList size={16} />
          </a>
        </div>
      ),
    },
  ];

  const exportCsv = () => {
    downloadCsv('stok-obat', ['Kode', 'Nama', 'Generik', 'Golongan', 'Sediaan', 'Satuan', 'Stok', 'Stok Min', 'Harga Jual', 'ED Terdekat', 'Status'], rows.map((m) => [m.code, m.name, m.genericName, m.category, m.form, m.unit, totalStock(m), m.minStock, m.sellPrice, nearestExpiry(m), STOCK_STATUS[stockStatus(m)].label]));
    toast('Export CSV berhasil', { message: `${rows.length} obat` });
  };

  return (
    <div>
      <PageHeader
        title="Stok Obat"
        subtitle="Persediaan farmasi per batch dengan pemantauan stok minimum dan kedaluwarsa (ED)."
        actions={
          <>
            <button type="button" class="btn btn-secondary" onClick={exportCsv}>
              <Download size={16} /> Export
            </button>
            <a href="/app/farmasi/penerimaan" class="btn btn-secondary">
              <PackagePlus size={16} /> Penerimaan Barang
            </a>
            <button type="button" class="btn btn-primary" onClick={openNew}>
              <Plus size={16} /> Tambah Obat
            </button>
          </>
        }
      />
      <div class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button type="button" class="text-left" onClick={() => setStatus('')}><StatCard label="Total item obat" value={meds.length} icon={<Package size={20} />} tone="info" /></button>
        <button type="button" class="text-left" onClick={() => setStatus('MENIPIS')}><StatCard label="Stok menipis" value={counts.MENIPIS} icon={<AlertTriangle size={20} />} tone="warning" /></button>
        <button type="button" class="text-left" onClick={() => setStatus('HABIS')}><StatCard label="Stok habis" value={counts.HABIS} icon={<PackageX size={20} />} /></button>
        <button type="button" class="text-left" onClick={() => setStatus('HAMPIR_ED')}><StatCard label="Hampir kedaluwarsa (≤ 90 hari)" value={counts.HAMPIR_ED} icon={<AlertTriangle size={20} />} tone="warning" /></button>
      </div>
      <div class="card">
        <div class="flex flex-wrap gap-3 border-b border-border p-4">
          <SearchInput class="min-w-[240px] flex-1" value={q} onValue={setQ} placeholder="Cari nama, generik, kode..." />
          <select class="input w-auto" value={cat} onChange={(e) => setCat((e.target as HTMLSelectElement).value)} aria-label="Filter golongan">
            <option value="">Semua golongan</option>
            {Object.entries(MED_CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select class="input w-auto" value={form} onChange={(e) => setFormF((e.target as HTMLSelectElement).value)} aria-label="Filter bentuk sediaan">
            <option value="">Semua sediaan</option>
            {Object.entries(MED_FORM_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select class="input w-auto" value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value)} aria-label="Filter status">
            <option value="">Semua status</option>
            {Object.entries(STOCK_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <DataTable columns={columns} rows={rows} rowKey={(m) => m.id} loading={!ready} pageSizes={[25, 50, 10]} initialSort={{ key: 'name', dir: 'asc' }} />
      </div>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? `Edit Obat · ${edit.code}` : 'Tambah Obat'}
        size="lg"
        footer={
          <>
            <button type="button" class="btn btn-secondary" onClick={() => setEdit(null)}>
              Batal
            </button>
            <button type="button" class="btn btn-primary" onClick={saveEdit}>
              Simpan
            </button>
          </>
        }
      >
        {edit && (
          <div class="grid gap-4 sm:grid-cols-2">
            <Input label="Kode" required value={edit.code} onValue={(v) => setEdit({ ...edit, code: v })} error={editErr.code} disabled={!!edit.id} />
            <Input label="Nama obat" required data-autofocus value={edit.name} onValue={(v) => setEdit({ ...edit, name: v })} error={editErr.name} />
            <Input label="Nama generik" value={edit.genericName ?? ''} onValue={(v) => setEdit({ ...edit, genericName: v })} hint="Dipakai untuk mencari obat setara (substitusi)" />
            <Select label="Golongan" value={edit.category} onValue={(v) => setEdit({ ...edit, category: v as MedicineCategory })} options={Object.entries(MED_CATEGORY_LABEL).map(([value, label]) => ({ value, label }))} />
            <Select label="Bentuk sediaan" value={edit.form} onValue={(v) => setEdit({ ...edit, form: v as MedicineForm })} options={Object.entries(MED_FORM_LABEL).map(([value, label]) => ({ value, label }))} />
            <Input label="Satuan" value={edit.unit} onValue={(v) => setEdit({ ...edit, unit: v })} placeholder="tablet, botol, tube" />
            <Input label="Harga jual (Rp)" type="number" min={0} value={String(edit.sellPrice)} onValue={(v) => setEdit({ ...edit, sellPrice: Number(v) || 0 })} error={editErr.sellPrice} />
            <Input label="Stok minimum" type="number" min={0} value={String(edit.minStock)} onValue={(v) => setEdit({ ...edit, minStock: Number(v) || 0 })} />
            <div class="sm:col-span-2">
              <TagInput label="Tag alergi / golongan" value={edit.allergyTags} onChange={(v) => setEdit({ ...edit, allergyTags: v })} hint="Contoh: penisilin, nsaid, sulfa. Dipakai untuk peringatan alergi saat peresepan." />
            </div>
            <label class="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" class="checkbox" checked={edit.active !== false} onChange={(e) => setEdit({ ...edit, active: (e.target as HTMLInputElement).checked })} /> Aktif (dapat diresepkan)
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={!!adj}
        onClose={() => setAdj(null)}
        title="Penyesuaian Stok"
        description={adj ? `${adj.name} · stok saat ini ${totalStock(adj)} ${adj.unit}` : ''}
        footer={
          <>
            <button type="button" class="btn btn-secondary" onClick={() => setAdj(null)}>
              Batal
            </button>
            <button type="button" class="btn btn-primary" onClick={saveAdj}>
              Simpan Penyesuaian
            </button>
          </>
        }
      >
        <div class="grid gap-4">
          <RadioGroup
            name="adj-dir"
            value={adjForm.dir}
            onValue={(v) => setAdjForm({ ...adjForm, dir: v })}
            options={[
              { value: 'IN', label: 'Tambah (+)' },
              { value: 'OUT', label: 'Kurangi (-)' },
            ]}
          />
          <Input label={`Jumlah (${adj?.unit ?? ''})`} type="number" min={1} required data-autofocus value={adjForm.qty} onValue={(v) => setAdjForm({ ...adjForm, qty: v })} hint={adjForm.dir === 'OUT' ? 'Pengurangan memakai FEFO (batch ED terdekat).' : undefined} />
          {adjForm.dir === 'IN' && (
            <div class="grid gap-4 sm:grid-cols-2">
              <Input label="No batch (opsional)" value={adjForm.batchNo} onValue={(v) => setAdjForm({ ...adjForm, batchNo: v })} hint="Kosongkan untuk batch penyesuaian baru" />
              <Input label="Kedaluwarsa" type="date" value={adjForm.expiry} onValue={(v) => setAdjForm({ ...adjForm, expiry: v })} />
            </div>
          )}
          <Select
            label="Alasan"
            required
            value={adjForm.reason}
            onValue={(v) => setAdjForm({ ...adjForm, reason: v })}
            options={['Stock opname (selisih hitung)', 'Obat rusak/pecah', 'Obat kedaluwarsa dimusnahkan', 'Retur ke distributor', 'Koreksi input', 'Hibah/donasi']}
            placeholder="Pilih alasan"
          />
        </div>
      </Modal>
    </div>
  );
}
