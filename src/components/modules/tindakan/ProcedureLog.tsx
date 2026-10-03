import { useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { Download, Eye, Plus } from 'lucide-preact';
import { downloadCsv } from '../../../lib/csv';
import { INVOICE_STATUS, PROC_CATEGORY_LABEL } from '../../../lib/constants';
import { addDays, toDateStr, todayStr } from '../../../lib/date';
import { dateTime, rupiah } from '../../../lib/format';
import type { ProcedureAction } from '../../../lib/types';
import { $invoices, $polis, $procedureActions, $procedureMaster, $users, $visits } from '../../../stores/db';
import { $doctorMap, $patientMap, $poliMap, $procMap, $personName, $todayVisits } from '../../../stores/selectors';
import { addProcedure } from '../../../stores/actions';
import { toast } from '../../../stores/ui';
import { StatusPill } from '../../ui/Badge';
import { Combobox } from '../../ui/Combobox';
import { DataTable, type Column } from '../../ui/DataTable';
import { KV, PageHeader } from '../../ui/Display';
import { Input, Select } from '../../ui/Field';
import { Modal } from '../../ui/Modal';
import { run, useReady } from '../../ui/hooks';

export default function ProcedureLog() {
  const ready = useReady();
  const actions = useStore($procedureActions);
  const visits = useStore($visits);
  const invoices = useStore($invoices);
  const polis = useStore($polis);
  const users = useStore($users);
  const masters = useStore($procedureMaster);
  const today = useStore($todayVisits);
  const pMap = useStore($patientMap);
  const poliMap = useStore($poliMap);
  const procMap = useStore($procMap);
  const docMap = useStore($doctorMap);
  const personName = useStore($personName);
  const [from, setFrom] = useState(toDateStr(addDays(new Date(), -6)));
  const [to, setTo] = useState(todayStr());
  const [poli, setPoli] = useState('');
  const [performer, setPerformer] = useState('');
  const [detail, setDetail] = useState<ProcedureAction | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ visitId: '', procedureId: '', qty: 1, performerId: 'U-PERAWAT', note: '' });

  const visitMap = useMemo(() => new Map(visits.map((v) => [v.id, v])), [visits]);
  const invByVisit = useMemo(() => new Map(invoices.map((i) => [i.visitId, i])), [invoices]);

  const rows = useMemo(
    () =>
      actions.filter((a) => {
        const d = a.at.slice(0, 10);
        if (from && d < from) return false;
        if (to && d > to) return false;
        const v = visitMap.get(a.visitId);
        if (poli && v?.poliId !== poli) return false;
        if (performer && a.performerId !== performer) return false;
        return true;
      }),
    [actions, from, to, poli, performer, visitMap],
  );

  const performers = useMemo(() => [...new Set(actions.map((a) => a.performerId))].map((id) => ({ value: id, label: personName(id) })).sort((a, b) => a.label.localeCompare(b.label)), [actions, personName]);

  const columns: Column<ProcedureAction>[] = [
    { key: 'at', header: 'Tanggal', sort: (a) => a.at, render: (a) => <span class="tabular">{dateTime(a.at)}</span> },
    { key: 'patient', header: 'Pasien', render: (a) => { const v = visitMap.get(a.visitId); const p = v && pMap.get(v.patientId); return p ? <div><p class="font-medium">{p.name}</p><p class="tabular text-xs text-muted">{p.mrn}</p></div> : '-'; } },
    { key: 'poli', header: 'Poli', render: (a) => poliMap.get(visitMap.get(a.visitId)?.poliId ?? '')?.name ?? '-' },
    { key: 'proc', header: 'Tindakan', sort: (a) => procMap.get(a.procedureId)?.name ?? '', render: (a) => procMap.get(a.procedureId)?.name },
    { key: 'code', header: 'ICD-9-CM', render: (a) => <span class="tabular text-primary">{procMap.get(a.procedureId)?.code}</span> },
    { key: 'perf', header: 'Pelaksana', render: (a) => <span class="text-sm">{personName(a.performerId)}</span> },
    { key: 'qty', header: 'Qty', class: 'num text-right', headerClass: 'text-right', render: (a) => a.qty },
    { key: 'price', header: 'Tarif', class: 'num text-right', headerClass: 'text-right', sort: (a) => a.price * a.qty, render: (a) => rupiah(a.price * a.qty) },
    { key: 'inv', header: 'Status Tagihan', render: (a) => { const i = invByVisit.get(a.visitId); return i ? <StatusPill status={INVOICE_STATUS[i.status]} /> : '-'; } },
    {
      key: 'act',
      header: <span class="sr-only">Aksi</span>,
      class: 'text-right',
      render: (a) => (
        <button type="button" class="btn btn-ghost btn-sm" onClick={() => setDetail(a)}>
          <Eye size={14} /> Detail
        </button>
      ),
    },
  ];

  const exportCsv = () => {
    downloadCsv(
      `log-tindakan-${from}-sd-${to}`,
      ['Tanggal', 'No RM', 'Pasien', 'Poli', 'Kode ICD-9-CM', 'Tindakan', 'Pelaksana', 'Qty', 'Tarif', 'Status Tagihan'],
      rows.map((a) => {
        const v = visitMap.get(a.visitId);
        const p = v && pMap.get(v.patientId);
        return [a.at.replace('T', ' '), p?.mrn, p?.name, poliMap.get(v?.poliId ?? '')?.name, procMap.get(a.procedureId)?.code, procMap.get(a.procedureId)?.name, personName(a.performerId), a.qty, a.price * a.qty, invByVisit.get(a.visitId)?.status];
      }),
    );
    toast('Export CSV berhasil', { message: `${rows.length} baris tindakan` });
  };

  const activeVisits = today.filter((v) => !['BATAL', 'SELESAI'].includes(v.status));
  const submitAdd = () => {
    if (!form.visitId) return toast('Pilih kunjungan aktif', { tone: 'warning' });
    if (!form.procedureId) return toast('Pilih tindakan', { tone: 'warning' });
    if (run(() => addProcedure(form.visitId, form.procedureId, form.qty, form.performerId, form.note || undefined), 'Tindakan ditambahkan & masuk tagihan', procMap.get(form.procedureId)?.name)) {
      setAddOpen(false);
      setForm({ visitId: '', procedureId: '', qty: 1, performerId: 'U-PERAWAT', note: '' });
    }
  };

  const dv = detail ? visitMap.get(detail.visitId) : undefined;
  const dp = dv ? pMap.get(dv.patientId) : undefined;
  const dm = detail ? procMap.get(detail.procedureId) : undefined;

  return (
    <div>
      <PageHeader
        title="Tindakan"
        subtitle="Log seluruh tindakan medis, keperawatan, laboratorium, dan radiologi."
        actions={
          <>
            <button type="button" class="btn btn-secondary" onClick={exportCsv}>
              <Download size={16} /> Export CSV
            </button>
            <button type="button" class="btn btn-primary" onClick={() => setAddOpen(true)}>
              <Plus size={16} /> Tambah Tindakan
            </button>
          </>
        }
      />
      <div class="card">
        <div class="flex flex-wrap items-end gap-3 border-b border-border p-4">
          <Input label="Dari" type="date" value={from} onValue={setFrom} />
          <Input label="Sampai" type="date" value={to} onValue={setTo} />
          <Select label="Poli" value={poli} onValue={setPoli} options={polis.map((p) => ({ value: p.id, label: p.name }))} placeholder="Semua poli" />
          <Select label="Pelaksana" value={performer} onValue={setPerformer} options={performers} placeholder="Semua pelaksana" />
          <p class="ml-auto text-sm text-muted">
            Total: <strong class="tabular text-text">{rupiah(rows.reduce((s, a) => s + a.price * a.qty, 0))}</strong>
          </p>
        </div>
        <DataTable columns={columns} rows={rows} rowKey={(a) => a.id} loading={!ready} initialSort={{ key: 'at', dir: 'desc' }} pageSizes={[25, 10, 50]} empty={{ title: 'Tidak ada tindakan pada periode ini' }} />
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Detail Tindakan" variant="drawer">
        {detail && dm && (
          <div class="space-y-5">
            <KV
              cols={1}
              items={[
                ['Tindakan', `${dm.name}`],
                ['Kode ICD-9-CM', dm.code],
                ['Kategori', PROC_CATEGORY_LABEL[dm.category]],
                ['Waktu', dateTime(detail.at)],
                ['Pelaksana', personName(detail.performerId)],
                ['Qty × Tarif', `${detail.qty} × ${rupiah(detail.price)} = ${rupiah(detail.qty * detail.price)}`],
                ['Catatan', detail.note],
                ['Pasien', dp ? `${dp.name} (${dp.mrn})` : '-'],
                ['Kunjungan', dv ? `${dv.regNo} · ${poliMap.get(dv.poliId)?.name} · ${docMap.get(dv.doctorId)?.name}` : '-'],
                ['Status tagihan', invByVisit.get(detail.visitId) ? <StatusPill status={INVOICE_STATUS[invByVisit.get(detail.visitId)!.status]} /> : '-'],
              ]}
            />
            <div class="flex flex-wrap gap-2">
              {dv && (
                <a href={`/app/rekam-medis/periksa?visit=${dv.id}`} class="btn btn-secondary btn-sm">
                  Buka rekam medis
                </a>
              )}
              {invByVisit.get(detail.visitId) && (
                <a href={`/app/kasir/tagihan?id=${invByVisit.get(detail.visitId)!.id}`} class="btn btn-secondary btn-sm">
                  Buka tagihan
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Tambah Tindakan"
        description="Untuk tindakan oleh perawat/penunjang di luar form dokter. Tindakan otomatis masuk tagihan."
        size="lg"
        footer={
          <>
            <button type="button" class="btn btn-secondary" onClick={() => setAddOpen(false)}>
              Batal
            </button>
            <button type="button" class="btn btn-primary" onClick={submitAdd}>
              Simpan Tindakan
            </button>
          </>
        }
      >
        <div class="grid gap-4">
          <Select
            label="Kunjungan aktif hari ini"
            required
            value={form.visitId}
            onValue={(v) => setForm({ ...form, visitId: v })}
            options={activeVisits.map((v) => ({ value: v.id, label: `${v.queueNo} · ${pMap.get(v.patientId)?.name} · ${poliMap.get(v.poliId)?.name}` }))}
            placeholder={activeVisits.length ? 'Pilih kunjungan' : 'Tidak ada kunjungan aktif'}
          />
          <div>
            <Combobox
              label="Tindakan"
              items={masters.filter((m) => m.active && m.category !== 'ADMIN' && m.category !== 'KONSULTASI')}
              itemKey={(m) => m.id}
              filter={(m, q) => m.name.toLowerCase().includes(q) || m.code.includes(q)}
              onSelect={(m) => setForm({ ...form, procedureId: m.id })}
              placeholder="Cari tindakan..."
              renderItem={(m) => (
                <span class="flex justify-between gap-3">
                  <span>
                    <span class="tabular mr-2 text-xs font-semibold text-primary">{m.code}</span>
                    {m.name}
                  </span>
                  <span class="tabular text-xs">{rupiah(m.priceUmum)}</span>
                </span>
              )}
            />
            {form.procedureId && (
              <p class="mt-2 text-sm">
                Dipilih: <strong>{procMap.get(form.procedureId)?.name}</strong> ({rupiah(procMap.get(form.procedureId)?.priceUmum ?? 0)})
              </p>
            )}
          </div>
          <div class="grid gap-4 sm:grid-cols-3">
            <Input label="Qty" type="number" min={1} value={String(form.qty)} onValue={(v) => setForm({ ...form, qty: Math.max(1, Number(v) || 1) })} />
            <Select
              class="sm:col-span-2"
              label="Pelaksana"
              value={form.performerId}
              onValue={(v) => setForm({ ...form, performerId: v })}
              options={[...users.filter((u) => u.role === 'PERAWAT' || u.role === 'DOKTER').map((u) => ({ value: u.id, label: u.name })), ...[...docMap.values()].filter((d) => d.id !== 'D01').map((d) => ({ value: d.id, label: d.name }))]}
            />
          </div>
          <Input label="Catatan" value={form.note} onValue={(v) => setForm({ ...form, note: v })} />
        </div>
      </Modal>
    </div>
  );
}
