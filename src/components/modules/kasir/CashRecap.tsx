import { useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { Lock, Printer } from 'lucide-preact';
import { PAY_METHOD_LABEL } from '../../../lib/constants';
import { todayStr } from '../../../lib/date';
import { dateLong, dateTime, rupiah, timeHM } from '../../../lib/format';
import type { PayMethod } from '../../../lib/types';
import { $invoices, $payments, $shifts } from '../../../stores/db';
import { $patientMap, $personName } from '../../../stores/selectors';
import { closeShift, currentShift } from '../../../stores/actions';
import { Badge } from '../../ui/Badge';
import { Card, PageHeader, PageSkeleton, StatCard } from '../../ui/Display';
import { Input } from '../../ui/Field';
import { Modal } from '../../ui/Modal';
import { run, useReady } from '../../ui/hooks';
import { DemoFootnote, Kop } from '../shared';
import { Wallet, Receipt as ReceiptIcon, Banknote } from 'lucide-preact';

const SHIFTS = [
  { key: 'Pagi (07.00 - 14.00)', test: (h: number) => h >= 7 && h < 14 },
  { key: 'Siang (14.00 - 21.00)', test: (h: number) => h >= 14 && h < 21 },
  { key: 'Malam (21.00 - 07.00)', test: (h: number) => h >= 21 || h < 7 },
];
const METHODS = Object.keys(PAY_METHOD_LABEL) as PayMethod[];

export default function CashRecap() {
  const ready = useReady();
  const payments = useStore($payments);
  const invoices = useStore($invoices);
  const shifts = useStore($shifts);
  const pMap = useStore($patientMap);
  const personName = useStore($personName);
  const [date, setDate] = useState(todayStr());
  const [closeOpen, setCloseOpen] = useState(false);
  const [physical, setPhysical] = useState('');
  const invMap = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices]);

  const dayPays = payments.filter((p) => p.at.startsWith(date)).sort((a, b) => a.at.localeCompare(b.at));
  const byShift = SHIFTS.map((s) => {
    const list = dayPays.filter((p) => s.test(Number(p.at.slice(11, 13))));
    const totals = Object.fromEntries(METHODS.map((m) => [m, 0])) as Record<PayMethod, number>;
    for (const p of list) for (const m of p.methods) totals[m.type] += m.amount;
    return { ...s, list, totals, total: Object.values(totals).reduce((a, b) => a + b, 0) };
  });
  const dayTotals = Object.fromEntries(METHODS.map((m) => [m, byShift.reduce((a, s) => a + s.totals[m], 0)])) as Record<PayMethod, number>;
  const grand = Object.values(dayTotals).reduce((a, b) => a + b, 0);
  const cur = currentShift();
  const curShift = byShift.find((s) => s.key === cur.name)!;
  const expectedCash = date === todayStr() ? curShift.totals.TUNAI : 0;
  const diff = (Number(physical) || 0) - expectedCash;
  const closedToday = shifts.filter((s) => s.date === date);

  const doClose = () => {
    if (physical === '') return;
    if (run(() => closeShift({ date: todayStr(), shift: cur.name, expectedCash, physicalCash: Number(physical) || 0, totals: curShift.totals, txCount: curShift.list.length }), 'Shift ditutup', `Selisih ${rupiah(diff)}`)) {
      setCloseOpen(false);
      setPhysical('');
    }
  };

  if (!ready) return <PageSkeleton />;

  return (
    <div>
      <div class="no-print">
        <PageHeader
          title="Rekap Kas Harian"
          subtitle="Penerimaan per metode bayar per shift. Tutup shift untuk mencocokkan uang fisik di laci kasir."
          actions={
            <>
              <input type="date" class="input w-auto" value={date} max={todayStr()} onInput={(e) => setDate((e.target as HTMLInputElement).value)} aria-label="Tanggal rekap" />
              <button type="button" class="btn btn-secondary" onClick={() => window.print()}>
                <Printer size={16} /> Cetak Rekap
              </button>
              <button type="button" class="btn btn-primary" disabled={date !== todayStr()} title={date !== todayStr() ? 'Hanya untuk shift hari ini' : undefined} onClick={() => setCloseOpen(true)}>
                <Lock size={16} /> Tutup Shift
              </button>
            </>
          }
        />
        <div class="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Total penerimaan" value={rupiah(grand)} icon={<Wallet size={20} />} tone="success" />
          <StatCard label="Jumlah transaksi" value={dayPays.length} icon={<ReceiptIcon size={20} />} tone="info" />
          <StatCard label="Tunai" value={rupiah(dayTotals.TUNAI)} icon={<Banknote size={20} />} hint={`Non-tunai ${rupiah(grand - dayTotals.TUNAI)}`} />
        </div>
      </div>

      <div class="print-area">
        <div class="hidden print:block">
          <Kop title="Rekap Kas Harian" subtitle={dateLong(date)} />
        </div>
        <Card title={`Rekap per shift · ${dateLong(date)}`} bodyClass="">
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>Shift</th>
                  {METHODS.map((m) => (
                    <th key={m} class="text-right">
                      {PAY_METHOD_LABEL[m]}
                    </th>
                  ))}
                  <th class="text-right">Transaksi</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {byShift.map((s) => (
                  <tr key={s.key}>
                    <td class="font-medium">
                      {s.key} {date === todayStr() && s.key === cur.name && <Badge tone="primary">Aktif</Badge>}
                      {closedToday.some((c) => c.shift === s.key) && <Badge tone="success" class="ml-1">Ditutup</Badge>}
                    </td>
                    {METHODS.map((m) => (
                      <td key={m} class="num text-right">
                        {rupiah(s.totals[m])}
                      </td>
                    ))}
                    <td class="num text-right">{s.list.length}</td>
                    <td class="num text-right font-semibold">{rupiah(s.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr class="bg-surface font-bold">
                  <td class="px-3 py-2.5">Total hari ini</td>
                  {METHODS.map((m) => (
                    <td key={m} class="num px-3 py-2.5 text-right">
                      {rupiah(dayTotals[m])}
                    </td>
                  ))}
                  <td class="num px-3 py-2.5 text-right">{dayPays.length}</td>
                  <td class="num px-3 py-2.5 text-right">{rupiah(grand)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <Card title="Daftar transaksi" class="mt-6" bodyClass="">
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>Jam</th>
                  <th>No Kwitansi</th>
                  <th>Invoice</th>
                  <th>Pasien</th>
                  <th>Metode</th>
                  <th class="text-right">Nominal</th>
                  <th>Kasir</th>
                </tr>
              </thead>
              <tbody>
                {dayPays.length === 0 && (
                  <tr>
                    <td colSpan={7} class="py-8 text-center text-sm text-muted">
                      Belum ada transaksi
                    </td>
                  </tr>
                )}
                {dayPays.map((p) => {
                  const inv = invMap.get(p.invoiceId);
                  return (
                    <tr key={p.id}>
                      <td class="tabular">{timeHM(p.at)}</td>
                      <td class="tabular font-medium">
                        <a href={`/app/kasir/kwitansi?id=${p.invoiceId}&pay=${p.id}`} class="hover:text-primary">
                          {p.receiptNo}
                        </a>
                      </td>
                      <td class="tabular text-sm">{inv?.invoiceNo}</td>
                      <td>{pMap.get(inv?.patientId ?? '')?.name}</td>
                      <td class="text-sm">{p.methods.length ? p.methods.map((m) => PAY_METHOD_LABEL[m.type]).join(' + ') : <span class="text-muted">Penjamin</span>}</td>
                      <td class="num text-right font-semibold">{rupiah(p.methods.reduce((a, m) => a + m.amount, 0))}</td>
                      <td class="text-sm">{personName(p.cashierId)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {closedToday.length > 0 && (
          <Card title="Riwayat tutup shift" class="mt-6" bodyClass="">
            <div class="overflow-x-auto">
              <table class="table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Shift</th>
                    <th class="text-right">Tunai sistem</th>
                    <th class="text-right">Uang fisik</th>
                    <th class="text-right">Selisih</th>
                    <th>Oleh</th>
                  </tr>
                </thead>
                <tbody>
                  {closedToday.map((s) => (
                    <tr key={s.id}>
                      <td class="tabular">{dateTime(s.at)}</td>
                      <td>{s.shift}</td>
                      <td class="num text-right">{rupiah(s.expectedCash)}</td>
                      <td class="num text-right">{rupiah(s.physicalCash)}</td>
                      <td class={`num text-right font-semibold ${s.diff === 0 ? 'text-success-strong' : 'text-danger-strong'}`}>{rupiah(s.diff)}</td>
                      <td>{personName(s.by)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        <div class="hidden print:block">
          <DemoFootnote />
        </div>
      </div>

      <Modal
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        title={`Tutup Shift · ${cur.name}`}
        size="sm"
        footer={
          <>
            <button type="button" class="btn btn-secondary" onClick={() => setCloseOpen(false)}>
              Batal
            </button>
            <button type="button" class="btn btn-primary" disabled={physical === ''} onClick={doClose}>
              Tutup Shift
            </button>
          </>
        }
      >
        <div class="space-y-4">
          <dl class="space-y-1.5 rounded-[var(--radius-card)] bg-surface p-3 text-sm">
            {METHODS.map((m) => (
              <div key={m} class="flex justify-between">
                <dt class="text-muted">{PAY_METHOD_LABEL[m]}</dt>
                <dd class="tabular">{rupiah(curShift.totals[m])}</dd>
              </div>
            ))}
            <div class="flex justify-between border-t border-border pt-1.5 font-semibold">
              <dt>Tunai menurut sistem</dt>
              <dd class="tabular">{rupiah(expectedCash)}</dd>
            </div>
          </dl>
          <Input label="Uang fisik di laci (Rp)" type="number" min={0} required data-autofocus value={physical} onValue={setPhysical} />
          {physical !== '' && (
            <p class={`rounded-[var(--radius-field)] p-3 text-sm font-semibold ${diff === 0 ? 'bg-success-soft text-success-strong' : 'bg-danger-soft text-danger-strong'}`} role="status">
              Selisih: {rupiah(diff)} {diff === 0 ? '(sesuai)' : diff > 0 ? '(lebih)' : '(kurang)'}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
