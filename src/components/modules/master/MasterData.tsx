import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { Pencil, Plus, Power } from 'lucide-preact';
import { DAY_NAMES, PAYER_LABEL, ROLE_LABEL } from '../../../lib/constants';
import { $doctors, $insurers, $polis, $schedules, $users } from '../../../stores/db';
import { $doctorMap, $poliMap } from '../../../stores/selectors';
import { saveMaster, toggleMasterActive } from '../../../stores/actions';
import { confirmDialog } from '../../../stores/ui';
import { Badge } from '../../ui/Badge';
import { DataTable, type Column } from '../../ui/DataTable';
import { Avatar, PageHeader } from '../../ui/Display';
import { Input, Select } from '../../ui/Field';
import { Modal } from '../../ui/Modal';
import { Tabs } from '../../ui/Tabs';
import { run, useReady } from '../../ui/hooks';

type Kind = 'doctors' | 'polis' | 'schedules' | 'insurers' | 'users';
type Row = { id: string; active?: boolean } & Record<string, unknown>;
interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'time' | 'select';
  options?: { value: string; label: string }[];
  required?: boolean;
}

export default function MasterData() {
  const ready = useReady();
  const doctors = useStore($doctors);
  const polis = useStore($polis);
  const schedules = useStore($schedules);
  const insurers = useStore($insurers);
  const users = useStore($users);
  const docMap = useStore($doctorMap);
  const poliMap = useStore($poliMap);
  const [tab, setTab] = useState<Kind>('doctors');
  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});

  const poliOpts = polis.map((p) => ({ value: p.id, label: p.name }));
  const docOpts = doctors.map((d) => ({ value: d.id, label: d.name }));

  const CONFIG: Record<Kind, { label: string; rows: Row[]; fields: FieldDef[]; columns: Column<Row>[]; numeric?: string[] }> = {
    doctors: {
      label: 'Dokter',
      rows: doctors as unknown as Row[],
      fields: [
        { key: 'name', label: 'Nama lengkap & gelar', required: true },
        { key: 'specialty', label: 'Spesialisasi', required: true },
        { key: 'sip', label: 'No SIP', required: true },
        { key: 'poliId', label: 'Poli', type: 'select', options: poliOpts, required: true },
      ],
      columns: [
        { key: 'name', header: 'Dokter', sort: (r) => String(r.name), render: (r) => <span class="flex items-center gap-2.5"><Avatar name={String(r.name)} size={32} /><span><span class="block font-medium">{String(r.name)}</span><span class="block text-xs text-muted">{String(r.specialty)}</span></span></span> },
        { key: 'sip', header: 'SIP', render: (r) => <span class="tabular text-sm">{String(r.sip)}</span> },
        { key: 'poli', header: 'Poli', sort: (r) => poliMap.get(String(r.poliId))?.name ?? '', render: (r) => poliMap.get(String(r.poliId))?.name },
      ],
    },
    polis: {
      label: 'Poli',
      rows: polis as unknown as Row[],
      fields: [
        { key: 'code', label: 'Kode', required: true },
        { key: 'name', label: 'Nama poli', required: true },
        { key: 'queuePrefix', label: 'Prefix antrian (1 huruf)', required: true },
        { key: 'slug', label: 'Slug URL', required: true },
        { key: 'description', label: 'Deskripsi' },
      ],
      columns: [
        { key: 'code', header: 'Kode', render: (r) => <span class="tabular">{String(r.code)}</span> },
        { key: 'name', header: 'Nama', sort: (r) => String(r.name), render: (r) => <span class="font-medium">{String(r.name)}</span> },
        { key: 'prefix', header: 'Prefix Antrian', render: (r) => <Badge tone="primary">{String(r.queuePrefix)}-001</Badge> },
        { key: 'desc', header: 'Deskripsi', render: (r) => <span class="line-clamp-1 max-w-md text-sm text-muted">{String(r.description ?? '')}</span> },
      ],
    },
    schedules: {
      label: 'Jadwal Dokter',
      rows: schedules as unknown as Row[],
      numeric: ['day', 'quota'],
      fields: [
        { key: 'doctorId', label: 'Dokter', type: 'select', options: docOpts, required: true },
        { key: 'day', label: 'Hari', type: 'select', options: DAY_NAMES.map((d, i) => ({ value: String(i), label: d })), required: true },
        { key: 'start', label: 'Jam mulai', type: 'time', required: true },
        { key: 'end', label: 'Jam selesai', type: 'time', required: true },
        { key: 'quota', label: 'Kuota pasien', type: 'number', required: true },
      ],
      columns: [
        { key: 'doc', header: 'Dokter', sort: (r) => docMap.get(String(r.doctorId))?.name ?? '', render: (r) => <span class="font-medium">{docMap.get(String(r.doctorId))?.name}</span> },
        { key: 'poli', header: 'Poli', render: (r) => poliMap.get(docMap.get(String(r.doctorId))?.poliId ?? '')?.name },
        { key: 'day', header: 'Hari', sort: (r) => Number(r.day), render: (r) => DAY_NAMES[Number(r.day)] },
        { key: 'time', header: 'Jam', render: (r) => <span class="tabular">{String(r.start).replace(':', '.')} - {String(r.end).replace(':', '.')}</span> },
        { key: 'quota', header: 'Kuota', class: 'num text-right', headerClass: 'text-right', render: (r) => String(r.quota) },
      ],
    },
    insurers: {
      label: 'Penjamin',
      rows: insurers as unknown as Row[],
      numeric: ['coveragePct'],
      fields: [
        { key: 'name', label: 'Nama penjamin', required: true },
        { key: 'type', label: 'Tipe', type: 'select', options: Object.entries(PAYER_LABEL).map(([value, label]) => ({ value, label })), required: true },
        { key: 'coveragePct', label: 'Coverage (%)', type: 'number', required: true },
      ],
      columns: [
        { key: 'name', header: 'Nama', sort: (r) => String(r.name), render: (r) => <span class="font-medium">{String(r.name)}</span> },
        { key: 'type', header: 'Tipe', render: (r) => <Badge tone={r.type === 'BPJS' ? 'success' : r.type === 'ASURANSI' ? 'info' : 'neutral'}>{PAYER_LABEL[r.type as keyof typeof PAYER_LABEL]}</Badge> },
        { key: 'cov', header: 'Coverage', class: 'num text-right', headerClass: 'text-right', render: (r) => `${String(r.coveragePct)}%` },
      ],
    },
    users: {
      label: 'Pengguna',
      rows: users as unknown as Row[],
      fields: [
        { key: 'name', label: 'Nama', required: true },
        { key: 'role', label: 'Role', type: 'select', options: Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label })), required: true },
        { key: 'title', label: 'Jabatan' },
        { key: 'doctorId', label: 'Tautan dokter (untuk role Dokter)', type: 'select', options: [{ value: '', label: '-' }, ...docOpts] },
      ],
      columns: [
        { key: 'name', header: 'Nama', sort: (r) => String(r.name), render: (r) => <span class="flex items-center gap-2.5"><Avatar name={String(r.name)} size={32} /><span class="font-medium">{String(r.name)}</span></span> },
        { key: 'role', header: 'Role', render: (r) => <Badge tone="primary">{ROLE_LABEL[r.role as keyof typeof ROLE_LABEL]}</Badge> },
        { key: 'title', header: 'Jabatan', render: (r) => String(r.title ?? '-') },
      ],
    },
  };

  const cfg = CONFIG[tab];
  const columns: Column<Row>[] = [
    ...cfg.columns,
    { key: 'active', header: 'Status', render: (r) => <Badge tone={r.active === false ? 'neutral' : 'success'}>{r.active === false ? 'Nonaktif' : 'Aktif'}</Badge> },
    {
      key: 'act',
      header: <span class="sr-only">Aksi</span>,
      class: 'text-right',
      render: (r) => (
        <div class="flex justify-end gap-1">
          <button type="button" class="btn-icon h-8 w-8" title="Edit" aria-label="Edit" onClick={() => openEdit(r)}>
            <Pencil size={16} />
          </button>
          <button type="button" class={`btn-icon h-8 w-8 ${r.active === false ? 'hover:text-success' : 'hover:text-danger'}`} title={r.active === false ? 'Aktifkan' : 'Nonaktifkan'} aria-label={r.active === false ? 'Aktifkan' : 'Nonaktifkan'} onClick={() => toggle(r)}>
            <Power size={16} />
          </button>
        </div>
      ),
    },
  ];

  const openEdit = (r?: Row) => {
    setErr({});
    const f: Record<string, string> = {};
    for (const fd of cfg.fields) f[fd.key] = r ? String(r[fd.key] ?? '') : fd.type === 'select' ? fd.options?.[0]?.value ?? '' : '';
    if (r) f.id = r.id;
    setForm(f);
  };

  const toggle = async (r: Row) => {
    const res = await confirmDialog({ title: `${r.active === false ? 'Aktifkan' : 'Nonaktifkan'} data ini?`, message: r.active === false ? undefined : 'Data nonaktif tidak muncul di pilihan pendaftaran/pemeriksaan, namun riwayat tetap tersimpan.', confirmLabel: r.active === false ? 'Aktifkan' : 'Nonaktifkan', tone: r.active === false ? 'primary' : 'danger' });
    if (res.ok) run(() => toggleMasterActive(tab, r.id), 'Status data diperbarui');
  };

  const save = () => {
    if (!form) return;
    const e: Record<string, string> = {};
    for (const fd of cfg.fields) if (fd.required && !String(form[fd.key] ?? '').trim()) e[fd.key] = `${fd.label} wajib diisi`;
    if (tab === 'polis' && form.queuePrefix && !/^[A-Z]$/.test(form.queuePrefix)) e.queuePrefix = 'Prefix harus 1 huruf kapital';
    if (tab === 'insurers' && (Number(form.coveragePct) < 0 || Number(form.coveragePct) > 100)) e.coveragePct = 'Coverage 0-100';
    setErr(e);
    if (Object.keys(e).length) return;
    const payload: Record<string, unknown> = { ...form };
    for (const k of cfg.numeric ?? []) payload[k] = Number(form[k]);
    if (tab === 'users' && !form.doctorId) delete payload.doctorId;
    if (!form.id) delete payload.id;
    if (run(() => saveMaster(tab, payload as Record<string, unknown> & { id?: string }), form.id ? `${cfg.label} diperbarui` : `${cfg.label} ditambahkan`)) setForm(null);
  };

  const field = (fd: FieldDef): ComponentChildren => {
    const v = form?.[fd.key] ?? '';
    const set = (val: string) => setForm({ ...form!, [fd.key]: fd.key === 'queuePrefix' ? val.toUpperCase().slice(0, 1) : val });
    if (fd.type === 'select') return <Select key={fd.key} label={fd.label} required={fd.required} value={v} onValue={set} options={fd.options ?? []} error={err[fd.key]} />;
    return <Input key={fd.key} label={fd.label} required={fd.required} type={fd.type ?? 'text'} value={v} onValue={set} error={err[fd.key]} />;
  };

  return (
    <div>
      <PageHeader
        title="Master Data"
        subtitle="Dokter, poli, jadwal praktik, penjamin, dan pengguna sistem."
        actions={
          <button type="button" class="btn btn-primary" onClick={() => openEdit()}>
            <Plus size={16} /> Tambah {cfg.label}
          </button>
        }
      />
      <div class="card">
        <Tabs
          class="px-3"
          value={tab}
          onChange={setTab}
          tabs={(Object.keys(CONFIG) as Kind[]).map((k) => ({ key: k, label: CONFIG[k].label, count: CONFIG[k].rows.length }))}
        />
        <DataTable key={tab} columns={columns} rows={cfg.rows} rowKey={(r) => r.id} loading={!ready} pageSizes={[25, 50]} />
      </div>
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={`${form?.id ? 'Edit' : 'Tambah'} ${cfg.label}`}
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
        <div class="grid gap-4">{cfg.fields.map(field)}</div>
      </Modal>
    </div>
  );
}
