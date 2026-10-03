import { useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { Pencil, Plus, Power } from 'lucide-preact';
import { PROC_CATEGORY_LABEL } from '../../../lib/constants';
import { rupiah } from '../../../lib/format';
import type { ProcedureCategory, ProcedureMaster } from '../../../lib/types';
import { $procedureMaster } from '../../../stores/db';
import { saveProcedureMaster, toggleMasterActive } from '../../../stores/actions';
import { confirmDialog } from '../../../stores/ui';
import { Badge } from '../../ui/Badge';
import { DataTable, type Column } from '../../ui/DataTable';
import { PageHeader } from '../../ui/Display';
import { Input, Select, Switch } from '../../ui/Field';
import { Modal } from '../../ui/Modal';
import { run, useReady } from '../../ui/hooks';
import { SearchInput } from '../shared';

type Form = Omit<ProcedureMaster, 'id'> & { id?: string };
const EMPTY: Form = { code: '', name: '', category: 'MEDIS', priceUmum: 0, priceBpjs: 0, active: true };

export default function ProcedureMasterPage() {
  const ready = useReady();
  const items = useStore($procedureMaster);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter((p) => (!cat || p.category === cat) && (!t || p.name.toLowerCase().includes(t) || p.code.toLowerCase().includes(t)));
  }, [items, q, cat]);

  const toggle = async (p: ProcedureMaster) => {
    const r = await confirmDialog({
      title: `${p.active ? 'Nonaktifkan' : 'Aktifkan'} ${p.name}?`,
      message: p.active ? 'Tindakan nonaktif tidak bisa dipilih dokter atau perawat. Riwayat tetap tersimpan.' : 'Tindakan akan kembali tersedia.',
      confirmLabel: p.active ? 'Nonaktifkan' : 'Aktifkan',
      tone: p.active ? 'danger' : 'primary',
    });
    if (r.ok) run(() => toggleMasterActive('procedures', p.id), p.active ? 'Tindakan dinonaktifkan' : 'Tindakan diaktifkan', p.name);
  };

  const save = () => {
    if (!form) return;
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = 'Kode wajib diisi';
    if (!form.name.trim()) e.name = 'Nama wajib diisi';
    if (!(form.priceUmum >= 0)) e.priceUmum = 'Tarif tidak valid';
    if (items.some((p) => p.code === form.code.trim() && p.id !== form.id)) e.code = 'Kode sudah dipakai';
    setErr(e);
    if (Object.keys(e).length) return;
    if (run(() => saveProcedureMaster({ ...form, code: form.code.trim(), name: form.name.trim() }), form.id ? 'Master tindakan diperbarui' : 'Master tindakan ditambahkan', form.name)) setForm(null);
  };

  const columns: Column<ProcedureMaster>[] = [
    { key: 'code', header: 'Kode', sort: (p) => p.code, render: (p) => <span class="tabular font-medium text-primary">{p.code}</span> },
    { key: 'name', header: 'Nama Tindakan', sort: (p) => p.name, render: (p) => <span class={p.active ? '' : 'text-subtle line-through'}>{p.name}</span> },
    { key: 'cat', header: 'Kategori', sort: (p) => p.category, render: (p) => <Badge>{PROC_CATEGORY_LABEL[p.category]}</Badge> },
    { key: 'umum', header: 'Tarif Umum', class: 'num text-right', headerClass: 'text-right', sort: (p) => p.priceUmum, render: (p) => rupiah(p.priceUmum) },
    { key: 'bpjs', header: 'Tarif BPJS', class: 'num text-right', headerClass: 'text-right', render: (p) => (p.priceBpjs === 0 ? <span class="text-success-strong">Paket INA-CBG</span> : rupiah(p.priceBpjs)) },
    { key: 'st', header: 'Status', render: (p) => <Badge tone={p.active ? 'success' : 'neutral'}>{p.active ? 'Aktif' : 'Nonaktif'}</Badge> },
    {
      key: 'act',
      header: <span class="sr-only">Aksi</span>,
      class: 'text-right',
      render: (p) => (
        <div class="flex justify-end gap-1">
          <button type="button" class="btn-icon h-8 w-8" aria-label={`Edit ${p.name}`} title="Edit" onClick={() => { setErr({}); setForm({ ...p }); }}>
            <Pencil size={16} />
          </button>
          <button type="button" class={`btn-icon h-8 w-8 ${p.active ? 'hover:text-danger' : 'hover:text-success'}`} aria-label={`${p.active ? 'Nonaktifkan' : 'Aktifkan'} ${p.name}`} title={p.active ? 'Nonaktifkan' : 'Aktifkan'} onClick={() => toggle(p)}>
            <Power size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Master Tarif Tindakan"
        subtitle="Daftar tindakan (ICD-9-CM) beserta tarif umum dan BPJS."
        actions={
          <button type="button" class="btn btn-primary" onClick={() => { setErr({}); setForm({ ...EMPTY }); }}>
            <Plus size={16} /> Tambah
          </button>
        }
      />
      <div class="card">
        <div class="flex flex-wrap gap-3 border-b border-border p-4">
          <SearchInput class="min-w-[240px] flex-1" value={q} onValue={setQ} placeholder="Cari kode atau nama tindakan..." />
          <select class="input w-auto" value={cat} onChange={(e) => setCat((e.target as HTMLSelectElement).value)} aria-label="Filter kategori">
            <option value="">Semua kategori</option>
            {Object.entries(PROC_CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <DataTable columns={columns} rows={rows} rowKey={(p) => p.id} loading={!ready} pageSizes={[25, 50]} />
      </div>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? 'Edit Tindakan' : 'Tambah Tindakan'}
        footer={
          <>
            <button type="button" class="btn btn-secondary" onClick={() => setForm(null)}>
              Batal
            </button>
            <button type="button" class="btn btn-primary" onClick={save}>
              Simpan
            </button>
          </>
        }
      >
        {form && (
          <div class="grid gap-4 sm:grid-cols-2">
            <Input label="Kode ICD-9-CM" required data-autofocus value={form.code} onValue={(v) => setForm({ ...form, code: v })} error={err.code} />
            <Select label="Kategori" value={form.category} onValue={(v) => setForm({ ...form, category: v as ProcedureCategory })} options={Object.entries(PROC_CATEGORY_LABEL).map(([value, label]) => ({ value, label }))} />
            <Input class="sm:col-span-2" label="Nama tindakan" required value={form.name} onValue={(v) => setForm({ ...form, name: v })} error={err.name} />
            <Input label="Tarif umum (Rp)" type="number" min={0} step={1000} value={String(form.priceUmum)} onValue={(v) => setForm({ ...form, priceUmum: Number(v) || 0 })} error={err.priceUmum} />
            <Input label="Tarif BPJS (Rp)" type="number" min={0} step={1000} value={String(form.priceBpjs)} onValue={(v) => setForm({ ...form, priceBpjs: Number(v) || 0 })} hint="0 = ditanggung paket INA-CBG" />
            <Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Aktif" />
          </div>
        )}
      </Modal>
    </div>
  );
}
