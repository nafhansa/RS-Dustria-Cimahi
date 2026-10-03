import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { invoiceTotals } from '../../../lib/billing';
import { INVOICE_CATEGORY_LABEL, PAY_METHOD_LABEL } from '../../../lib/constants';
import { dateLong, dateTime, rupiah, terbilangRupiah, timeHM } from '../../../lib/format';
import type { InvoiceCategory } from '../../../lib/types';
import { $invoices, $payments, $settings, $visits } from '../../../stores/db';
import { $doctorMap, $patientMap, $poliMap, $personName } from '../../../stores/selectors';
import { NotFound, PageSkeleton } from '../../ui/Display';
import { useParam, useReady } from '../../ui/hooks';
import { DemoFootnote, Kop, PrintToolbar, Watermark } from '../shared';

const CATS: InvoiceCategory[] = ['ADMIN', 'DOKTER', 'TINDAKAN', 'OBAT', 'LAIN'];

export default function Receipt() {
  const ready = useReady(100);
  const id = useParam('id');
  const payId = useParam('pay');
  const mode = useParam('mode');
  const settings = useStore($settings);
  const invoices = useStore($invoices);
  const payments = useStore($payments);
  const visits = useStore($visits);
  const pMap = useStore($patientMap);
  const poliMap = useStore($poliMap);
  const docMap = useStore($doctorMap);
  const personName = useStore($personName);
  const [format, setFormat] = useState<'A5' | 'THERMAL'>('A5');
  useEffect(() => setFormat(settings.receiptFormat), [settings.receiptFormat]);

  if (!ready) return <div class="p-8"><PageSkeleton /></div>;
  const inv = invoices.find((i) => i.id === id);
  if (!inv) return <div class="p-8"><NotFound what="Tagihan" back={{ href: '/app/kasir', label: 'Kembali' }} /></div>;
  const p = pMap.get(inv.patientId)!;
  const v = visits.find((x) => x.id === inv.visitId);
  const pays = payments.filter((x) => x.invoiceId === inv.id).sort((a, b) => b.at.localeCompare(a.at));
  const pay = pays.find((x) => x.id === payId) ?? pays[0];
  const t = invoiceTotals(inv, payments);
  const isRincian = mode === 'rincian' || !pay;
  const paidAmount = pay ? pay.methods.reduce((a, m) => a + m.amount, 0) : 0;
  const thermal = format === 'THERMAL';
  const title = isRincian ? 'Rincian Tagihan' : 'Kwitansi';

  const rows = [
    ['No RM', p.mrn],
    ['Nama', p.name],
    ['Poli / Dokter', `${poliMap.get(v?.poliId ?? '')?.name ?? '-'} / ${docMap.get(v?.doctorId ?? '')?.name ?? '-'}`],
    ['Penjamin', `${v?.payer.type ?? '-'}${v?.sepNo ? ` · SEP ${v.sepNo}` : ''}`],
    ['No Invoice', inv.invoiceNo],
  ];

  return (
    <div>
      <PrintToolbar back={`/app/kasir/tagihan?id=${inv.id}`}>
        <div class="flex rounded-[var(--radius-field)] border border-border p-0.5 text-sm" role="group" aria-label="Format cetak">
          {(['A5', 'THERMAL'] as const).map((f) => (
            <button key={f} type="button" aria-pressed={format === f} class={`rounded-md px-3 py-1 font-medium ${format === f ? 'bg-primary text-white' : 'text-muted hover:bg-surface-2'}`} onClick={() => setFormat(f)}>
              {f === 'A5' ? 'A5' : 'Thermal 80 mm'}
            </button>
          ))}
        </div>
        {pays.length > 0 && (
          <a class="btn btn-secondary" href={isRincian ? `/app/kasir/kwitansi?id=${inv.id}` : `/app/kasir/kwitansi?id=${inv.id}&mode=rincian`}>
            {isRincian ? 'Lihat Kwitansi' : 'Lihat Rincian'}
          </a>
        )}
      </PrintToolbar>
      <div class="px-4 pb-10 print:p-0">
        <article class={`print-doc ${thermal ? 'p-[4mm] text-[11px]' : 'p-[10mm] text-[12px]'}`} style={{ width: thermal ? '80mm' : '210mm', minHeight: thermal ? undefined : '148mm' }}>
          <Watermark />
          <Kop compact={thermal} title={thermal ? undefined : title} subtitle={thermal ? undefined : pay && !isRincian ? pay.receiptNo : inv.invoiceNo} />
          {thermal && (
            <p class="mt-2 text-center font-heading font-bold uppercase">
              {title}
              <br />
              <span class="tabular font-normal">{pay && !isRincian ? pay.receiptNo : inv.invoiceNo}</span>
            </p>
          )}
          {!isRincian && inv.status === 'LUNAS' && (
            <div class={`stamp pointer-events-none absolute z-10 ${thermal ? 'bottom-24 right-4 text-xl' : 'bottom-28 left-14 text-4xl'} rotate-[-14deg] rounded-lg border-4 border-success px-4 py-1 font-heading font-extrabold tracking-widest text-success opacity-80`}>LUNAS</div>
          )}
          <div class={`mt-3 grid gap-x-6 gap-y-0.5 ${thermal ? '' : 'grid-cols-2'}`}>
            {rows.map(([k, val]) => (
              <div key={k} class="flex gap-2">
                <span class={`${thermal ? 'w-20' : 'w-28'} shrink-0 text-muted`}>{k}</span>
                <span class="font-medium">: {val}</span>
              </div>
            ))}
            <div class="flex gap-2">
              <span class={`${thermal ? 'w-20' : 'w-28'} shrink-0 text-muted`}>Tanggal</span>
              <span class="font-medium">: {pay && !isRincian ? `${dateLong(pay.at)} ${timeHM(pay.at)}` : dateTime(inv.createdAt)}</span>
            </div>
          </div>

          <table class="mt-3 w-full">
            <thead>
              <tr class="border-y border-text">
                <th class="py-1 text-left">Uraian</th>
                {!thermal && <th class="py-1 text-right">Qty</th>}
                {!thermal && <th class="py-1 text-right">Harga</th>}
                <th class="py-1 text-right">Jumlah</th>
              </tr>
            </thead>
            {CATS.map((c) => {
              const items = inv.items.filter((i) => i.category === c);
              if (!items.length) return null;
              return (
                <tbody key={c}>
                  <tr>
                    <td colSpan={thermal ? 2 : 4} class="pt-1.5 text-[10px] font-bold text-muted uppercase">
                      {INVOICE_CATEGORY_LABEL[c]}
                    </td>
                  </tr>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td class="py-0.5 pr-2">
                        {it.name}
                        {thermal && <span class="block text-[10px] text-muted">{it.qty} × {rupiah(it.price)}</span>}
                      </td>
                      {!thermal && <td class="tabular py-0.5 text-right">{it.qty}</td>}
                      {!thermal && <td class="tabular py-0.5 text-right">{rupiah(it.price)}</td>}
                      <td class="tabular py-0.5 text-right align-top">{rupiah(it.qty * it.price)}</td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
          <div class={`mt-2 border-t border-text pt-2 ${thermal ? '' : 'ml-auto w-80'}`}>
            {(
              [
                ['Subtotal', t.subtotal],
                ['Ditanggung penjamin', -t.covered],
                ['Diskon', -t.discount],
                ['Total bayar pasien', t.due],
                ['Sudah dibayar', t.paid],
                ['Sisa', t.remaining],
              ] as [string, number][]
            ).map(([k, val]) => (
              <div key={k} class={`flex justify-between ${k === 'Total bayar pasien' ? 'border-t border-dashed border-text pt-1 text-[13px] font-bold' : ''}`}>
                <span>{k}</span>
                <span class="tabular">{rupiah(val)}</span>
              </div>
            ))}
          </div>

          {!isRincian && pay && (
            <div class="mt-3 rounded border border-border p-2">
              <p>
                <span class="text-muted">Diterima:</span> <strong class="tabular">{rupiah(paidAmount)}</strong>
              </p>
              <p class="italic">
                <span class="text-muted not-italic">Terbilang:</span> {terbilangRupiah(paidAmount)}
              </p>
              <p class="mt-1">
                <span class="text-muted">Metode:</span> {pay.methods.length ? pay.methods.map((m) => `${PAY_METHOD_LABEL[m.type]} ${rupiah(m.amount)}${m.bank ? ` (${m.bank}${m.ref ? ` #${m.ref}` : ''})` : m.ref ? ` (#${m.ref})` : ''}`).join(' + ') : pay.note}
              </p>
              {pay.cashReceived ? (
                <p>
                  <span class="text-muted">Tunai diterima / kembalian:</span> {rupiah(pay.cashReceived)} / {rupiah(pay.change ?? 0)}
                </p>
              ) : null}
            </div>
          )}

          <div class={`mt-6 flex ${thermal ? 'flex-col items-center gap-1 text-center' : 'items-end justify-between'}`}>
            <p class="text-[10px] text-muted">Terima kasih atas kepercayaan Anda. Semoga lekas sembuh.</p>
            <div class="text-center">
              <p>Cimahi, {dateLong(pay?.at ?? inv.createdAt)}</p>
              <p>Kasir,</p>
              <p class={`${thermal ? 'mt-4' : 'mt-10'} font-semibold underline`}>{pay ? personName(pay.cashierId) : '-'}</p>
            </div>
          </div>
          <DemoFootnote />
        </article>
      </div>
      <style>{thermal ? '@media print { @page { size: 80mm auto; margin: 2mm; } }' : '@media print { @page { size: A5 landscape; margin: 6mm; } .print-doc { width: 100% !important; min-height: 0 !important; } }'}</style>
    </div>
  );
}
