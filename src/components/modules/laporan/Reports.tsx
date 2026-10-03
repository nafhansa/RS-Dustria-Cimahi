import type { ComponentChildren } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { Download, Printer, Users, UserPlus, Wallet, Pill } from 'lucide-preact';
import { downloadCsv } from '../../../lib/csv';
import { PAYER_LABEL } from '../../../lib/constants';
import { addDays, toDateStr, todayStr } from '../../../lib/date';
import { dateLong, num, rupiah } from '../../../lib/format';
import { $invoices, $medicalRecords, $payments, $visits } from '../../../stores/db';
import { $poliMap } from '../../../stores/selectors';
import { toast } from '../../../stores/ui';
import { BarChart, Donut, HBarList, LineChart } from '../../ui/Charts';
import { Card, PageHeader, PageSkeleton, StatCard } from '../../ui/Display';
import { useReady } from '../../ui/hooks';
import { Kop, DemoFootnote } from '../shared';

const PRESETS = [
  { key: '1', label: 'Hari ini', days: 1 },
  { key: '7', label: '7 hari', days: 7 },
  { key: '30', label: '30 hari', days: 30 },
  { key: '60', label: '60 hari', days: 60 },
];

function ExportBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" class="btn btn-ghost btn-sm no-print" onClick={onClick}>
      <Download size={14} /> CSV
    </button>
  );
}

