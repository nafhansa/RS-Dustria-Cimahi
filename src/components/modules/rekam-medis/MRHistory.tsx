import { useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { ChevronDown, Printer, FileSignature } from 'lucide-preact';
import { dateLong, dateTime, timeHM } from '../../../lib/format';
import { $medicalRecords, $patients, $prescriptions, $procedureActions, $visits, $polis } from '../../../stores/db';
import { $doctorMap, $medMap, $poliMap, $procMap, $personName } from '../../../stores/selectors';
import { Badge } from '../../ui/Badge';
import { EmptyState, NotFound, PageHeader, PageSkeleton } from '../../ui/Display';
import { useParam, useReady } from '../../ui/hooks';
import { PatientStrip } from '../shared';

export default function MRHistory() {
  const ready = useReady();
  const id = useParam('id');
  const patients = useStore($patients);
  const visits = useStore($visits);
  const mrs = useStore($medicalRecords);
  const rxs = useStore($prescriptions);
  const acts = useStore($procedureActions);
  const polis = useStore($polis);
  const poliMap = useStore($poliMap);
  const docMap = useStore($doctorMap);
  const medMap = useStore($medMap);
  const procMap = useStore($procMap);
  const personName = useStore($personName);
  const [poli, setPoli] = useState('');
  const [year, setYear] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());

  const p = patients.find((x) => x.id === id);
  const entries = useMemo(() => {
    if (!p) return [];
    return mrs
      .filter((m) => m.patientId === p.id)
      .map((m) => ({ m, v: visits.find((v) => v.id === m.visitId)! }))
      .filter((e) => e.v && (!poli || e.v.poliId === poli) && (!year || e.v.registeredAt.startsWith(year)))
      .sort((a, b) => b.v.registeredAt.localeCompare(a.v.registeredAt));
  }, [p?.id, mrs, visits, poli, year]);
  const years = [...new Set(mrs.filter((m) => m.patientId === id).map((m) => visits.find((v) => v.id === m.visitId)?.registeredAt.slice(0, 4)).filter(Boolean))] as string[];

  if (!ready) return <PageSkeleton />;
  if (!p) return <NotFound what="Pasien" back={{ href: '/app/rekam-medis', label: 'Kembali ke worklist' }} />;

  const toggle = (k: string) => {
    const n = new Set(open);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    setOpen(n);
  };

  return (
    <div>
      <PageHeader title="Riwayat Rekam Medis" subtitle="Timeline seluruh kunjungan dan catatan klinis pasien." back={{ href: `/app/pasien/detail?id=${p.id}`, label: 'Detail pasien' }} />
      <PatientStrip p={p} />
      <div class="my-5 flex flex-wrap items-center gap-3">
        <select class="input w-auto" value={poli} onChange={(e) => setPoli((e.target as HTMLSelectElement).value)} aria-label="Filter poli">
          <option value="">Semua poli</option>
          {polis.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <select class="input w-auto" value={year} onChange={(e) => setYear((e.target as HTMLSelectElement).value)} aria-label="Filter tahun">
          <option value="">Semua tahun</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <span class="text-sm text-muted">{entries.length} catatan</span>
        <button type="button" class="btn btn-ghost btn-sm ml-auto" onClick={() => setOpen(open.size ? new Set() : new Set(entries.map((e) => e.m.id)))}>
          {open.size ? 'Tutup semua' : 'Buka semua'}
        </button>
      </div>
      {entries.length === 0 ? (
        <div class="card">
          <EmptyState title="Belum ada rekam medis" />
        </div>
      ) : (
        <ol class="relative space-y-4 border-l-2 border-border pl-6">
          {entries.map(({ m, v }) => {
            const isOpen = open.has(m.id);
            const rx = rxs.find((r) => r.id === m.prescriptionId) ?? rxs.find((r) => r.visitId === v.id);
            const pa = acts.filter((a) => a.visitId === v.id);
            return (
              <li key={m.id} class="relative">
                <span class={`absolute top-5 -left-[33px] h-4 w-4 rounded-full border-[3px] border-white ${m.status === 'FINAL' ? 'bg-primary' : 'bg-warning'} ring-2 ring-primary-soft`} />
                <div class="card">
                  <button type="button" class="flex w-full flex-wrap items-center gap-3 p-4 text-left" onClick={() => toggle(m.id)} aria-expanded={isOpen}>
                    <div class="min-w-0 flex-1">
                      <p class="text-xs text-muted">
                        {dateLong(v.registeredAt)} · {timeHM(v.registeredAt)} · {poliMap.get(v.poliId)?.name} · {docMap.get(m.doctorId)?.name}
                      </p>
                      <p class="mt-0.5 font-semibold">{m.diagnoses.length ? m.diagnoses.map((d) => `${d.code} ${d.name}`).join('; ') : <span class="text-muted">Belum ada diagnosa</span>}</p>
                      {!isOpen && <p class="mt-0.5 line-clamp-1 text-sm text-muted">{m.soap.s}</p>}
                    </div>
                    <Badge tone={m.status === 'FINAL' ? 'success' : 'warning'}>{m.status === 'FINAL' ? 'Final' : 'Draft'}</Badge>
                    <ChevronDown size={18} class={`text-subtle transition ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div class="space-y-4 border-t border-border p-4 text-sm">
                      {m.vitals && (
                        <p class="tabular text-muted">
                          TTV: TD {m.vitals.sys}/{m.vitals.dia} · N {m.vitals.pulse} · S {m.vitals.temp}°C · RR {m.vitals.rr} · SpO2 {m.vitals.spo2}% · BB {m.vitals.weight} kg · TB {m.vitals.height} cm · IMT {m.vitals.bmi}
                        </p>
                      )}
                      <div class="grid gap-3 md:grid-cols-2">
                        {(['s', 'o', 'a', 'p'] as const).map((k) => (
                          <div key={k}>
                            <p class="text-xs font-semibold text-subtle uppercase">{k}</p>
                            <p>{m.soap[k] || '-'}</p>
                          </div>
                        ))}
                      </div>
                      {pa.length > 0 && (
                        <div>
                          <p class="text-xs font-semibold text-subtle uppercase">Tindakan</p>
                          <p>{pa.map((a) => `${procMap.get(a.procedureId)?.name} (${procMap.get(a.procedureId)?.code})`).join(', ')}</p>
                        </div>
                      )}
                      {rx && (
                        <div>
                          <p class="text-xs font-semibold text-subtle uppercase">Resep {rx.rxNo}</p>
                          <ul class="list-disc pl-5">
                            {rx.items.map((i, idx) => (
                              <li key={idx}>
                                {medMap.get(i.substituteId || i.medicineId)?.name} · {i.dose} {i.frequency} · {i.durationDays} hari · {i.instruction}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {m.addenda.map((a, i) => (
                        <p key={i} class="rounded bg-info-soft p-2 text-info-strong">
                          Addendum ({dateTime(a.at)}, {personName(a.by)}): {a.text}
                        </p>
                      ))}
                      <div class="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                        {m.signedAt ? (
                          <p class="flex items-center gap-1.5 text-xs text-success-strong">
                            <FileSignature size={14} /> Ditandatangani {personName(m.signedBy ?? m.doctorId)} · {dateTime(m.signedAt)}
                          </p>
                        ) : (
                          <span />
                        )}
                        <a href={`/app/rekam-medis/resume?visit=${v.id}`} class="btn btn-secondary btn-sm">
                          <Printer size={14} /> Cetak
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
