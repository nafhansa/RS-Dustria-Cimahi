import { useStore } from '@nanostores/preact';
import { code128Svg, dummyQrSvg } from '../../../lib/barcode';
import { dateShort, genderLabel } from '../../../lib/format';
import { $patients } from '../../../stores/db';
import { NotFound, PageSkeleton } from '../../ui/Display';
import { useParam, useReady } from '../../ui/hooks';
import { PayerBadge, PrintToolbar } from '../shared';

export default function PatientCard() {
  const ready = useReady(100);
  const id = useParam('id');
  const patients = useStore($patients);
  if (!ready)
    return (
      <div class="p-8">
        <PageSkeleton />
      </div>
    );
  const p = patients.find((x) => x.id === id);
  if (!p)
    return (
      <div class="p-8">
        <NotFound what="Pasien" back={{ href: '/app/pasien', label: 'Kembali' }} />
      </div>
    );

  return (
    <div>
      <PrintToolbar back={`/app/pasien/detail?id=${p.id}`} />
      <div class="flex flex-col items-center gap-6 px-4 pb-10 print:block print:p-0">
        <p class="no-print text-sm text-muted">Ukuran kartu ID-1 (85,6 × 54 mm). Gunakan skala 100% saat mencetak.</p>
        {/* Front */}
        <div class="print-doc rounded-[10px] border border-border" style={{ width: '85.6mm', height: '54mm' }}>
          <div class="stamp absolute inset-x-0 top-0 h-[13mm] bg-gradient-to-r from-primary to-[#e62129]" />
          <div class="stamp absolute -right-6 -bottom-8 h-28 w-28 rounded-full bg-primary-soft" />
          <div class="relative flex h-full flex-col px-[4mm] pt-[2.5mm] pb-[3mm]">
            <div class="flex items-center gap-2">
              <span class="flex h-[8mm] w-[8mm] items-center justify-center rounded-full bg-white">
                <img src="/logo-symbol.png" alt="" class="h-[6.5mm] w-[6.5mm] object-contain" />
              </span>
              <div class="leading-tight text-white">
                <p class="font-heading text-[11px] font-bold tracking-wide">RUMAH SAKIT DUSTIRA</p>
                <p class="text-[7px] opacity-90">KARTU IDENTITAS BEROBAT · CIMAHI</p>
              </div>
            </div>
            <div class="mt-[2.5mm] flex flex-1 gap-[3mm]">
              <div class="min-w-0 flex-1">
                <p class="text-[7px] text-subtle uppercase">Nama Pasien</p>
                <p class="truncate text-[12px] leading-tight font-bold text-text">{p.name}</p>
                <p class="mt-[1.5mm] text-[7px] text-subtle uppercase">No. Rekam Medis</p>
                <p class="tabular text-[15px] leading-tight font-extrabold tracking-wide text-primary">{p.mrn}</p>
                <p class="tabular mt-[1mm] text-[8px] text-muted">
                  {genderLabel(p.gender)} · Lahir {dateShort(p.birthDate)}
                </p>
              </div>
              <div class="h-[17mm] w-[17mm] shrink-0" dangerouslySetInnerHTML={{ __html: dummyQrSvg(p.mrn) }} />
            </div>
            <div class="h-[6mm] w-[48mm]" dangerouslySetInnerHTML={{ __html: code128Svg(p.mrn, 40) }} />
          </div>
        </div>
        {/* Back */}
        <div class="print-doc rounded-[10px] border border-border print:mt-4" style={{ width: '85.6mm', height: '54mm' }}>
          <div class="flex h-full flex-col justify-between p-[4mm] text-[7.5px] leading-snug text-muted">
            <div>
              <p class="mb-1 text-[9px] font-semibold text-text">Ketentuan</p>
              <ol class="list-decimal space-y-0.5 pl-3">
                <li>Kartu ini wajib dibawa setiap kali berobat.</li>
                <li>Kartu ini milik Rumah Sakit Dustira, tidak dapat dipindahtangankan.</li>
                <li>Bila menemukan kartu ini, harap dikembalikan ke RS Dustira.</li>
              </ol>
            </div>
            <div class="flex items-end justify-between">
              <div>
                <p class="font-semibold text-text">Penjamin:</p>
                <div class="origin-left scale-75">
                  <PayerBadge payer={p.payer} />
                </div>
              </div>
              <div class="text-right">
                <p class="font-semibold text-primary">IGD 24 Jam</p>
                <p class="tabular font-bold text-text">(022) 665-0119</p>
                <p class="text-[6px] text-subtle">Data fiktif untuk demo</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
