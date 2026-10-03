import type { ComponentChildren } from 'preact';
import { useStore } from '@nanostores/preact';
import { code128Svg } from '../../../lib/barcode';
import { dateLong, dateTime, genderLabel, ageLabel } from '../../../lib/format';
import { $medicalRecords, $prescriptions, $procedureActions, $visits } from '../../../stores/db';
import { $doctorMap, $medMap, $patientMap, $poliMap, $procMap, $personName } from '../../../stores/selectors';
import { NotFound, PageSkeleton } from '../../ui/Display';
import { useParam, useReady } from '../../ui/hooks';
import { DemoFootnote, Kop, PrintToolbar, Watermark } from '../shared';

const FU_LABEL: Record<string, string> = { PULANG: 'Pulang', KONTROL: 'Kontrol ulang', RUJUK_INTERNAL: 'Rujuk internal', RUJUK_EKSTERNAL: 'Rujuk eksternal', RAWAT_INAP: 'Rawat inap' };

export default function MRResume() {
  const ready = useReady(100);
  const visitId = useParam('visit');
  const visits = useStore($visits);
  const mrs = useStore($medicalRecords);
  const rxs = useStore($prescriptions);
  const acts = useStore($procedureActions);
  const pMap = useStore($patientMap);
  const poliMap = useStore($poliMap);
  const docMap = useStore($doctorMap);
  const medMap = useStore($medMap);
  const procMap = useStore($procMap);
  const personName = useStore($personName);
  if (!ready) return <div class="p-8"><PageSkeleton /></div>;
  const v = visits.find((x) => x.id === visitId);
  const m = mrs.find((x) => x.visitId === visitId);
  if (!v || !m) return <div class="p-8"><NotFound what="Rekam medis" back={{ href: '/app/rekam-medis', label: 'Kembali' }} /></div>;
  const p = pMap.get(v.patientId)!;
  const rx = rxs.find((r) => r.visitId === v.id && r.status !== 'BATAL');
  const pa = acts.filter((a) => a.visitId === v.id);
  const doc = docMap.get(m.doctorId);

  const Section = ({ title, children }: { title: string; children: ComponentChildren }) => (
    <section class="mt-4">
      <h3 class="mb-1 border-b border-border pb-1 text-xs font-bold tracking-wider text-primary uppercase">{title}</h3>
      <div class="text-[13px]">{children}</div>
    </section>
  );

  return (
    <div>
      <PrintToolbar back={`/app/rekam-medis/periksa?visit=${v.id}`} />
      <div class="px-4 pb-10 print:p-0">
        <article class="print-doc p-[14mm]" style={{ width: '210mm', minHeight: '297mm' }}>
          <Watermark />
          <Kop title="Resume Medis" subtitle={v.regNo} />
          {m.status !== 'FINAL' && <p class="mt-3 rounded bg-warning-soft p-2 text-center text-xs font-semibold text-warning-strong">DRAFT: rekam medis belum ditandatangani</p>}
          <div class="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-[13px]">
            {[
              ['Nama', p.name],
              ['No RM', p.mrn],
              ['JK / Umur', `${genderLabel(p.gender)} / ${ageLabel(p.birthDate)}`],
              ['Tanggal lahir', dateLong(p.birthDate)],
              ['Tanggal kunjungan', dateTime(v.registeredAt)],
              ['Poli', poliMap.get(v.poliId)?.name ?? '-'],
              ['DPJP', doc?.name ?? '-'],
              ['Penjamin', `${v.payer.type}${v.sepNo ? ` · SEP ${v.sepNo}` : ''}`],
              ['Alergi', p.allergies.join(', ') || 'Tidak ada'],
            ].map(([k, val]) => (
              <div key={k} class="flex gap-2">
                <span class="w-32 shrink-0 text-muted">{k}</span>
                <span class={`font-medium ${k === 'Alergi' && p.allergies.length ? 'text-danger-strong' : ''}`}>: {val}</span>
              </div>
            ))}
          </div>
          {m.vitals && (
            <Section title="Tanda Vital">
              <p class="tabular">
                TD {m.vitals.sys ?? '-'}/{m.vitals.dia ?? '-'} mmHg · Nadi {m.vitals.pulse ?? '-'} x/mnt · Suhu {m.vitals.temp ?? '-'}°C · RR {m.vitals.rr ?? '-'} x/mnt · SpO2 {m.vitals.spo2 ?? '-'}% · BB {m.vitals.weight ?? '-'} kg · TB {m.vitals.height ?? '-'} cm · IMT {m.vitals.bmi ?? '-'} · Nyeri {m.vitals.pain ?? 0}/10
              </p>
            </Section>
          )}
          <Section title="Anamnesis & Pemeriksaan (SOAP)">
            <table class="w-full">
              <tbody>
                {(
                  [
                    ['S', m.soap.s],
                    ['O', m.soap.o],
                    ['A', m.soap.a],
                    ['P', m.soap.p],
                  ] as const
                ).map(([k, val]) => (
                  <tr key={k}>
                    <td class="w-8 py-1 align-top font-bold">{k}</td>
                    <td class="py-1">{val || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
          <Section title="Diagnosa (ICD-10)">
            {m.diagnoses.length ? (
              <ul>
                {m.diagnoses.map((d) => (
                  <li key={d.code}>
                    <span class="tabular font-semibold">{d.code}</span> {d.name} <span class="text-xs text-muted">({d.type === 'PRIMER' ? 'Primer' : 'Sekunder'})</span>
                  </li>
                ))}
              </ul>
            ) : (
              '-'
            )}
          </Section>
          <Section title="Tindakan (ICD-9-CM)">
            {pa.length ? (
              <ul>
                {pa.map((a) => (
                  <li key={a.id}>
                    <span class="tabular font-semibold">{procMap.get(a.procedureId)?.code}</span> {procMap.get(a.procedureId)?.name} × {a.qty}
                  </li>
                ))}
              </ul>
            ) : (
              'Tidak ada'
            )}
          </Section>
          <Section title="Terapi">
            {rx ? (
              <ol class="list-decimal pl-5">
                {rx.items.map((i, idx) => (
                  <li key={idx}>
                    {medMap.get(i.substituteId || i.medicineId)?.name}, {i.dose} {i.frequency}, {i.route.toLowerCase()}, {i.durationDays} hari ({i.instruction.toLowerCase()}) · jumlah {i.qtyGiven ?? i.qty}
                  </li>
                ))}
              </ol>
            ) : (
              'Tidak ada resep'
            )}
          </Section>
          <Section title="Rencana Tindak Lanjut">
            <p>
              {FU_LABEL[m.followUp?.type ?? 'PULANG']}
              {m.followUp?.date ? ` · ${dateLong(m.followUp.date)}` : ''}
              {m.followUp?.target ? ` · ${m.followUp.target}` : ''}
              {m.followUp?.note ? ` · ${m.followUp.note}` : ''}
            </p>
          </Section>
          {m.addenda.length > 0 && (
            <Section title="Addendum">
              {m.addenda.map((a, i) => (
                <p key={i}>
                  {dateTime(a.at)} ({personName(a.by)}): {a.text}
                </p>
              ))}
            </Section>
          )}
          <div class="mt-10 flex items-end justify-between">
            <div class="h-12 w-56" dangerouslySetInnerHTML={{ __html: code128Svg(v.regNo, 40) }} />
            <div class="text-center text-[13px]">
              <p>Cimahi, {dateLong(m.signedAt ?? v.registeredAt)}</p>
              <p>Dokter Penanggung Jawab,</p>
              <div class="my-2 flex h-16 items-center justify-center">
                {m.signedAt ? (
                  <span class="rounded border-2 border-success px-3 py-1 text-[10px] font-semibold text-success-strong">
                    TTE · {dateTime(m.signedAt)}
                  </span>
                ) : (
                  <span class="text-xs text-subtle">(belum ditandatangani)</span>
                )}
              </div>
              <p class="font-semibold underline">{doc?.name}</p>
              <p class="text-xs text-muted">{doc?.sip}</p>
            </div>
          </div>
          <DemoFootnote />
        </article>
      </div>
    </div>
  );
}
