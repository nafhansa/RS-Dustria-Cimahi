import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Doctor, Poli, Schedule } from '../../lib/types';
import DoctorPortrait from './DoctorPortrait';

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function DoctorDirectory({ doctors, polis, schedules }: { doctors: Doctor[]; polis: Poli[]; schedules: Schedule[] }) {
  const [poli, setPoli] = useState('');
  const [day, setDay] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setPoli(p.get('poli') ?? '');
    setDay(p.get('hari') ?? '');
    setQ(p.get('q') ?? '');
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (poli) p.set('poli', poli);
    if (day) p.set('hari', day);
    if (q) p.set('q', q);
    const qs = p.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  }, [poli, day, q]);

  const poliBySlug = useMemo(() => new Map(polis.map((p) => [p.slug, p])), [polis]);
  const poliById = useMemo(() => new Map(polis.map((p) => [p.id, p])), [polis]);
  const list = doctors.filter((d) => {
    if (poli && poliBySlug.get(poli)?.id !== d.poliId) return false;
    if (day !== '' && !schedules.some((s) => s.doctorId === d.id && String(s.day) === day)) return false;
    if (q && !d.name.toLowerCase().includes(q.toLowerCase()) && !d.specialty.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div class="sticky top-16 z-20 -mx-4 border-b border-border bg-white/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-[var(--radius-card)] sm:border lg:top-[76px]">
        <div class="grid gap-3 sm:grid-cols-[1fr_1fr_1.2fr_auto] sm:items-end">
          <label class="text-sm">
            <span class="field-label">Poliklinik</span>
            <select class="input" value={poli} onChange={(e) => setPoli((e.target as HTMLSelectElement).value)}>
              <option value="">Semua poli</option>
              {polis.map((p) => (
                <option key={p.id} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label class="text-sm">
            <span class="field-label">Hari praktik</span>
            <select class="input" value={day} onChange={(e) => setDay((e.target as HTMLSelectElement).value)}>
              <option value="">Semua hari</option>
              {ORDER.map((d) => (
                <option key={d} value={String(d)}>
                  {DAY_NAMES[d]}
                </option>
              ))}
            </select>
          </label>
          <label class="text-sm">
            <span class="field-label">Nama dokter</span>
            <input class="input" type="search" placeholder="Cari nama atau spesialis..." value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
          </label>
          <button
            type="button"
            class="btn btn-ghost"
            onClick={() => {
              setPoli('');
              setDay('');
              setQ('');
            }}
          >
            Reset
          </button>
        </div>
      </div>
      <p class="mt-6 text-sm text-muted" aria-live="polite">
        Menampilkan <strong class="text-text">{list.length}</strong> dokter
      </p>
      <ul class="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {list.map((d) => {
          const sch = schedules.filter((s) => s.doctorId === d.id);
          return (
            <li key={d.id}>
              <article class="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-white">
                <div class="flex items-center gap-4 p-5">
                  <DoctorPortrait name={d.name} id={d.id} class="h-20 w-20 shrink-0 rounded-2xl" />
                  <div class="min-w-0">
                    <h2 class="font-heading font-semibold">{d.name}</h2>
                    <p class="text-sm text-muted">{d.specialty}</p>
                    <p class="mt-1 text-xs font-medium text-primary">{poliById.get(d.poliId)?.name}</p>
                  </div>
                </div>
                <table class="mx-5 mb-4 text-sm">
                  <caption class="sr-only">Jadwal praktik {d.name}</caption>
                  <tbody>
                    {ORDER.map((dayIdx) => {
                      const s = sch.find((x) => x.day === dayIdx);
                      const hl = day !== '' && String(dayIdx) === day;
                      return (
                        <tr key={dayIdx} class={hl ? 'bg-primary-soft font-semibold text-primary-strong' : ''}>
                          <th scope="row" class="w-24 py-1 pl-2 text-left font-medium">
                            {DAY_NAMES[dayIdx]}
                          </th>
                          <td class={`tabular py-1 pr-2 ${s ? '' : 'text-subtle'}`}>{s ? `${s.start.replace(':', '.')} - ${s.end.replace(':', '.')}` : 'Tidak praktik'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div class="mt-auto border-t border-border p-4">
                  <a href={`/janji-temu?dokter=${d.id}`} class="btn btn-primary w-full">
                    Buat Janji
                  </a>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
      {list.length === 0 && (
        <div class="mt-6 rounded-[var(--radius-card)] border border-dashed border-border p-10 text-center">
          <p class="font-medium">Tidak ada dokter yang sesuai filter.</p>
          <p class="mt-1 text-sm text-muted">Coba pilih hari lain atau reset filter.</p>
        </div>
      )}
    </div>
  );
}
