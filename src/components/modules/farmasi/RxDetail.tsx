import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { AlertTriangle, CheckCircle2, ClipboardCheck, HandHelping, PackageCheck, Printer, Tag, XCircle } from 'lucide-preact';
import { RX_STATUS } from '../../../lib/constants';
import { dateTime, rupiah } from '../../../lib/format';
import { allergyMatch, totalStock } from '../../../lib/stock';
import type { RxItem, RxStatus } from '../../../lib/types';
import { $medicines, $prescriptions, $visits } from '../../../stores/db';
import { $doctorMap, $medMap, $patientMap, $poliMap } from '../../../stores/selectors';
import { handoverRx, markRxReady, prepareRx, rejectRx, reviewRx, updateRxItems } from '../../../stores/actions';
import { confirmDialog, toast } from '../../../stores/ui';
import { Badge, StatusPill } from '../../ui/Badge';
import { Card, NotFound, PageSkeleton } from '../../ui/Display';
import { Input } from '../../ui/Field';
import { Modal } from '../../ui/Modal';
import { run, useParam, useReady } from '../../ui/hooks';
import { PatientStrip } from '../shared';

const FLOW: RxStatus[] = ['BARU', 'DITELAAH', 'DISIAPKAN', 'SIAP', 'DISERAHKAN'];

