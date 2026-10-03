import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { BadgePercent, CheckCircle2, CreditCard, FileText, Loader2, Plus, Printer, QrCode, Trash2, Wallet, XCircle, Info } from 'lucide-preact';
import { invoiceTotals } from '../../../lib/billing';
import { dummyQrSvg } from '../../../lib/barcode';
import { BANKS, INVOICE_CATEGORY_LABEL, INVOICE_STATUS, PAY_METHOD_LABEL, VISIT_STATUS } from '../../../lib/constants';
import { dateTime, rupiah } from '../../../lib/format';
import type { InvoiceCategory, InvoiceItem, PayMethod } from '../../../lib/types';
import { $invoices, $payments, $visits } from '../../../stores/db';
import { $doctorMap, $patientMap, $poliMap, $personName } from '../../../stores/selectors';
import { addManualItem, applyDiscount, cancelInvoice, pay, removeInvoiceItem } from '../../../stores/actions';
import { confirmDialog, toast } from '../../../stores/ui';
import { Badge, StatusPill } from '../../ui/Badge';
import { Card, NotFound, PageSkeleton } from '../../ui/Display';
import { Input, RadioGroup, Select } from '../../ui/Field';
import { Modal } from '../../ui/Modal';
import { run, useParam, useReady } from '../../ui/hooks';
import { PatientStrip, PayerBadge } from '../shared';

interface MethodRow {
  type: PayMethod;
  amount: string;
  bank: string;
  ref: string;
}
const CATS: InvoiceCategory[] = ['ADMIN', 'DOKTER', 'TINDAKAN', 'OBAT', 'LAIN'];

