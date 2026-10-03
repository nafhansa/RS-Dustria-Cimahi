import { useState } from 'preact/hooks';
import { Plus, Save, Trash2 } from 'lucide-preact';
import { INVOICE_STATUS, RX_STATUS, VISIT_STATUS } from '../../lib/constants';
import { confirmDialog, showInfo, toast } from '../../stores/ui';
import { Badge, StatusPill } from '../ui/Badge';
import { BarChart, Donut, HBarList, LineChart } from '../ui/Charts';
import { Combobox } from '../ui/Combobox';
import { DataTable } from '../ui/DataTable';
import { Avatar, Card, EmptyState, KV, PageHeader, Skeleton, StatCard, Stepper } from '../ui/Display';
import { Input, RadioGroup, Select, Switch, Textarea } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { TagInput } from '../ui/TagInput';

const TOKENS = ['bg', 'surface', 'surface-2', 'border', 'text', 'muted', 'primary', 'primary-hover', 'primary-soft', 'success', 'warning', 'info', 'danger'];

/** Hidden mini style guide (/app/_ui). */
export default function UIGuide() {
  const [tab, setTab] = useState<'a' | 'b' | 'c'>('a');
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [tags, setTags] = useState(['Penisilin']);
  const [radio, setRadio] = useState<'L' | 'P'>('L');
  const [sw, setSw] = useState(true);
  const [step, setStep] = useState(1);
  const sample = [
    { label: 'Sen', value: 24 },
    { label: 'Sel', value: 31 },
    { label: 'Rab', value: 18 },
    { label: 'Kam', value: 27 },
    { label: 'Jum', value: 35 },
  ];
  return (
    <div class="space-y-6">
      <PageHeader title="UI Style Guide" subtitle="Komponen design system SIMRS Dustira (halaman tersembunyi)." />
      <Card title="Warna (design tokens)">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {TOKENS.map((t) => (
            <div key={t}>
              <div class="h-14 rounded-lg border border-border" style={{ background: `var(--color-${t})` }} />
              <p class="mt-1 font-mono text-xs">--color-{t}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Tipografi">
        <h1 class="text-5xl font-bold">Heading 48 · Plus Jakarta Sans</h1>
        <h2 class="mt-2 text-3xl font-semibold">Heading 30</h2>
        <p class="mt-2 text-base">Body 16 · Inter. Pelayanan yang bisa Anda percaya, setiap saat.</p>
        <p class="tabular mt-1 text-sm text-muted">Angka tabular: Rp 1.250.000 · 09.30 · RM-000123</p>
      </Card>
      <Card title="Button">
        <div class="flex flex-wrap items-center gap-2">
          <button class="btn btn-primary" type="button" onClick={() => toast('Tersimpan', { message: 'Contoh toast sukses' })}>
            <Save size={16} /> Primary
          </button>
          <button class="btn btn-secondary" type="button" onClick={() => toast('Info', { tone: 'info' })}>
            Secondary
          </button>
          <button class="btn btn-ghost" type="button" onClick={() => toast('Peringatan', { tone: 'warning' })}>
            Ghost
          </button>
          <button class="btn btn-danger" type="button" onClick={() => confirmDialog({ title: 'Hapus data?', tone: 'danger', confirmLabel: 'Hapus' })}>
            <Trash2 size={16} /> Danger
          </button>
          <button class="btn btn-soft" type="button" onClick={() => showInfo('Contoh modal informatif')}>
            Soft
          </button>
          <button class="btn-icon" type="button" aria-label="Tambah" onClick={() => toast('Icon button')}>
            <Plus size={18} />
          </button>
          <button class="btn btn-primary btn-sm" type="button" onClick={() => toast('Small')}>
            Small
          </button>
          <button class="btn btn-primary btn-lg" type="button" onClick={() => toast('Large')}>
            Large
          </button>
          <button class="btn btn-primary" type="button" disabled>
            Disabled
          </button>
        </div>
      </Card>
      <Card title="Badge & Status">
        <div class="flex flex-wrap gap-2">
          {Object.values(VISIT_STATUS).map((s) => (
            <StatusPill key={s.label} status={s} />
          ))}
          {Object.values(RX_STATUS).map((s) => (
            <StatusPill key={`rx${s.label}`} status={s} />
          ))}
          {Object.values(INVOICE_STATUS).map((s) => (
            <StatusPill key={`in${s.label}`} status={s} />
          ))}
          <Badge tone="primary">Primary</Badge>
        </div>
      </Card>
      <div class="grid gap-6 lg:grid-cols-2">
        <Card title="Form">
          <div class="grid gap-4">
            <Input label="Input" placeholder="Placeholder" hint="Teks bantuan" />
            <Input label="Input error" value="123" error="Format tidak valid" />
            <Select label="Select" options={['Satu', 'Dua']} />
            <Textarea label="Textarea" />
            <RadioGroup name="ui-radio" label="Radio" value={radio} onValue={setRadio} options={[{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }]} />
            <Switch checked={sw} onChange={setSw} label="Switch" />
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" class="checkbox" defaultChecked /> Checkbox
            </label>
            <TagInput label="Tag input" value={tags} onChange={setTags} />
            <Combobox label="Combobox" items={['Paracetamol', 'Amlodipine', 'Metformin', 'Omeprazole']} itemKey={(x) => x} filter={(x, q) => x.toLowerCase().includes(q)} onSelect={(x) => toast(`Dipilih: ${x}`)} renderItem={(x) => x} />
            <Input label="Date picker" type="date" />
          </div>
        </Card>
        <div class="space-y-6">
          <Card title="Stat card, avatar, stepper">
            <div class="grid gap-4 sm:grid-cols-2">
              <StatCard label="Kunjungan" value="128" hint="+12% minggu ini" />
              <StatCard label="Pendapatan" value="Rp 12,4 jt" tone="success" />
            </div>
            <div class="mt-4 flex gap-2">
              <Avatar name="Anisa Rahmawati" />
              <Avatar name="Dimas Prasetyo" />
              <Avatar name="Sari Wulandari" />
            </div>
            <div class="mt-4">
              <Stepper steps={['Pasien', 'Kunjungan', 'Penjamin', 'Konfirmasi']} current={step} onStep={setStep} />
              <button type="button" class="btn btn-ghost btn-sm mt-2" onClick={() => setStep((step + 1) % 4)}>
                Langkah berikutnya
              </button>
            </div>
          </Card>
          <Card title="Tabs, modal, drawer">
            <Tabs value={tab} onChange={setTab} tabs={[{ key: 'a', label: 'Tab A', count: 3 }, { key: 'b', label: 'Tab B' }, { key: 'c', label: 'Tab C', disabled: true }]} />
            <p class="py-3 text-sm text-muted">Konten tab {tab.toUpperCase()}</p>
            <div class="flex gap-2">
              <button type="button" class="btn btn-secondary" onClick={() => setModal(true)}>
                Buka modal
              </button>
              <button type="button" class="btn btn-secondary" onClick={() => setDrawer(true)}>
                Buka drawer
              </button>
            </div>
          </Card>
          <Card title="Skeleton & empty state">
            <Skeleton lines={3} />
            <EmptyState title="Belum ada data" description="Deskripsi empty state." />
          </Card>
        </div>
      </div>
      <Card title="Table" bodyClass="">
        <DataTable
          columns={[
            { key: 'n', header: 'Nama', sort: (r: { n: string; v: number }) => r.n, render: (r) => r.n },
            { key: 'v', header: 'Nilai', sort: (r) => r.v, render: (r) => r.v, class: 'num' },
          ]}
          rows={sample.map((s) => ({ n: s.label, v: s.value }))}
          rowKey={(r) => r.n}
        />
      </Card>
      <div class="grid gap-6 lg:grid-cols-2">
        <Card title="Bar chart">
          <BarChart data={sample} label="Contoh bar" />
        </Card>
        <Card title="Line chart">
          <LineChart data={sample} label="Contoh line" />
        </Card>
        <Card title="HBar list">
          <HBarList data={sample} />
        </Card>
        <Card title="Donut & KV">
          <Donut data={sample.slice(0, 3)} label="Contoh donut" />
          <div class="mt-4">
            <KV items={[['Kunci', 'Nilai'], ['No RM', 'RM-000123']]} />
          </div>
        </Card>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Contoh Modal" footer={<button type="button" class="btn btn-primary" onClick={() => setModal(false)}>Tutup</button>}>
        <p class="text-sm text-muted">Modal menjebak fokus dan menutup dengan Esc.</p>
      </Modal>
      <Modal open={drawer} onClose={() => setDrawer(false)} title="Contoh Drawer" variant="drawer">
        <p class="text-sm text-muted">Drawer untuk detail data.</p>
      </Modal>
    </div>
  );
}
