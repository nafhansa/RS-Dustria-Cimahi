import { useStore } from '@nanostores/preact';
import { dateShort } from '../../../lib/format';
import { $prescriptions } from '../../../stores/db';
import { $medMap, $patientMap } from '../../../stores/selectors';
import { NotFound, PageSkeleton } from '../../ui/Display';
import { useParam, useReady } from '../../ui/hooks';
import { PrintToolbar } from '../shared';
import { ageLabel } from '../../../lib/format';

const isExternal = (route: string, form: string) => ['SALEP', 'TETES'].includes(form) || /topikal|tetes/i.test(route);

export default function Etiket() {
  const ready = useReady(100);
  const id = useParam('id');
  const rxs = useStore($prescriptions);
  const pMap = useStore($patientMap);
  const medMap = useStore($medMap);
  if (!ready) return <div class="p-8"><PageSkeleton /></div>;
  const rx = rxs.find((r) => r.id === id);
  if (!rx) return <div class="p-8"><NotFound what="Resep" back={{ href: '/app/farmasi', label: 'Kembali' }} /></div>;
  const p = pMap.get(rx.patientId)!;

  return (
    <div>
      <PrintToolbar back={`/app/farmasi/resep?id=${rx.id}`}>
        <span class="hidden text-sm text-muted sm:inline">Etiket putih: obat dalam (oral) · biru: obat luar</span>
      </PrintToolbar>
      <div class="mx-auto flex max-w-4xl flex-wrap justify-center gap-4 px-4 pb-10 print:gap-2 print:p-0">
        {rx.items.map((it, i) => {
          const m = medMap.get(it.substituteId || it.medicineId)!;
          const ext = isExternal(it.route, m.form);
          return (
            <div key={i} class={`print-doc break-inside-avoid rounded-lg border-2 p-3 ${ext ? 'border-info bg-[#e8f2ff]' : 'border-text bg-white'}`} style={{ width: '80mm', minHeight: '50mm' }}>
              <div class="flex items-center gap-2 border-b border-current/20 pb-1.5">
                <img src="/logo-symbol.png" alt="" class="h-6 w-6" />
                <div class="leading-tight">
                  <p class="font-heading text-[10px] font-bold">INSTALASI FARMASI RS DUSTIRA</p>
                  <p class="text-[8px] text-muted">Apoteker: apt. Fajar Nugraha, S.Farm · SIPA 503/0789/2025</p>
                </div>
                <span class={`ml-auto rounded px-1.5 py-0.5 text-[8px] font-bold text-white ${ext ? 'bg-info' : 'bg-text'}`}>{ext ? 'OBAT LUAR' : 'OBAT DALAM'}</span>
              </div>
              <div class="mt-1.5 flex justify-between text-[9px]">
                <span class="tabular">{rx.rxNo}</span>
                <span class="tabular">{dateShort(rx.updatedAt)}</span>
              </div>
              <p class="mt-1 truncate text-[11px] font-semibold">
                {p.name} <span class="font-normal text-muted">({p.mrn} · {ageLabel(p.birthDate)})</span>
              </p>
              <p class="mt-2 text-center font-heading text-2xl font-extrabold">{it.frequency}</p>
              <p class="text-center text-[11px] font-semibold">{it.dose} · {it.instruction}</p>
              <p class="mt-1.5 truncate border-t border-dashed border-current/30 pt-1 text-[10px]">
                {m.name} · {it.qtyGiven ?? it.qty} {m.unit}
              </p>
              <p class="text-[8px] text-muted">{ext ? 'Hanya untuk pemakaian luar. Jangan ditelan.' : 'Simpan di tempat sejuk & kering, jauhkan dari anak-anak.'} · DEMO</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