function QrisBox({ amount, onPaid }: { amount: number; onPaid: (ref: string) => void }) {
  const [left, setLeft] = useState(5);
  const [state, setState] = useState<'wait' | 'checking' | 'paid'>('wait');
  const [code] = useState(() => `QRIS-${Date.now().toString(36).toUpperCase()}`);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const simulate = () => {
    setState('checking');
    setTimeout(() => {
      setState('paid');
      onPaid(code);
    }, 900);
  };
  return (
    <div class="flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] border border-border bg-white p-4">
      <div class="relative h-36 w-36 shrink-0">
        <div class="h-full w-full" dangerouslySetInnerHTML={{ __html: dummyQrSvg(code) }} />
        {state === 'paid' && (
          <div class="absolute inset-0 flex items-center justify-center rounded bg-white/90">
            <CheckCircle2 size={48} class="text-success" />
          </div>
        )}
      </div>
      <div class="min-w-0 flex-1 space-y-2">
        <p class="text-xs font-semibold tracking-wider text-muted uppercase">QRIS · RS Dustira (simulasi)</p>
        <p class="tabular text-2xl font-bold">{rupiah(amount)}</p>
        <p class="tabular text-xs text-muted">ID transaksi: {code}</p>
        {state === 'paid' ? (
          <p class="flex items-center gap-1.5 text-sm font-semibold text-success-strong">
            <CheckCircle2 size={16} /> Pembayaran diterima
          </p>
        ) : (
          <button type="button" class="btn btn-primary btn-sm" disabled={left > 0 || state === 'checking'} onClick={simulate}>
            {state === 'checking' ? <Loader2 size={14} class="animate-spin" /> : null}
            {left > 0 ? `Menunggu pasien memindai... ${left}` : state === 'checking' ? 'Memeriksa status...' : 'Simulasikan Pembayaran Berhasil'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function InvoiceDetail() {
  const ready = useReady(150);
  const id = useParam('id');
  const invoices = useStore($invoices);
  const payments = useStore($payments);
  const visits = useStore($visits);
  const pMap = useStore($patientMap);
  const poliMap = useStore($poliMap);
  const docMap = useStore($doctorMap);
  const personName = useStore($personName);
  const inv = invoices.find((i) => i.id === id);
  const [methods, setMethods] = useState<MethodRow[]>([]);
  const [cash, setCash] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ name: '', qty: '1', price: '', category: 'LAIN' as InvoiceCategory, covered: false });
  const [discOpen, setDiscOpen] = useState(false);
  const [disc, setDisc] = useState({ mode: 'NOMINAL' as 'NOMINAL' | 'PERSEN', value: '', reason: '', pin: '' });
  const [discErr, setDiscErr] = useState('');

  const t = inv ? invoiceTotals(inv, payments) : undefined;
  useEffect(() => {
    if (t && methods.length === 0) setMethods([{ type: 'TUNAI', amount: String(t.remaining), bank: '', ref: '' }]);
  }, [inv?.id, t?.remaining]);

  if (!ready) return <PageSkeleton />;
  if (!inv || !t) return <NotFound what="Tagihan" back={{ href: '/app/kasir', label: 'Kembali ke kasir' }} />;
  const p = pMap.get(inv.patientId)!;
  const visit = visits.find((v) => v.id === inv.visitId);
  const pays = payments.filter((x) => x.invoiceId === inv.id).sort((a, b) => b.at.localeCompare(a.at));
  const payable = inv.status === 'BELUM_BAYAR' || inv.status === 'SEBAGIAN';
  const editable = inv.status !== 'LUNAS' && inv.status !== 'BATAL';

  const totalInput = methods.reduce((a, m) => a + (Number(m.amount) || 0), 0);
  const cashPart = methods.filter((m) => m.type === 'TUNAI').reduce((a, m) => a + (Number(m.amount) || 0), 0);
  const change = Math.max((Number(cash) || 0) - cashPart, 0);
  const setM = (i: number, patch: Partial<MethodRow>) => setMethods(methods.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  const process = async () => {
    if (t.remaining > 0 && totalInput !== t.remaining) {
      const r = await confirmDialog({
        title: totalInput < t.remaining ? 'Pembayaran sebagian?' : 'Nominal melebihi sisa',
        message: totalInput < t.remaining ? `Total input ${rupiah(totalInput)} kurang dari sisa ${rupiah(t.remaining)}. Tagihan akan berstatus Sebagian.` : 'Kurangi nominal agar sesuai sisa tagihan.',
        confirmLabel: totalInput < t.remaining ? 'Proses Sebagian' : 'Mengerti',
      });
      if (!r.ok || totalInput > t.remaining) return;
    }
    const qrisPending = methods.find((m) => m.type === 'QRIS' && Number(m.amount) > 0 && !m.ref);
    if (qrisPending) return toast('Selesaikan simulasi QRIS terlebih dahulu', { tone: 'warning' });
    const res = run(() => pay(inv.id, { methods: methods.map((m) => ({ type: m.type, amount: Number(m.amount) || 0, bank: m.bank || undefined, ref: m.ref || undefined })), cashReceived: Number(cash) || undefined }));
    if (res) {
      const after = invoiceTotals({ ...inv }, $payments.get());
      toast(after.remaining === 0 ? 'Pembayaran lunas' : 'Pembayaran sebagian diterima', { message: `${res.receiptNo}${res.change ? ` · Kembalian ${rupiah(res.change)}` : ''}` });
      setMethods([]);
      setCash('');
    }
  };

  const saveManual = () => {
    if (run(() => addManualItem(inv.id, { name: manual.name, qty: Number(manual.qty), price: Number(manual.price), category: manual.category, covered: manual.covered }), 'Item manual ditambahkan', manual.name)) {
      setManualOpen(false);
      setManual({ name: '', qty: '1', price: '', category: 'LAIN', covered: false });
      setMethods([]);
    }
  };

  const patientPortion = t.subtotal - t.covered;
  const discAmount = disc.mode === 'PERSEN' ? Math.round((patientPortion * (Number(disc.value) || 0)) / 100) : Number(disc.value) || 0;
  const saveDisc = () => {
    if (!disc.reason.trim()) return setDiscErr('Alasan diskon wajib diisi');
    if (!disc.pin) return setDiscErr('PIN otorisasi wajib diisi');
    try {
      applyDiscount(inv.id, discAmount, disc.reason, disc.pin);
      toast('Diskon diterapkan', { message: `${rupiah(discAmount)} · ${disc.reason}` });
      setDiscOpen(false);
      setMethods([]);
    } catch (e) {
      setDiscErr((e as Error).message);
    }
  };

  const removeItem = async (it: InvoiceItem) => {
    const r = await confirmDialog({ title: `Hapus item "${it.name}"?`, confirmLabel: 'Hapus', tone: 'danger' });
    if (r.ok && run(() => removeInvoiceItem(inv.id, it.id), 'Item dihapus')) setMethods([]);
  };

  const cancel = async () => {
    const r = await confirmDialog({ title: `Batalkan tagihan ${inv.invoiceNo}?`, message: 'Tindakan ini memerlukan otorisasi supervisor.', input: { label: 'Alasan pembatalan' }, pin: true, confirmLabel: 'Batalkan Tagihan', tone: 'danger' });
    if (r.ok) run(() => cancelInvoice(inv.id, r.text ?? '', r.pin ?? ''), 'Tagihan dibatalkan', inv.invoiceNo);
  };

  const sourceLink = (it: InvoiceItem) => {
    if (it.category === 'TINDAKAN' && visit) return <a href={`/app/rekam-medis/periksa?visit=${visit.id}`} class="link text-xs">Rekam medis</a>;
    if (it.category === 'OBAT' && it.refId) return <a href={`/app/farmasi/resep?id=${it.refId}`} class="link text-xs">Resep</a>;
    if (it.manual) return <Badge>Manual</Badge>;
    return <span class="text-xs text-subtle">Pendaftaran</span>;
  };

  return (
    <div>
      <a href="/app/kasir" class="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
        ← Daftar tagihan
      </a>
      <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="flex flex-wrap items-center gap-2 text-2xl font-bold">
            <span class="tabular">{inv.invoiceNo}</span> <StatusPill status={INVOICE_STATUS[inv.status]} />
          </h1>
          <p class="text-sm text-muted">
            {dateTime(inv.createdAt)} · {visit?.regNo} · {poliMap.get(visit?.poliId ?? '')?.name} · {docMap.get(visit?.doctorId ?? '')?.name}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          {editable && (
            <button type="button" class="btn btn-secondary" onClick={() => setManualOpen(true)}>
              <Plus size={16} /> Tambah Item Manual
            </button>
          )}
          <a href={`/app/kasir/kwitansi?id=${inv.id}&mode=rincian`} class="btn btn-secondary">
            <FileText size={16} /> Cetak Rincian
          </a>
          {pays.length > 0 && (
            <a href={`/app/kasir/kwitansi?id=${inv.id}`} class="btn btn-primary">
              <Printer size={16} /> Cetak Kwitansi
            </a>
          )}
          {editable && (
            <button type="button" class="btn btn-ghost text-danger-strong" onClick={cancel}>
              <XCircle size={16} /> Batalkan Tagihan
            </button>
          )}
        </div>
      </div>

      <PatientStrip p={p} extra={visit && <div class="text-right text-sm"><PayerBadge payer={visit.payer} /><p class="mt-1 text-xs text-muted">Kunjungan: <StatusPill status={VISIT_STATUS[visit.status]} /></p></div>} />

      {inv.status === 'DRAFT' && (
        <p class="mt-4 flex items-center gap-2 rounded-[var(--radius-field)] border border-info/30 bg-info-soft p-3 text-sm text-info-strong">
          <Info size={16} /> Kunjungan masih berjalan ({VISIT_STATUS[visit?.status ?? 'MENUNGGU'].label}). Item tindakan dan obat akan bertambah otomatis. Pembayaran dapat diproses setelah pasien diarahkan ke kasir.
        </p>
      )}
      {inv.status === 'BATAL' && <p class="mt-4 rounded-[var(--radius-field)] bg-danger-soft p-3 text-sm text-danger-strong">Dibatalkan: {inv.cancelReason}</p>}

      <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card title="Rincian Tagihan" bodyClass="">
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th class="text-right">Qty</th>
                  <th class="text-right">Harga</th>
                  <th class="text-right">Subtotal</th>
                  <th class="text-right">Ditanggung</th>
                  <th>Sumber</th>
                  <th />
                </tr>
              </thead>
              {CATS.map((c) => {
                const items = inv.items.filter((i) => i.category === c);
                if (!items.length) return null;
                return (
                  <tbody key={c}>
                    <tr>
                      <td colSpan={7} class="bg-surface py-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
                        {INVOICE_CATEGORY_LABEL[c]}
                      </td>
                    </tr>
                    {items.map((it) => (
                      <tr key={it.id}>
                        <td>{it.name}</td>
                        <td class="num text-right">{it.qty}</td>
                        <td class="num text-right">{rupiah(it.price)}</td>
                        <td class="num text-right">{rupiah(it.qty * it.price)}</td>
                        <td class="num text-right text-success-strong">{it.coveredByPayer ? rupiah(it.coveredByPayer) : '-'}</td>
                        <td>{sourceLink(it)}</td>
                        <td class="text-right">
                          {it.manual && editable && (
                            <button type="button" class="btn-icon h-8 w-8 hover:text-danger" aria-label={`Hapus ${it.name}`} onClick={() => removeItem(it)}>
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                );
              })}
            </table>
          </div>
        </Card>

        <div class="space-y-6">
          <Card title="Ringkasan">
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-muted">Subtotal</dt>
                <dd class="tabular">{rupiah(t.subtotal)}</dd>
              </div>
              <div class="flex justify-between text-success-strong">
                <dt>Ditanggung penjamin</dt>
                <dd class="tabular">- {rupiah(t.covered)}</dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="text-muted">
                  Diskon
                  {inv.discount && <span class="block text-xs">({inv.discount.reason})</span>}
                </dt>
                <dd class="flex items-center gap-2">
                  <span class="tabular">- {rupiah(t.discount)}</span>
                  {editable && (
                    <button type="button" class="btn btn-ghost btn-sm" onClick={() => { setDisc({ mode: 'NOMINAL', value: inv.discount ? String(inv.discount.amount) : '', reason: inv.discount?.reason ?? '', pin: '' }); setDiscErr(''); setDiscOpen(true); }}>
                      <BadgePercent size={14} /> {inv.discount ? 'Ubah' : 'Beri diskon'}
                    </button>
                  )}
                </dd>
              </div>
              <div class="flex justify-between border-t border-border pt-2 text-base font-bold">
                <dt>Total Bayar Pasien</dt>
                <dd class="tabular text-primary">{rupiah(t.due)}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-muted">Sudah dibayar</dt>
                <dd class="tabular">{rupiah(t.paid)}</dd>
              </div>
              <div class="flex justify-between font-semibold">
                <dt>Sisa</dt>
                <dd class="tabular">{rupiah(t.remaining)}</dd>
              </div>
            </dl>
          </Card>

          {payable && (
            <Card title="Pembayaran">
              {t.remaining === 0 ? (
                <div class="space-y-3">
                  <p class="text-sm text-muted">Pasien tidak memiliki tanggungan (ditanggung penuh penjamin / diskon).</p>
                  <button type="button" class="btn btn-primary w-full" onClick={() => run(() => pay(inv.id, { methods: [] }), 'Tagihan diselesaikan (Rp0)')}>
                    <CheckCircle2 size={16} /> Proses Pembayaran Rp0
                  </button>
                </div>
              ) : (
                <div class="space-y-4">
                  {methods.map((m, i) => (
                    <div key={i} class="space-y-3 rounded-[var(--radius-card)] border border-border p-3">
                      <div class="flex items-end gap-2">
                        <Select class="flex-1" label={`Metode ${methods.length > 1 ? i + 1 : ''}`} value={m.type} onValue={(v) => setM(i, { type: v as PayMethod, ref: '', bank: '' })} options={(Object.keys(PAY_METHOD_LABEL) as PayMethod[]).map((k) => ({ value: k, label: PAY_METHOD_LABEL[k] }))} />
                        <Input class="w-36" label="Nominal" type="number" min={0} value={m.amount} onValue={(v) => setM(i, { amount: v, ref: m.type === 'QRIS' ? '' : m.ref })} />
                        {methods.length > 1 && (
                          <button type="button" class="btn-icon mb-0.5 hover:text-danger" aria-label="Hapus metode" onClick={() => setMethods(methods.filter((_, idx) => idx !== i))}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      {(m.type === 'DEBIT' || m.type === 'KREDIT') && (
                        <div class="grid grid-cols-2 gap-2">
                          <Select label="Bank" value={m.bank} onValue={(v) => setM(i, { bank: v })} options={BANKS} placeholder="Pilih" />
                          <Input label="No referensi / approval" value={m.ref} onValue={(v) => setM(i, { ref: v })} placeholder="6 digit" />
                        </div>
                      )}
                      {m.type === 'TRANSFER' && <Input label="No referensi transfer" value={m.ref} onValue={(v) => setM(i, { ref: v })} />}
                      {m.type === 'QRIS' && Number(m.amount) > 0 && <QrisBox key={m.amount} amount={Number(m.amount)} onPaid={(ref) => setM(i, { ref })} />}
                    </div>
                  ))}
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm"
                    onClick={() => setMethods([...methods, { type: methods.some((m) => m.type === 'TUNAI') ? 'DEBIT' : 'TUNAI', amount: String(Math.max(t.remaining - totalInput, 0)), bank: '', ref: '' }])}
                  >
                    <Plus size={14} /> Tambah metode (split)
                  </button>
                  {cashPart > 0 && (
                    <div class="grid grid-cols-2 gap-3 rounded-[var(--radius-card)] bg-surface p-3">
                      <Input label="Uang diterima" type="number" min={0} value={cash} onValue={setCash} hint={`Tunai: ${rupiah(cashPart)}`} />
                      <div>
                        <p class="field-label">Kembalian</p>
                        <p class="tabular text-xl font-bold text-success-strong">{rupiah(change)}</p>
                      </div>
                      <div class="col-span-2 flex flex-wrap gap-1.5">
                        {[cashPart, Math.ceil(cashPart / 50000) * 50000, Math.ceil(cashPart / 100000) * 100000, Math.ceil(cashPart / 100000) * 100000 + 100000]
                          .filter((v, idx, arr) => arr.indexOf(v) === idx)
                          .map((v) => (
                            <button key={v} type="button" class="badge bg-white ring-1 ring-border hover:bg-surface-2" onClick={() => setCash(String(v))}>
                              {rupiah(v)}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                  <div class="flex justify-between text-sm">
                    <span class="text-muted">Total input</span>
                    <span class={`tabular font-semibold ${totalInput !== t.remaining ? 'text-warning-strong' : 'text-success-strong'}`}>
                      {rupiah(totalInput)} / {rupiah(t.remaining)}
                    </span>
                  </div>
                  <button type="button" class="btn btn-primary btn-lg w-full" onClick={process}>
                    <Wallet size={18} /> Proses Pembayaran
                  </button>
                </div>
              )}
            </Card>
          )}

          {pays.length > 0 && (
            <Card title="Riwayat Pembayaran" bodyClass="">
              <ul class="divide-y divide-border">
                {pays.map((x) => (
                  <li key={x.id} class="px-5 py-3 text-sm">
                    <div class="flex items-center justify-between gap-2">
                      <span class="tabular font-semibold">{x.receiptNo}</span>
                      <span class="tabular font-semibold">{rupiah(x.methods.reduce((a, m) => a + m.amount, 0))}</span>
                    </div>
                    <p class="text-xs text-muted">
                      {dateTime(x.at)} · {personName(x.cashierId)}
                    </p>
                    <p class="mt-1 flex flex-wrap gap-1">
                      {x.methods.length === 0 && <Badge tone="success">{x.note}</Badge>}
                      {x.methods.map((m, i) => (
                        <Badge key={i} tone="info">
                          {m.type === 'QRIS' ? <QrCode size={12} /> : m.type === 'TUNAI' ? <Wallet size={12} /> : <CreditCard size={12} />}
                          {PAY_METHOD_LABEL[m.type]} {rupiah(m.amount)}
                          {m.bank ? ` · ${m.bank}` : ''}
                        </Badge>
                      ))}
                    </p>
                    {x.change ? <p class="mt-1 text-xs text-muted">Diterima {rupiah(x.cashReceived ?? 0)} · kembalian {rupiah(x.change)}</p> : null}
                    <a href={`/app/kasir/kwitansi?id=${inv.id}&pay=${x.id}`} class="link mt-1 inline-block text-xs">
                      Cetak kwitansi ini
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title="Tambah Item Manual"
        footer={
          <>
            <button type="button" class="btn btn-secondary" onClick={() => setManualOpen(false)}>
              Batal
            </button>
            <button type="button" class="btn btn-primary" onClick={saveManual}>
              Tambahkan
            </button>
          </>
        }
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <Input class="sm:col-span-2" label="Nama item" required data-autofocus value={manual.name} onValue={(v) => setManual({ ...manual, name: v })} placeholder="Contoh: Surat keterangan sehat" />
          <Select label="Kategori" value={manual.category} onValue={(v) => setManual({ ...manual, category: v as InvoiceCategory })} options={CATS.map((c) => ({ value: c, label: INVOICE_CATEGORY_LABEL[c] }))} />
          <Input label="Qty" type="number" min={1} value={manual.qty} onValue={(v) => setManual({ ...manual, qty: v })} />
          <Input label="Harga satuan (Rp)" type="number" min={0} value={manual.price} onValue={(v) => setManual({ ...manual, price: v })} />
          <label class="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" class="checkbox" checked={manual.covered} onChange={(e) => setManual({ ...manual, covered: (e.target as HTMLInputElement).checked })} /> Ditanggung penjamin
          </label>
        </div>
      </Modal>

      <Modal
        open={discOpen}
        onClose={() => setDiscOpen(false)}
        title="Diskon Tagihan"
        description="Diskon memerlukan otorisasi supervisor (PIN demo: 1234)."
        size="sm"
        footer={
          <>
            <button type="button" class="btn btn-secondary" onClick={() => setDiscOpen(false)}>
              Batal
            </button>
            <button type="button" class="btn btn-primary" onClick={saveDisc}>
              Terapkan Diskon
            </button>
          </>
        }
      >
        <div class="space-y-4">
          <RadioGroup
            name="disc-mode"
            value={disc.mode}
            onValue={(v) => setDisc({ ...disc, mode: v })}
            options={[
              { value: 'NOMINAL', label: 'Nominal (Rp)' },
              { value: 'PERSEN', label: 'Persen (%)' },
            ]}
          />
          <Input label={disc.mode === 'PERSEN' ? 'Persentase' : 'Nominal'} type="number" min={0} max={disc.mode === 'PERSEN' ? 100 : undefined} data-autofocus value={disc.value} onValue={(v) => setDisc({ ...disc, value: v })} hint={`= ${rupiah(discAmount)} dari tanggungan pasien ${rupiah(patientPortion)}`} />
          <Select label="Alasan" required value={disc.reason} onValue={(v) => setDisc({ ...disc, reason: v })} options={['Karyawan RS', 'Keluarga karyawan', 'Program sosial / tidak mampu', 'Kompensasi layanan', 'Pembulatan']} placeholder="Pilih alasan" />
          <Input label="PIN otorisasi" type="password" inputMode="numeric" maxLength={6} value={disc.pin} onValue={(v) => setDisc({ ...disc, pin: v })} />
          {discErr && (
            <p class="field-error" role="alert">
              {discErr}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
