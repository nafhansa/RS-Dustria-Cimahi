import { useEffect, useRef, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { Maximize, Volume2 } from 'lucide-preact';
import { announce } from '../../../lib/speech';
import { $lastCall, $polis, $ready, initDb } from '../../../stores/db';
import { $patientMap, $poliMap, $todayVisits } from '../../../stores/selectors';
import { useNow } from '../../ui/hooks';
import { queueOrder } from './QueueBoard';

/** Public TV screen. Updates live from other tabs via the localStorage `storage` event. */
export default function QueueDisplay() {
  const ready = useStore($ready);
  const today = useStore($todayVisits);
  const polis = useStore($polis);
  const poliMap = useStore($poliMap);
  const pMap = useStore($patientMap);
  const lastCall = useStore($lastCall);
  const now = useNow(1000);
  const [soundOn, setSoundOn] = useState(false);
  const [flash, setFlash] = useState(false);
  const prev = useRef<string | null>(null);

  useEffect(() => {
    initDb();
  }, []);

  useEffect(() => {
    const key = lastCall ? `${lastCall.visitId}@${lastCall.at}` : null;
    if (prev.current !== null && key && key !== prev.current) {
      setFlash(true);
      setTimeout(() => setFlash(false), 4000);
      const v = $todayVisits.get().find((x) => x.id === lastCall!.visitId);
      if (v && soundOn) announce(v.queueNo, poliMap.get(v.poliId)?.name ?? '');
    }
    prev.current = key ?? '';
  }, [lastCall]);

  const current =
    (lastCall ? today.find((v) => v.id === lastCall.visitId) : undefined) ??
    today.filter((v) => v.status === 'DIPANGGIL' && v.calledAt).sort((a, b) => (b.calledAt ?? '').localeCompare(a.calledAt ?? ''))[0];
  const activePolis = polis.filter((p) => p.active !== false && today.some((v) => v.poliId === p.id && v.status !== 'BATAL'));

  const enable = async () => {
    setSoundOn(true);
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      /* ignore */
    }
  };

  return (
    <div class="flex min-h-screen flex-col bg-[#0f1420] text-white">
      <header class="flex items-center justify-between gap-4 bg-white px-8 py-4 text-text">
        <img src="/logo.webp" alt="Rumah Sakit Dustira" width="200" height="50" class="h-11 w-auto" />
        <div class="text-center">
          <p class="font-heading text-xl font-bold">ANTRIAN POLIKLINIK</p>
          <p class="text-sm text-muted">Silakan menunggu hingga nomor Anda dipanggil</p>
        </div>
        <div class="text-right">
          <p class="tabular font-heading text-3xl font-bold">
            {String(now.getHours()).padStart(2, '0')}.{String(now.getMinutes()).padStart(2, '0')}
            <span class="text-lg text-subtle">.{String(now.getSeconds()).padStart(2, '0')}</span>
          </p>
          <p class="text-sm text-muted">{now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </header>

      <div class="grid flex-1 gap-6 p-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section
          class={`flex flex-col items-center justify-center rounded-3xl p-8 text-center transition-all duration-500 ${flash ? 'scale-[1.02] bg-primary shadow-[0_0_80px_rgba(208,27,40,0.6)]' : 'bg-gradient-to-br from-primary to-[#8f101a]'}`}
          aria-live="assertive"
        >
          <p class="text-2xl font-semibold tracking-[0.3em] text-white/80 uppercase">Nomor Antrian</p>
          <p class="tabular my-4 font-heading text-[9rem] leading-none font-extrabold drop-shadow-lg">{current?.queueNo ?? '---'}</p>
          <p class="text-3xl font-bold">{current ? (poliMap.get(current.poliId)?.name.startsWith('Instalasi') ? poliMap.get(current.poliId)?.name : `Poli ${poliMap.get(current.poliId)?.name}`) : 'Menunggu panggilan'}</p>
          {current && <p class="mt-3 text-xl text-white/80">{pMap.get(current.patientId)?.name.split(' ').slice(0, 2).join(' ')}</p>}
        </section>

        <section class="grid auto-rows-min gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {!ready && <p class="text-white/60">Memuat data antrian...</p>}
          {activePolis.map((p) => {
            const vs = today.filter((v) => v.poliId === p.id);
            const now = vs.filter((v) => v.status === 'DIPANGGIL' || v.status === 'DIPERIKSA').sort((a, b) => (b.calledAt ?? '').localeCompare(a.calledAt ?? ''))[0];
            const next = vs.filter((v) => v.status === 'MENUNGGU').sort(queueOrder).slice(0, 3);
            const isCurrent = current?.poliId === p.id && flash;
            return (
              <div key={p.id} class={`rounded-2xl border p-5 transition ${isCurrent ? 'border-primary bg-primary/20' : 'border-white/10 bg-white/5'}`}>
                <p class="truncate text-lg font-semibold">{p.name}</p>
                <div class="mt-2 flex items-end justify-between">
                  <div>
                    <p class="text-xs tracking-wider text-white/50 uppercase">Dilayani</p>
                    <p class="tabular font-heading text-5xl font-extrabold text-white">{now?.queueNo ?? '-'}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-xs tracking-wider text-white/50 uppercase">Berikutnya</p>
                    <p class="tabular text-lg font-semibold text-white/80">{next.map((v) => v.queueNo).join('  ') || '-'}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </div>

      <footer class="overflow-hidden bg-primary py-3 text-lg font-medium whitespace-nowrap">
        <div class="inline-block animate-[marquee_35s_linear_infinite] pl-[100%]">
          Selamat datang di Rumah Sakit Dustira Cimahi · Siapkan kartu berobat dan kartu BPJS/asuransi Anda · IGD & Farmasi buka 24 jam: (022) 665-0119 · Jagalah kebersihan dan ketertiban ruang tunggu · Data pada layar ini fiktif untuk demo ·
        </div>
      </footer>

      {!soundOn && (
        <button type="button" onClick={enable} class="fixed right-6 bottom-20 flex items-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-text shadow-lift hover:bg-surface">
          <Volume2 size={18} /> Aktifkan suara & layar penuh <Maximize size={16} />
        </button>
      )}
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-100%); } }`}</style>
    </div>
  );
}
