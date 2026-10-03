import { useEffect, useState } from 'preact/hooks';
import { readAllAppointments } from '../../lib/booking';
import { dateLong, maskId } from '../../lib/format';
import type { Appointment, Doctor, Poli } from '../../lib/types';

const STATUS = { BOOKED: ['Terjadwal', 'bg-info-soft text-info-strong'], CHECKED_IN: ['Sudah check-in', 'bg-success-soft text-success-strong'], CANCELLED: ['Dibatalkan', 'bg-danger-soft text-danger-strong'] } as const;

export default function BookingStatus({ polis, doctors }: { polis: Poli[]; doctors: Doctor[] }) {
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');
  const [appt, setAppt] = useState<Appointment | null | undefined>(undefined);

  const lookup = (c: string) => {
    const k = c.trim().toUpperCase();
    setCode(k);
    setAppt(k ? (readAllAppointments().find((a) => a.code.toUpperCase() === k) ?? null) : undefined);
  };

  useEffect(() => {
    const k = new URLSearchParams(location.search).get('kode') ?? '';
    setInput(k.toUpperCase());
    lookup(k);
  }, []);

  const poli = appt ? polis.find((p) => p.id === appt.poliId) : undefined;
  const doc = appt ? doctors.find((d) => d.id === appt.doctorId) : undefined;
  const isNew = appt && Date.now() - new Date(appt.createdAt).getTime() < 10 * 60 * 1000;

  return (
    <div class="mx-auto max-w-2xl">
      {appt ? (
        <div class="rounded-[20px] border border-border bg-white p-6 shadow-lift sm:p-10 print:shadow-none">
          <div class="text-center">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success-strong">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h1 class="mt-4 font-heading text-2xl font-bold">{isNew ? 'Booking berhasil dibuat' : 'Detail booking'}</h1>
            <p class="mt-1 text-muted">Tunjukkan kode berikut di loket pendaftaran saat tiba.</p>
            <div class="mx-auto mt-6 inline-block rounded-[var(--radius-card)] border-2 border-dashed border-primary/40 bg-primary-soft px-8 py-4">
              <p class="text-xs font-semibold tracking-widest text-primary-strong uppercase">Kode Booking</p>
              <p class="tabular font-heading text-3xl font-extrabold tracking-wide text-primary sm:text-4xl">{appt.code}</p>
            </div>
            <p class="mt-3">
              <span class={`badge ${STATUS[appt.status][1]}`}>{STATUS[appt.status][0]}</span>
            </p>
          </div>
          <dl class="mt-8 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
            {[
              ['Nama', appt.name],
              ['NIK', maskId(appt.nik)],
              ['Poliklinik', poli?.name],
              ['Dokter', doc?.name],
              ['Tanggal', dateLong(appt.date)],
              ['Jam', `${appt.time.replace(':', '.')} WIB`],
              ['Penjamin', appt.payerType === 'BPJS' ? 'BPJS Kesehatan' : appt.payerType === 'ASURANSI' ? 'Asuransi' : 'Umum'],
              ['No HP', appt.phone],
            ].map(([k, v]) => (
              <div key={k}>
                <dt class="text-xs font-medium tracking-wide text-subtle uppercase">{k}</dt>
                <dd class="mt-0.5 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div class="mt-6 rounded-[var(--radius-card)] bg-surface p-4 text-sm text-muted">
            <p class="font-semibold text-text">Persiapan kedatangan</p>
            <ul class="mt-1 list-disc space-y-0.5 pl-5">
              <li>Datang 15 menit sebelum jadwal dan bawa KTP.</li>
              {appt.payerType === 'BPJS' && <li>Bawa kartu BPJS dan surat rujukan dari faskes tingkat pertama.</li>}
              <li>Jadwal dapat berubah, petugas akan menghubungi Anda bila ada perubahan.</li>
            </ul>
          </div>
          <div class="no-print mt-8 flex flex-wrap justify-center gap-2">
            <button type="button" class="btn btn-secondary" onClick={() => window.print()}>
              Cetak / Simpan PDF
            </button>
            <a href="/janji-temu" class="btn btn-secondary">
              Buat janji lain
            </a>
            <a href="/" class="btn btn-primary">
              Kembali ke beranda
            </a>
          </div>
          <p class="mt-6 text-center text-xs text-subtle">Demo: booking tersimpan di browser ini dan muncul di menu Janji Temu Online aplikasi staf.</p>
        </div>
      ) : (
        <div class="rounded-[20px] border border-border bg-white p-6 sm:p-10">
          <h1 class="font-heading text-2xl font-bold">Cek kode booking</h1>
          {appt === null && code && (
            <p class="mt-3 rounded-[var(--radius-field)] bg-warning-soft p-3 text-sm text-warning-strong" role="alert">
              Kode <strong>{code}</strong> tidak ditemukan di perangkat ini. Periksa kembali kode Anda atau hubungi pendaftaran (022) 665-0000.
            </p>
          )}
          <form
            class="mt-5 flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              history.replaceState(null, '', `?kode=${encodeURIComponent(input.trim().toUpperCase())}`);
              lookup(input);
            }}
          >
            <label class="flex-1">
              <span class="sr-only">Kode booking</span>
              <input class="input tabular uppercase" placeholder="BK-261004-001" value={input} onInput={(e) => setInput((e.target as HTMLInputElement).value)} />
            </label>
            <button type="submit" class="btn btn-primary">
              Cek Booking
            </button>
          </form>
          <p class="mt-6 text-sm text-muted">
            Belum punya booking?{' '}
            <a href="/janji-temu" class="link">
              Buat janji temu
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
