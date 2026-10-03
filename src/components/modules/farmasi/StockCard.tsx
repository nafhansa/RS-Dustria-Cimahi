import { useStore } from '@nanostores/preact';
import { SlidersHorizontal } from 'lucide-preact';
import { MED_CATEGORY_LABEL, MED_FORM_LABEL } from '../../../lib/constants';
import { daysBetween, todayStr } from '../../../lib/date';
import { dateShort, dateTime, rupiah } from '../../../lib/format';
import { stockStatus, STOCK_STATUS, totalStock } from '../../../lib/stock';
import { $medicines, $stockMovements } from '../../../stores/db';
import { $personName } from '../../../stores/selectors';
import { Badge, StatusPill } from '../../ui/Badge';
import { Card, KV, NotFound, PageHeader, PageSkeleton } from '../../ui/Display';
import { useParam, useReady } from '../../ui/hooks';

export default function StockCard() {
  const ready = useReady();
  const id = useParam('id');
  const meds = useStore($medicines);
  const moves = useStore($stockMovements);
  const personName = useStore($personName);
  if (!ready) return <PageSkeleton />;
  const m = meds.find((x) => x.id === id);
  if (!m) return <NotFound what="Obat" back={{ href: '/app/farmasi/stok', label: 'Kembali ke stok' }} />;
  const mv = moves.filter((x) => x.medicineId === m.id).sort((a, b) => b.at.localeCompare(a.at));
  const t = todayStr();

  // running balance (newest first): start from current stock and walk back
  let bal = totalStock(m);
  const withBal = mv.map((x) => {
    const row = { ...x, balance: bal };
    bal -= x.qty;
    return row;
  });

  return (
    <div>
      <PageHeader
        title={m.name}
        subtitle={`${m.code} · Kartu stok`}
        back={{ href: '/app/farmasi/stok', label: 'Stok obat' }}
        actions={
          <a href="/app/farmasi/stok" class="btn btn-secondary">
            <SlidersHorizontal size={16} /> Penyesuaian di daftar stok
          </a>
        }
      />
      <div class="grid gap-6 lg:grid-cols-3">
        <Card title="Informasi Obat">
          <KV
            cols={1}
            items={[
              ['Nama generik', m.genericName],
              ['Golongan', MED_CATEGORY_LABEL[m.category]],
              ['Sediaan / satuan', `${MED_FORM_LABEL[m.form]} / ${m.unit}`],
              ['Harga jual', rupiah(m.sellPrice)],
              ['Stok total', <span class="tabular text-lg font-bold">{totalStock(m)} {m.unit}</span>],
              ['Stok minimum', `${m.minStock} ${m.unit}`],
              ['Status', <StatusPill status={STOCK_STATUS[stockStatus(m)]} />],
              ['Tag alergi', m.allergyTags.length ? m.allergyTags.join(', ') : '-'],
            ]}
          />
        </Card>
        <Card title="Batch" class="lg:col-span-2" bodyClass="">
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>No Batch</th>
                  <th>Kedaluwarsa</th>
                  <th class="text-right">Qty</th>
                  <th class="text-right">Harga Beli</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {m.batches.length === 0 && (
                  <tr>
                    <td colSpan={5} class="py-8 text-center text-sm text-muted">
                      Tidak ada batch. Lakukan penerimaan barang.
                    </td>
                  </tr>
                )}
                {[...m.batches]
                  .sort((a, b) => a.expiry.localeCompare(b.expiry))
                  .map((b) => {
                    const days = daysBetween(t, b.expiry);
                    return (
                      <tr key={b.batchNo}>
                        <td class="tabular font-medium">{b.batchNo}</td>
                        <td class="tabular">{dateShort(b.expiry)}</td>
                        <td class="num text-right">{b.qty}</td>
                        <td class="num text-right">{rupiah(b.buyPrice)}</td>
                        <td>
                          {b.qty === 0 ? (
                            <Badge>Kosong</Badge>
                          ) : days <= 90 ? (
                            <Badge tone="warning">ED {days} hari lagi</Badge>
                          ) : null}
                          {b.qty > 0 && [...m.batches].filter((x) => x.qty > 0).sort((a, c) => a.expiry.localeCompare(c.expiry))[0]?.batchNo === b.batchNo && (
                            <Badge tone="info" class="ml-1">
                              Dipakai berikutnya (FEFO)
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <Card title="Mutasi Stok" class="mt-6" bodyClass="">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Jenis</th>
                <th>Batch</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Saldo</th>
                <th>Referensi</th>
                <th>Keterangan</th>
                <th>Oleh</th>
              </tr>
            </thead>
            <tbody>
              {withBal.length === 0 && (
                <tr>
                  <td colSpan={8} class="py-8 text-center text-sm text-muted">
                    Belum ada mutasi
                  </td>
                </tr>
              )}
              {withBal.map((x) => (
                <tr key={x.id}>
                  <td class="tabular">{dateTime(x.at)}</td>
                  <td>
                    <Badge tone={x.type === 'IN' ? 'success' : x.type === 'OUT' ? 'primary' : 'warning'}>{x.type === 'IN' ? 'Masuk' : x.type === 'OUT' ? 'Keluar' : 'Penyesuaian'}</Badge>
                  </td>
                  <td class="tabular text-sm">{x.batchNo}</td>
                  <td class={`num text-right font-semibold ${x.qty < 0 ? 'text-primary-strong' : 'text-success-strong'}`}>
                    {x.qty > 0 ? '+' : ''}
                    {x.qty}
                  </td>
                  <td class="num text-right">{x.balance}</td>
                  <td class="tabular text-sm">{x.ref ?? '-'}</td>
                  <td class="text-sm text-muted">{x.reason}</td>
                  <td class="text-sm">{personName(x.by)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
