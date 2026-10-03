import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { Printer, Receipt, Stethoscope, XCircle } from 'lucide-preact';
import { code128Svg } from '../../../lib/barcode';
import { VISIT_STATUS } from '../../../lib/constants';
import { dateLong, dateTime, genderLabel, ageLabel, timeHM } from '../../../lib/format';
import { $invoices, $visits } from '../../../stores/db';
import { $doctorMap, $patientMap, $poliMap } from '../../../stores/selectors';
import { canCancelVisit } from '../../../stores/actions';
import { StatusPill } from '../../ui/Badge';
import { Card, KV, NotFound, PageSkeleton } from '../../ui/Display';
import { useParam, useReady } from '../../ui/hooks';
import { DemoFootnote, Kop, PatientStrip, PayerBadge } from '../shared';
import { askCancelVisit } from './RegistrationList';

const FLOW: { key: string; label: string; at?: (v: ReturnType<typeof $visits.get>[number]) => string | undefined }[] = [
  { key: 'reg', label: 'Terdaftar', at: (v) => v.registeredAt },
  { key: 'call', label: 'Dipanggil', at: (v) => v.calledAt },
  { key: 'exam', label: 'Diperiksa', at: (v) => v.examStartedAt },
  { key: 'done', label: 'Selesai', at: (v) => v.finishedAt },
];

export default function RegistrationDetail() {
  const ready = useReady(150);
  const id = useParam('id');
  const autoPrint = useParam('print') === '1';
  const visits = useStore($visits);
  const invoices = useStore($invoices);
  const pMap = useStore($patientMap);
  const poliMap = useStore($poliMap);
  const docMap = useStore($doctorMap);
  const v = visits.find((x) => x.id === id);

  useEffect(() => {
    if (ready && v && autoPrint) setTimeout(() => window.print(), 400);
  }, [ready]);

  if (!ready) return <PageSkeleton />;
  if (!v) return <NotFound what="Registrasi" back={{ href: '/app/pendaftaran', label: 'Kembali ke pendaftaran' }} />;
  const p = pMap.get(v.patientId)!;
  const poli = poliMap.get(v.poliId);
  const doc = docMap.get(v.doctorId);
  const inv = invoices.find((i) => i.visitId === v.id);
  const waitingAhead = visits.filter((x) => x.poliId === v.poliId && x.registeredAt.slice(0, 10) === v.registeredAt.slice(0, 10) && x.status === 'MENUNGGU' && x.queueNo < v.queueNo).length;

  return (
    <div>
      <div class="no-print">
        <a href="/app/pendaftaran" class="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
          ← Pendaftaran
        </a>
        <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 class="tabular text-2xl font-bold">{v.regNo}</h1>
            <p class="mt-1 flex items-center gap-2 text-sm text-muted">
              <StatusPill status={VISIT_STATUS[v.status]} /> Didaftarkan {dateTime(v.registeredAt)}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-secondary" onClick={() => window.print()}>
              <Printer size={16} /> Cetak Bukti
            </button>
            {inv && (
              <a href={`/app/kasir/tagihan?id=${inv.id}`} class="btn btn-secondary">
                <Receipt size={16} /> Lihat Tagihan
              </a>
            )}
            {v.status !== 'BATAL' && (
              <a href={`/app/rekam-medis/periksa?visit=${v.id}`} class="btn btn-secondary">
                <Stethoscope size={16} /> Rekam Medis
              </a>
            )}
            <button
              type="button"
              class="btn btn-danger"
              disabled={!canCancelVisit(v)}
              title={canCancelVisit(v) ? undefined : 'Hanya dapat dibatalkan sebelum diperiksa'}
              onClick={() => askCancelVisit(v)}
            >
              <XCircle size={16} /> Batalkan
            </button>
          </div>
        </div>
        <div class="grid gap-6 lg:grid-cols-3">
          <div class="space-y-6 lg:col-span-2">
            <PatientStrip p={p} />
            <Card title="Detail Kunjungan">
              <KV
                items={[
                  ['Poli', poli?.name],
                  ['Dokter', doc?.name],
                  ['Jenis', v.type === 'IGD' ? 'IGD' : 'Rawat Jalan'],
                  ['Cara masuk', v.source === 'WALKIN' ? 'Datang sendiri' : v.source === 'RUJUKAN' ? 'Rujukan' : 'Booking online'],
                  ['No rujukan', v.referral ? `${v.referral.number} · ${v.referral.origin}` : '-'],
                  ['Penjamin', <PayerBadge payer={v.payer} />],
                  ['No SEP', <span class="tabular">{v.sepNo ?? '-'}</span>],
                  ['No antrian', <span class="tabular text-lg font-bold text-primary">{v.queueNo}</span>],
                  ...(v.cancelReason ? ([['Alasan batal', <span class="text-danger-strong">{v.cancelReason}</span>]] as [string, ComponentChildren][]) : []),
                ]}
              />
            </Card>
          </div>
          <Card title="Alur Pelayanan">
            <ol class="space-y-4">
              {FLOW.map((s) => {
                const at = s.at?.(v);
                return (
                  <li key={s.key} class="flex items-start gap-3">
                    <span class={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${at ? 'bg-primary' : 'bg-border'}`} />
                    <div>
                      <p class={`text-sm font-medium ${at ? 'text-text' : 'text-subtle'}`}>{s.label}</p>
                      <p class="tabular text-xs text-muted">{at ? dateTime(at) : 'Belum'}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>
      </div>

      {/* Printable slip (80mm) */}
      <div class="hidden print:block">
        <div class="print-slip mx-auto" style={{ width: '76mm' }}>
          <Kop compact />
          <p class="mt-2 text-center font-heading text-sm font-bold">BUKTI PENDAFTARAN</p>
          <p class="text-center text-[10px] text-muted">{dateLong(v.registeredAt)} · {timeHM(v.registeredAt)} WIB</p>
          <div class="my-2 rounded border-2 border-dashed border-text p-2 text-center">
            <p class="text-[10px] tracking-widest uppercase">Nomor Antrian</p>
            <p class="tabular font-heading text-4xl font-extrabold">{v.queueNo}</p>
            <p class="text-xs font-semibold">{poli?.name}</p>
            <p class="text-[10px]">{waitingAhead} pasien menunggu sebelum Anda</p>
          </div>
          <table class="w-full text-[11px]">
            <tbody>
              {[
                ['No Reg', v.regNo],
                ['No RM', p.mrn],
                ['Nama', p.name],
                ['JK/Umur', `${genderLabel(p.gender)} / ${ageLabel(p.birthDate)}`],
                ['Dokter', doc?.name ?? '-'],
                ['Penjamin', v.payer.type],
                ...(v.sepNo ? [['No SEP', v.sepNo]] : []),
              ].map(([k, val]) => (
                <tr key={k}>
                  <td class="py-0.5 pr-2 align-top text-muted">{k}</td>
                  <td class="py-0.5 font-medium">{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div class="mx-auto mt-2 h-10 w-full" dangerouslySetInnerHTML={{ __html: code128Svg(v.regNo, 40) }} />
          <p class="mt-2 text-center text-[10px]">Mohon menunggu panggilan di ruang tunggu poli. Terima kasih.</p>
          <DemoFootnote />
        </div>
      </div>
      <style>{`@media print { @page { size: 80mm auto; margin: 4mm; } body { background: #fff !important; } }`}</style>
    </div>
  );
}