export default function Reports() {
  const ready = useReady();
  const visits = useStore($visits);
  const mrs = useStore($medicalRecords);
  const invoices = useStore($invoices);
  const payments = useStore($payments);
  const poliMap = useStore($poliMap);
  const [preset, setPreset] = useState('30');
  const [from, setFrom] = useState(toDateStr(addDays(new Date(), -29)));
  const [to, setTo] = useState(todayStr());

  const applyPreset = (k: string) => {
    const p = PRESETS.find((x) => x.key === k)!;
    setPreset(k);
    setFrom(toDateStr(addDays(new Date(), -(p.days - 1))));
    setTo(todayStr());
  };

  const data = useMemo(() => {
    const inRange = (iso: string) => iso.slice(0, 10) >= from && iso.slice(0, 10) <= to;
    const vs = visits.filter((v) => v.status !== 'BATAL' && inRange(v.registeredAt));
    const firstVisit = new Map<string, string>();
    for (const v of [...visits].filter((x) => x.status !== 'BATAL').sort((a, b) => a.registeredAt.localeCompare(b.registeredAt))) if (!firstVisit.has(v.patientId)) firstVisit.set(v.patientId, v.id);
    const newCount = vs.filter((v) => firstVisit.get(v.patientId) === v.id).length;

    const days: string[] = [];
    for (let d = new Date(from + 'T00:00:00'); toDateStr(d) <= to; d = addDays(d, 1)) days.push(toDateStr(d));
    const short = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    const perDay = days.map((d) => ({ label: short(d), date: d, value: vs.filter((v) => v.registeredAt.startsWith(d)).length }));

    const poliCount = new Map<string, number>();
    for (const v of vs) poliCount.set(v.poliId, (poliCount.get(v.poliId) ?? 0) + 1);
    const perPoli = [...poliCount.entries()].map(([id, value]) => ({ label: poliMap.get(id)?.name ?? id, value })).sort((a, b) => b.value - a.value);

    const visitIds = new Set(vs.map((v) => v.id));
    const dxCount = new Map<string, { name: string; n: number }>();
    for (const m of mrs) if (visitIds.has(m.visitId)) for (const d of m.diagnoses) dxCount.set(d.code, { name: d.name, n: (dxCount.get(d.code)?.n ?? 0) + 1 });
    const topDx = [...dxCount.entries()].map(([code, x]) => ({ label: `${code} ${x.name}`, value: x.n })).sort((a, b) => b.value - a.value).slice(0, 10);

    const medCount = new Map<string, number>();
    for (const i of invoices) if (visitIds.has(i.visitId) && i.status !== 'BATAL') for (const it of i.items) if (it.category === 'OBAT') medCount.set(it.name, (medCount.get(it.name) ?? 0) + it.qty);
    const topMed = [...medCount.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 10);

    const pays = payments.filter((p) => inRange(p.at));
    const revPerDay = days.map((d) => ({ label: short(d), date: d, value: pays.filter((p) => p.at.startsWith(d)).reduce((a, p) => a + p.methods.reduce((s, m) => s + m.amount, 0), 0) }));
    const revenue = revPerDay.reduce((a, d) => a + d.value, 0);

    // revenue per payer = billed value of settled invoices (patient + payer portion)
    const visitMap = new Map(visits.map((v) => [v.id, v]));
    const perPayer = new Map<string, number>();
    for (const i of invoices) {
      if (i.status !== 'LUNAS' || !inRange(i.createdAt)) continue;
      const type = visitMap.get(i.visitId)?.payer.type ?? 'UMUM';
      perPayer.set(type, (perPayer.get(type) ?? 0) + i.items.reduce((a, it) => a + it.qty * it.price, 0) - (i.discount?.amount ?? 0));
    }
    const payerData = [...perPayer.entries()].map(([k, value]) => ({ label: PAYER_LABEL[k as keyof typeof PAYER_LABEL], value }));

    return { vs, newCount, perDay, perPoli, topDx, topMed, revPerDay, revenue, payerData, medTotal: [...medCount.values()].reduce((a, b) => a + b, 0) };
  }, [visits, mrs, invoices, payments, from, to, poliMap]);

  const exp = (name: string, headers: string[], rows: (string | number)[][]) => {
    downloadCsv(`laporan-${name}-${from}-sd-${to}`, headers, rows);
    toast('Export CSV berhasil', { message: `Laporan ${name.replace(/-/g, ' ')}` });
  };

  if (!ready) return <PageSkeleton />;
  const thinBars = data.perDay.length > 31;

  const Section = ({ title, onExport, children, cls = '' }: { title: string; onExport: () => void; children: ComponentChildren; cls?: string }) => (
    <Card title={title} class={`break-inside-avoid ${cls}`} actions={<ExportBtn onClick={onExport} />}>
      {children}
    </Card>
  );

  return (
    <div>
      <div class="hidden print:block">
        <Kop title="Laporan Operasional" subtitle={`${dateLong(from)} s.d. ${dateLong(to)}`} />
      </div>
      <div class="no-print">
        <PageHeader
          title="Laporan"
          subtitle="Kunjungan, diagnosa, obat keluar, dan pendapatan. Semua angka dihitung dari data aktual demo."
          actions={
            <button type="button" class="btn btn-secondary" onClick={() => window.print()}>
              <Printer size={16} /> Cetak
            </button>
          }
        />
        <div class="card mb-6 flex flex-wrap items-end gap-3 p-4">
          <div class="flex rounded-[var(--radius-field)] border border-border p-0.5" role="group" aria-label="Rentang waktu">
            {PRESETS.map((p) => (
              <button key={p.key} type="button" aria-pressed={preset === p.key} class={`rounded-md px-3 py-1.5 text-sm font-medium ${preset === p.key ? 'bg-primary text-white' : 'text-muted hover:bg-surface-2'}`} onClick={() => applyPreset(p.key)}>
                {p.label}
              </button>
            ))}
          </div>
          <label class="text-sm">
            <span class="field-label">Dari</span>
            <input type="date" class="input" value={from} max={to} onInput={(e) => { setFrom((e.target as HTMLInputElement).value); setPreset(''); }} />
          </label>
          <label class="text-sm">
            <span class="field-label">Sampai</span>
            <input type="date" class="input" value={to} min={from} max={todayStr()} onInput={(e) => { setTo((e.target as HTMLInputElement).value); setPreset(''); }} />
          </label>
        </div>
      </div>

      <div class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total kunjungan" value={num(data.vs.length)} icon={<Users size={20} />} />
        <StatCard label="Pasien baru" value={num(data.newCount)} icon={<UserPlus size={20} />} tone="info" hint={`${num(data.vs.length - data.newCount)} pasien lama`} />
        <StatCard label="Pendapatan diterima" value={rupiah(data.revenue)} icon={<Wallet size={20} />} tone="success" />
        <StatCard label="Obat keluar (unit)" value={num(data.medTotal)} icon={<Pill size={20} />} tone="warning" />
      </div>

      <div class="grid gap-6 xl:grid-cols-3">
        <Section title="Kunjungan per hari" cls="xl:col-span-2" onExport={() => exp('kunjungan-harian', ['Tanggal', 'Kunjungan'], data.perDay.map((d) => [d.date, d.value]))}>
          {thinBars ? <LineChart data={data.perDay} label="Kunjungan per hari" format={(n) => `${n} kunjungan`} /> : <BarChart data={data.perDay} label="Kunjungan per hari" format={(n) => `${n} kunjungan`} />}
        </Section>
        <Section title="Pasien baru vs lama" onExport={() => exp('pasien-baru-lama', ['Kategori', 'Jumlah'], [['Pasien baru', data.newCount], ['Pasien lama', data.vs.length - data.newCount]])}>
          <Donut data={[{ label: 'Pasien baru', value: data.newCount }, { label: 'Pasien lama', value: data.vs.length - data.newCount }]} label="Pasien baru vs lama" />
        </Section>
        <Section title="Kunjungan per poli" onExport={() => exp('kunjungan-per-poli', ['Poli', 'Kunjungan'], data.perPoli.map((d) => [d.label, d.value]))}>
          <HBarList data={data.perPoli} />
        </Section>
        <Section title="10 diagnosa terbanyak" onExport={() => exp('top-diagnosa', ['Diagnosa (ICD-10)', 'Jumlah'], data.topDx.map((d) => [d.label, d.value]))}>
          <HBarList data={data.topDx} color="#d01b28" />
        </Section>
        <Section title="10 obat terbanyak (unit)" onExport={() => exp('top-obat', ['Obat', 'Unit keluar'], data.topMed.map((d) => [d.label, d.value]))}>
          <HBarList data={data.topMed} color="#2e90fa" />
        </Section>
        <Section title="Pendapatan per hari" cls="xl:col-span-2" onExport={() => exp('pendapatan-harian', ['Tanggal', 'Pendapatan'], data.revPerDay.map((d) => [d.date, d.value]))}>
          <LineChart data={data.revPerDay} label="Pendapatan per hari" format={rupiah} color="#12b76a" />
        </Section>
        <Section title="Nilai layanan per penjamin" onExport={() => exp('pendapatan-per-penjamin', ['Penjamin', 'Nilai'], data.payerData.map((d) => [d.label, d.value]))}>
          <Donut data={data.payerData} format={rupiah} label="Nilai layanan per penjamin" />
          <p class="mt-3 text-xs text-muted">Nilai tagihan lunas (porsi pasien + porsi penjamin). Klaim BPJS/asuransi diproses terpisah.</p>
        </Section>
      </div>
      <div class="hidden print:block">
        <DemoFootnote />
      </div>
    </div>
  );
}
