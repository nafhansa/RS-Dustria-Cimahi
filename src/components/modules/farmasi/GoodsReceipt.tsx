import { useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { Plus, Save, Trash2 } from 'lucide-preact';
import { SUPPLIERS } from '../../../lib/constants';
import { addDays, toDateStr, todayStr } from '../../../lib/date';
import { dateShort, dateTime, rupiah } from '../../../lib/format';
import { $medicines, $receipts } from '../../../stores/db';
import { $medMap, $personName } from '../../../stores/selectors';
import { receiveGoods } from '../../../stores/actions';
import { Card, PageHeader, PageSkeleton } from '../../ui/Display';
import { Input, Select } from '../../ui/Field';
import { run, useReady } from '../../ui/hooks';

interface Line {
  medicineId: string;
  batchNo: string;
  expiry: string;
  qty: string;
  buyPrice: string;
}
const newLine = (): Line => ({ medicineId: '', batchNo: '', expiry: toDateStr(addDays(new Date(), 540)), qty: '', buyPrice: '' });

export default function GoodsReceipt() {
  const ready = useReady();
  const meds = useStore($medicines);
  const receipts = useStore($receipts);
  const medMap = useStore($medMap);
  const personName = useStore($personName);
  const [supplier, setSupplier] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [date, setDate] = useState(todayStr());
  const [lines, setLines] = useState<Line[]>([newLine()]);

  const setLine = (i: number, patch: Partial<Line>) => setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const total = lines.reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.buyPrice) || 0), 0);

  const save = () => {
    const r = run(
      () => receiveGoods({ supplier, invoiceRef, date, lines: lines.map((l) => ({ medicineId: l.medicineId, batchNo: l.batchNo.trim(), expiry: l.expiry, qty: Number(l.qty), buyPrice: Number(l.buyPrice) || 0 })) }),
      (x) => `Penerimaan ${x.grNo} tersimpan`,
      'Batch baru ditambahkan ke stok',
    );
    if (r) {
      setSupplier('');
      setInvoiceRef('');
      setLines([newLine()]);
    }
  };

  if (!ready) return <PageSkeleton />;

  return (
    <div>
      <PageHeader title="Penerimaan Barang" subtitle="Catat penerimaan obat dari distributor (PBF). Setiap baris menambah batch ke stok." back={{ href: '/app/farmasi/stok', label: 'Stok obat' }} />
      <Card title="Data Faktur">
        <div class="grid gap-4 md:grid-cols-3">
          <Select label="Distributor (PBF)" required value={supplier} onValue={setSupplier} options={SUPPLIERS} placeholder="Pilih distributor" />
          <Input label="No faktur" required value={invoiceRef} onValue={setInvoiceRef} placeholder="Contoh: FKT/2026/10/0451" />
          <Input label="Tanggal terima" type="date" value={date} onValue={setDate} />
        </div>
      </Card>
      <Card
        title="Item Diterima"
        class="mt-6"
        bodyClass=""
        actions={
          <button type="button" class="btn btn-secondary btn-sm" onClick={() => setLines([...lines, newLine()])}>
            <Plus size={14} /> Tambah Baris
          </button>
        }
      >
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th class="min-w-[260px]">Obat</th>
                <th>No Batch</th>
                <th>Kedaluwarsa</th>
                <th>Qty</th>
                <th>Harga Beli/Satuan</th>
                <th class="text-right">Subtotal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const m = medMap.get(l.medicineId);
                return (
                  <tr key={i}>
                    <td>
                      <select class="input py-1.5" value={l.medicineId} aria-label={`Obat baris ${i + 1}`} onChange={(e) => { const id = (e.target as HTMLSelectElement).value; const mm = medMap.get(id); setLine(i, { medicineId: id, buyPrice: mm ? String(Math.round(mm.sellPrice * 0.72)) : '' }); }}>
                        <option value="">Pilih obat...</option>
                        {meds.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input class="input w-32 py-1.5" value={l.batchNo} aria-label={`No batch baris ${i + 1}`} onInput={(e) => setLine(i, { batchNo: (e.target as HTMLInputElement).value.toUpperCase() })} />
                    </td>
                    <td>
                      <input type="date" class="input w-40 py-1.5" min={todayStr()} value={l.expiry} aria-label={`Kedaluwarsa baris ${i + 1}`} onInput={(e) => setLine(i, { expiry: (e.target as HTMLInputElement).value })} />
                    </td>
                    <td>
                      <div class="flex items-center gap-1">
                        <input type="number" min={1} class="input w-24 py-1.5" value={l.qty} aria-label={`Qty baris ${i + 1}`} onInput={(e) => setLine(i, { qty: (e.target as HTMLInputElement).value })} />
                        <span class="text-xs text-muted">{m?.unit}</span>
                      </div>
                    </td>
                    <td>
                      <input type="number" min={0} class="input w-32 py-1.5" value={l.buyPrice} aria-label={`Harga beli baris ${i + 1}`} onInput={(e) => setLine(i, { buyPrice: (e.target as HTMLInputElement).value })} />
                    </td>
                    <td class="num text-right">{rupiah((Number(l.qty) || 0) * (Number(l.buyPrice) || 0))}</td>
                    <td>
                      <button type="button" class="btn-icon h-8 w-8 hover:text-danger" disabled={lines.length === 1} aria-label={`Hapus baris ${i + 1}`} onClick={() => setLines(lines.filter((_, idx) => idx !== i))}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} class="px-3 py-3 text-right font-semibold">
                  Total faktur
                </td>
                <td class="num px-3 py-3 text-right font-bold">{rupiah(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <div class="flex justify-end border-t border-border p-4">
          <button type="button" class="btn btn-primary" onClick={save}>
            <Save size={16} /> Simpan Penerimaan
          </button>
        </div>
      </Card>

      <Card title="Riwayat Penerimaan (sesi demo)" class="mt-6" bodyClass="">
        {receipts.length === 0 ? (
          <p class="px-5 py-8 text-center text-sm text-muted">Belum ada penerimaan pada sesi ini.</p>
        ) : (
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>No Penerimaan</th>
                  <th>Tanggal</th>
                  <th>Distributor</th>
                  <th>No Faktur</th>
                  <th>Item</th>
                  <th>Oleh</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id}>
                    <td class="tabular font-medium">{r.grNo}</td>
                    <td class="tabular">{dateShort(r.date)}</td>
                    <td>{r.supplier}</td>
                    <td class="tabular">{r.invoiceRef}</td>
                    <td class="text-sm">{r.lines.map((l) => `${medMap.get(l.medicineId)?.name} (${l.qty})`).join(', ')}</td>
                    <td class="text-sm">
                      {personName(r.by)}
                      <br />
                      <span class="text-xs text-muted">{dateTime(r.at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
