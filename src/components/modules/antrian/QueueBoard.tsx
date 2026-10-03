import type { ComponentChildren } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { Megaphone, MonitorPlay, Repeat, SkipForward, Stethoscope, Undo2, Volume2, VolumeX } from 'lucide-preact';
import { VISIT_STATUS } from '../../../lib/constants';
import { timeHM } from '../../../lib/format';
import { announce } from '../../../lib/speech';
import type { Visit } from '../../../lib/types';
import { $polis } from '../../../stores/db';
import { $patientMap, $poliMap, $todayVisits, $doctorMap } from '../../../stores/selectors';
import { callVisit, requeueVisit, skipVisit, startExam } from '../../../stores/actions';
import { StatusPill } from '../../ui/Badge';
import { EmptyState, PageHeader, PageSkeleton } from '../../ui/Display';
import { Tabs } from '../../ui/Tabs';
import { go, run, useReady } from '../../ui/hooks';
import { AllergyBadge, PayerBadge } from '../shared';

export const queueOrder = (a: Visit, b: Visit) => Number(!!a.skipped) - Number(!!b.skipped) || a.queueNo.localeCompare(b.queueNo);

export default function QueueBoard() {
  const ready = useReady();
  const today = useStore($todayVisits);
  const polis = useStore($polis);
  const pMap = useStore($patientMap);
  const poliMap = useStore($poliMap);
  const docMap = useStore($doctorMap);
  const [poliId, setPoliId] = useState('ALL');
  const [sound, setSound] = useState(() => {
    try {
      return localStorage.getItem('rsd:queue-sound') !== '0';
    } catch {
      return true;
    }
  });

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of today) if (v.status === 'MENUNGGU' || v.status === 'DIPANGGIL') m.set(v.poliId, (m.get(v.poliId) ?? 0) + 1);
    return m;
  }, [today]);

  const scoped = today.filter((v) => poliId === 'ALL' || v.poliId === poliId);
  const called = scoped.filter((v) => v.status === 'DIPANGGIL').sort((a, b) => (b.calledAt ?? '').localeCompare(a.calledAt ?? ''));
  const waiting = scoped.filter((v) => v.status === 'MENUNGGU' && !v.skipped).sort(queueOrder);
  const skipped = scoped.filter((v) => v.status === 'MENUNGGU' && v.skipped).sort(queueOrder);
  const inExam = scoped.filter((v) => v.status === 'DIPERIKSA');
  const finished = scoped.filter((v) => ['FARMASI', 'KASIR', 'SELESAI'].includes(v.status));

  const doCall = (v: Visit, recall = false) => {
    const r = run(() => callVisit(v.id), `${recall ? 'Panggil ulang' : 'Memanggil'} ${v.queueNo}`, pMap.get(v.patientId)?.name);
    if (r && sound) announce(v.queueNo, poliMap.get(v.poliId)?.name ?? '');
  };
  const doStart = (v: Visit) => {
    if (run(() => startExam(v.id))) go(`/app/rekam-medis/periksa?visit=${v.id}`);
  };
  const toggleSound = () => {
    const nextVal = !sound;
    setSound(nextVal);
    try {
      localStorage.setItem('rsd:queue-sound', nextVal ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  if (!ready) return <PageSkeleton />;
  const visiblePolis = polis.filter((p) => p.active !== false && (today.some((v) => v.poliId === p.id) || p.id === poliId));

  const Row = ({ v, actions }: { v: Visit; actions: ComponentChildren }) => {
    const p = pMap.get(v.patientId);
    return (
      <li class="flex flex-wrap items-center gap-3 px-4 py-3">
        <span class={`tabular w-16 font-heading text-lg font-bold ${v.status === 'DIPANGGIL' ? 'text-primary' : 'text-text'}`}>{v.queueNo}</span>
        <div class="min-w-[180px] flex-1">
          <p class="flex flex-wrap items-center gap-1.5 font-medium">
            {p?.name} {p && <AllergyBadge allergies={p.allergies} />}
          </p>
          <p class="text-xs text-muted">
            {p?.mrn} · {poliId === 'ALL' ? `${poliMap.get(v.poliId)?.name} · ` : ''}
            {docMap.get(v.doctorId)?.name} · daftar {timeHM(v.registeredAt)}
          </p>
        </div>
        <PayerBadge payer={v.payer} />
        <div class="flex flex-wrap gap-1.5">{actions}</div>
      </li>
    );
  };

  return (
    <div>
      <PageHeader
        title="Antrian Poliklinik"
        subtitle="Panggil pasien sesuai urutan. Layar TV antrian ikut diperbarui secara real-time (bisa dibuka di tab/monitor lain)."
        actions={
          <>
            <button type="button" class="btn btn-secondary" onClick={toggleSound} aria-pressed={sound}>
              {sound ? <Volume2 size={16} /> : <VolumeX size={16} />} Suara {sound ? 'aktif' : 'mati'}
            </button>
            <a href="/app/antrian/display" target="_blank" rel="noopener" class="btn btn-primary">
              <MonitorPlay size={16} /> Buka Layar TV
            </a>
          </>
        }
      />
      <div class="card mb-6">
        <Tabs
          class="px-3"
          value={poliId}
          onChange={setPoliId}
          tabs={[{ key: 'ALL', label: 'Semua Poli', count: [...counts.values()].reduce((a, b) => a + b, 0) }, ...visiblePolis.map((p) => ({ key: p.id, label: `${p.queuePrefix} · ${p.name}`, count: counts.get(p.id) ?? 0 }))]}
        />
      </div>

      <div class="grid gap-6 xl:grid-cols-3">
        <div class="space-y-6 xl:col-span-2">
          <section class="card">
            <h2 class="flex items-center gap-2 border-b border-border px-4 py-3 font-semibold">
              <Megaphone size={18} class="text-primary" /> Sedang Dipanggil
            </h2>
            {called.length === 0 ? (
              <EmptyState title="Belum ada yang dipanggil" description="Klik Panggil pada daftar menunggu." />
            ) : (
              <ul class="divide-y divide-border">
                {called.map((v) => (
                  <Row
                    key={v.id}
                    v={v}
                    actions={
                      <>
                        <button type="button" class="btn btn-secondary btn-sm" onClick={() => doCall(v, true)}>
                          <Repeat size={14} /> Panggil Ulang
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm" onClick={() => run(() => skipVisit(v.id), `${v.queueNo} dilewati`)}>
                          <SkipForward size={14} /> Lewati
                        </button>
                        <button type="button" class="btn btn-primary btn-sm" onClick={() => doStart(v)}>
                          <Stethoscope size={14} /> Mulai Periksa
                        </button>
                      </>
                    }
                  />
                ))}
              </ul>
            )}
          </section>

          <section class="card">
            <h2 class="flex items-center justify-between border-b border-border px-4 py-3 font-semibold">
              Menunggu <span class="tabular text-sm font-normal text-muted">{waiting.length} pasien</span>
            </h2>
            {waiting.length === 0 ? (
              <EmptyState title="Tidak ada antrian menunggu" />
            ) : (
              <ul class="divide-y divide-border">
                {waiting.map((v, i) => (
                  <Row
                    key={v.id}
                    v={v}
                    actions={
                      <>
                        <button type="button" class={`btn btn-sm ${i === 0 ? 'btn-primary' : 'btn-secondary'}`} onClick={() => doCall(v)}>
                          <Megaphone size={14} /> Panggil
                        </button>
                        <button type="button" class="btn btn-ghost btn-sm" onClick={() => doStart(v)} title="Langsung mulai periksa">
                          <Stethoscope size={14} /> Periksa
                        </button>
                      </>
                    }
                  />
                ))}
              </ul>
            )}
          </section>

          {skipped.length > 0 && (
            <section class="card">
              <h2 class="border-b border-border px-4 py-3 font-semibold">Dilewati</h2>
              <ul class="divide-y divide-border">
                {skipped.map((v) => (
                  <Row
                    key={v.id}
                    v={v}
                    actions={
                      <>
                        <button type="button" class="btn btn-secondary btn-sm" onClick={() => run(() => requeueVisit(v.id), `${v.queueNo} dikembalikan ke antrian`)}>
                          <Undo2 size={14} /> Kembalikan ke Antrian
                        </button>
                        <button type="button" class="btn btn-ghost btn-sm" onClick={() => doCall(v)}>
                          <Megaphone size={14} /> Panggil
                        </button>
                      </>
                    }
                  />
                ))}
              </ul>
            </section>
          )}
        </div>

        <div class="space-y-6">
          <section class="card">
            <h2 class="border-b border-border px-4 py-3 font-semibold">Sedang Diperiksa</h2>
            <ul class="divide-y divide-border">
              {inExam.length === 0 && <li class="px-4 py-6 text-center text-sm text-muted">Tidak ada</li>}
              {inExam.map((v) => (
                <li key={v.id} class="flex items-center justify-between gap-2 px-4 py-2.5">
                  <span>
                    <span class="tabular mr-2 font-semibold">{v.queueNo}</span>
                    <span class="text-sm">{pMap.get(v.patientId)?.name}</span>
                  </span>
                  <a href={`/app/rekam-medis/periksa?visit=${v.id}`} class="link text-sm">
                    Buka
                  </a>
                </li>
              ))}
            </ul>
          </section>
          <section class="card">
            <h2 class="border-b border-border px-4 py-3 font-semibold">Selesai Diperiksa</h2>
            <ul class="max-h-80 divide-y divide-border overflow-y-auto">
              {finished.length === 0 && <li class="px-4 py-6 text-center text-sm text-muted">Belum ada</li>}
              {finished.map((v) => (
                <li key={v.id} class="flex items-center justify-between gap-2 px-4 py-2.5">
                  <span>
                    <span class="tabular mr-2 font-semibold">{v.queueNo}</span>
                    <span class="text-sm">{pMap.get(v.patientId)?.name}</span>
                  </span>
                  <StatusPill status={VISIT_STATUS[v.status]} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