export default function RxDetail() {
  const ready = useReady(150);
  const id = useParam('id');
  const rxs = useStore($prescriptions);
  const meds = useStore($medicines);
  const visits = useStore($visits);
  const pMap = useStore($patientMap);
  const medMap = useStore($medMap);
  const docMap = useStore($doctorMap);
  const poliMap = useStore($poliMap);
  const rx = rxs.find((r) => r.id === id);
  const [review, setReview] = useState({ admin: false, pharmaceutical: false, clinical: false, note: '' });
  const [handOpen, setHandOpen] = useState(false);
  const [receiver, setReceiver] = useState('');
  const [educated, setEducated] = useState(false);
  const [handErr, setHandErr] = useState('');

  useEffect(() => {
    if (rx?.review) setReview({ ...rx.review, note: rx.review.note ?? '' });
  }, [rx?.id]);

  if (!ready) return <PageSkeleton />;
  if (!rx) return <NotFound what="Resep" back={{ href: '/app/farmasi', label: 'Kembali ke farmasi' }} />;
  const p = pMap.get(rx.patientId)!;
  const visit = visits.find((v) => v.id === rx.visitId);
  const editable = rx.status === 'BARU' || rx.status === 'DITELAAH';
  const stepIdx = FLOW.indexOf(rx.status);

  const setItem = (i: number, patch: Partial<RxItem>) => {
    const items = rx.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
    run(() => updateRxItems(rx.id, items));
  };

  const equivalents = (medicineId: string) => {
    const m = medMap.get(medicineId);
    if (!m) return [];
    return meds.filter((x) => x.id !== m.id && x.active !== false && (x.genericName ?? '').toLowerCase() === (m.genericName ?? '').toLowerCase() && x.form === m.form);
  };

  const doReview = () => run(() => reviewRx(rx.id, review), 'Telaah resep selesai', rx.rxNo);
  const doPrepare = async () => {
    const r = await confirmDialog({
      title: 'Siapkan obat?',
      message: 'Stok akan dikurangi dengan metode FEFO (batch dengan kedaluwarsa terdekat dipakai dulu) dan obat otomatis masuk ke tagihan pasien.',
      confirmLabel: 'Siapkan Obat',
    });
    if (r.ok) run(() => prepareRx(rx.id), 'Obat disiapkan · stok berkurang', 'Item obat ditambahkan ke tagihan');
  };
  const doReject = async () => {
    const r = await confirmDialog({
      title: 'Tolak / konfirmasi ke dokter',
      message: 'Resep akan dibatalkan dan dokter penulis resep menerima catatan konfirmasi. Pasien diteruskan ke kasir.',
      input: { label: 'Catatan untuk dokter', placeholder: 'Contoh: interaksi obat, dosis tidak sesuai, stok kosong tanpa substitusi' },
      confirmLabel: 'Kirim & Tolak Resep',
      tone: 'danger',
    });
    if (r.ok) run(() => rejectRx(rx.id, r.text ?? ''), 'Resep ditolak & dikonfirmasi ke dokter');
  };
  const doHandover = () => {
    if (!receiver.trim()) return setHandErr('Nama penerima wajib diisi');
    if (!educated) return setHandErr('Konfirmasi edukasi penggunaan obat telah diberikan');
    const res = run(() => handoverRx(rx.id, receiver));
    if (res) {
      setHandOpen(false);
      toast('Obat diserahkan ke pasien', { message: res.next === 'KASIR' ? 'Pasien diarahkan ke kasir untuk pembayaran.' : res.next === 'SELESAI' ? 'Ditanggung penuh penjamin, kunjungan selesai.' : undefined });
    }
  };

  const total = rx.items.reduce((a, it) => a + (it.qtyGiven ?? it.qty) * (medMap.get(it.substituteId || it.medicineId)?.sellPrice ?? 0), 0);

  return (
    <div>
      <a href="/app/farmasi" class="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
        ← Resep masuk
      </a>
      <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="flex items-center gap-2 text-2xl font-bold">
            <span class="tabular">{rx.rxNo}</span> <StatusPill status={RX_STATUS[rx.status]} />
          </h1>
          <p class="text-sm text-muted">
            {dateTime(rx.createdAt)} · {docMap.get(rx.doctorId)?.name} · {poliMap.get(visit?.poliId ?? '')?.name}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          {editable && (
            <button type="button" class="btn btn-secondary" onClick={doReject}>
              <XCircle size={16} /> Tolak / Konfirmasi ke Dokter
            </button>
          )}
          {['DISIAPKAN', 'SIAP', 'DISERAHKAN'].includes(rx.status) && (
            <a href={`/app/farmasi/etiket?id=${rx.id}`} class="btn btn-secondary">
              <Printer size={16} /> Cetak Etiket
            </a>
          )}
          {rx.status === 'BARU' && (
            <button type="button" class="btn btn-primary" onClick={doReview} disabled={!review.admin || !review.pharmaceutical || !review.clinical} title={!review.admin || !review.pharmaceutical || !review.clinical ? 'Centang seluruh checklist telaah terlebih dahulu' : undefined}>
              <ClipboardCheck size={16} /> Telaah Selesai
            </button>
          )}
          {rx.status === 'DITELAAH' && (
            <button type="button" class="btn btn-primary" onClick={doPrepare}>
              <PackageCheck size={16} /> Siapkan Obat
            </button>
          )}
          {rx.status === 'DISIAPKAN' && (
            <button type="button" class="btn btn-primary" onClick={() => run(() => markRxReady(rx.id), 'Obat ditandai siap diserahkan')}>
              <Tag size={16} /> Tandai Siap
            </button>
          )}
          {rx.status === 'SIAP' && (
            <button type="button" class="btn btn-primary" onClick={() => { setReceiver(p.name); setEducated(false); setHandErr(''); setHandOpen(true); }}>
              <HandHelping size={16} /> Serahkan ke Pasien
            </button>
          )}
        </div>
      </div>

      {rx.status !== 'BATAL' && (
        <ol class="card mb-6 flex flex-wrap items-center gap-2 p-4">
          {FLOW.map((s, i) => (
            <li key={s} class="flex flex-1 items-center gap-2">
              <span class={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${i <= stepIdx ? 'bg-primary text-white' : 'bg-surface-2 text-muted'}`}>{i < stepIdx ? <CheckCircle2 size={14} /> : i + 1}</span>
              <span class={`text-sm ${i <= stepIdx ? 'font-medium text-text' : 'text-muted'}`}>{RX_STATUS[s].label}</span>
              {i < FLOW.length - 1 && <span class={`hidden h-0.5 flex-1 sm:block ${i < stepIdx ? 'bg-primary' : 'bg-border'}`} />}
            </li>
          ))}
        </ol>
      )}
      {rx.rejectNote && <p class="mb-4 rounded-[var(--radius-field)] bg-danger-soft p-3 text-sm text-danger-strong">Ditolak: {rx.rejectNote}</p>}
      {rx.receivedBy && rx.status === 'DISERAHKAN' && <p class="mb-4 rounded-[var(--radius-field)] bg-success-soft p-3 text-sm text-success-strong">Diserahkan kepada {rx.receivedBy} · {dateTime(rx.updatedAt)}. Edukasi penggunaan obat telah diberikan.</p>}

      <PatientStrip p={p} />

      <Card title="Item Resep" class="mt-6" bodyClass="" actions={<span class="text-sm text-muted">Estimasi: <strong class="tabular text-text">{rupiah(total)}</strong></span>}>
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Obat</th>
                <th>Dosis & Aturan</th>
                <th class="text-right">Diminta</th>
                <th class="text-right">Stok</th>
                <th>Diberikan</th>
                <th>Substitusi</th>
              </tr>
            </thead>
            <tbody>
              {rx.items.map((it, i) => {
                const m = medMap.get(it.medicineId)!;
                const used = medMap.get(it.substituteId || it.medicineId)!;
                const stock = totalStock(used);
                const given = it.qtyGiven ?? it.qty;
                const hit = allergyMatch(p.allergies, used);
                const eq = equivalents(it.medicineId);
                return (
                  <tr key={i} class={hit ? 'bg-danger-soft/40' : ''}>
                    <td>
                      <p class="font-medium">{m.name}</p>
                      <p class="text-xs text-muted">{m.genericName}</p>
                      {hit && (
                        <span class="badge mt-1 bg-danger text-white">
                          <AlertTriangle size={12} /> Alergi {hit}
                        </span>
                      )}
                    </td>
                    <td class="text-sm">
                      {it.dose} · {it.frequency} · {it.route}
                      <br />
                      <span class="text-muted">
                        {it.durationDays} hari · {it.instruction}
                      </span>
                    </td>
                    <td class="num text-right">
                      {it.qty} {m.unit}
                    </td>
                    <td class="num text-right">
                      <Badge tone={stock === 0 ? 'danger' : stock < given ? 'warning' : 'success'}>{stock === 0 ? 'Habis' : `${stock} ${used.unit}`}</Badge>
                    </td>
                    <td>
                      {editable ? (
                        <input type="number" min={0} class="input w-24 py-1" value={given} aria-label={`Jumlah diberikan ${m.name}`} onChange={(e) => setItem(i, { qtyGiven: Math.max(0, Number((e.target as HTMLInputElement).value) || 0) })} />
                      ) : (
                        <span class="tabular font-medium">
                          {given} {used.unit}
                        </span>
                      )}
                    </td>
                    <td>
                      {editable ? (
                        eq.length ? (
                          <select class="input py-1 text-sm" value={it.substituteId ?? ''} aria-label={`Substitusi ${m.name}`} onChange={(e) => setItem(i, { substituteId: (e.target as HTMLSelectElement).value || undefined })}>
                            <option value="">Tanpa substitusi</option>
                            {eq.map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.name} (stok {totalStock(x)})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span class="text-xs text-subtle">Tidak ada obat setara</span>
                        )
                      ) : it.substituteId ? (
                        <Badge tone="info">{used.name}</Badge>
                      ) : (
                        <span class="text-xs text-subtle">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Checklist Telaah Resep" class="mt-6">
        <div class="grid gap-3 md:grid-cols-3">
          {(
            [
              ['admin', 'Kelengkapan administratif', 'Identitas pasien & dokter, tanggal, paraf/TTE, SIP'],
              ['pharmaceutical', 'Kesesuaian farmasetik', 'Bentuk sediaan, kekuatan, stabilitas, kompatibilitas'],
              ['clinical', 'Pertimbangan klinis', 'Duplikasi, interaksi obat, alergi, dosis & durasi'],
            ] as const
          ).map(([k, title, desc]) => (
            <label key={k} class={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-card)] border p-4 ${review[k] ? 'border-success bg-success-soft' : 'border-border'}`}>
              <input type="checkbox" class="checkbox mt-0.5" disabled={rx.status !== 'BARU'} checked={review[k]} onChange={(e) => setReview({ ...review, [k]: (e.target as HTMLInputElement).checked })} />
              <span>
                <span class="block text-sm font-semibold">{title}</span>
                <span class="block text-xs text-muted">{desc}</span>
              </span>
            </label>
          ))}
        </div>
        {p.allergies.length > 0 && (
          <p class="mt-3 flex items-center gap-2 text-sm font-medium text-danger-strong">
            <AlertTriangle size={16} /> Pasien alergi: {p.allergies.join(', ')}. Pastikan tidak ada obat yang berisiko.
          </p>
        )}
        <Input class="mt-4" label="Catatan telaah" disabled={rx.status !== 'BARU'} value={review.note} onValue={(v) => setReview({ ...review, note: v })} />
      </Card>

      <Modal
        open={handOpen}
        onClose={() => setHandOpen(false)}
        title="Serahkan Obat ke Pasien"
        size="sm"
        footer={
          <>
            <button type="button" class="btn btn-secondary" onClick={() => setHandOpen(false)}>
              Batal
            </button>
            <button type="button" class="btn btn-primary" onClick={doHandover}>
              Serahkan
            </button>
          </>
        }
      >
        <div class="space-y-4">
          <Input label="Nama penerima" required data-autofocus value={receiver} onValue={setReceiver} hint="Pasien atau keluarga yang menerima obat" />
          <label class="flex items-start gap-2 text-sm">
            <input type="checkbox" class="checkbox mt-0.5" checked={educated} onChange={(e) => setEducated((e.target as HTMLInputElement).checked)} />
            Edukasi cara pakai, dosis, efek samping, dan penyimpanan obat telah diberikan.
          </label>
          {handErr && (
            <p class="field-error" role="alert">
              {handErr}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
