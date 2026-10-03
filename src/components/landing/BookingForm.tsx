import { useEffect, useMemo, useState } from 'preact/hooks';
import { addDays, nowISO, toDateStr } from '../../lib/date';
import { dateLong } from '../../lib/format';
import { nextBookingCode, readAllAppointments, savePendingBooking, timeSlots } from '../../lib/booking';
import type { Appointment, Doctor, PayerType, Poli, Schedule } from '../../lib/types';
import { appointmentSchema, validate } from '../../lib/validators';
import DoctorPortrait from './DoctorPortrait';

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const STEPS = ['Poli & Dokter', 'Tanggal & Jam', 'Data Diri'];

export default function BookingForm({ polis, doctors, schedules }: { polis: Poli[]; doctors: Doctor[]; schedules: Schedule[] }) {
  const [step, setStep] = useState(0);
  const [poliId, setPoliId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [f, setF] = useState({ name: '', nik: '', birthDate: '', gender: '' as '' | 'L' | 'P', phone: '', payerType: 'UMUM' as PayerType, complaint: '', agree: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [taken, setTaken] = useState<Appointment[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const d = doctors.find((x) => x.id === p.get('dokter'));
    if (d) {
      setPoliId(d.poliId);
      setDoctorId(d.id);
    } else if (p.get('poli')) setPoliId(p.get('poli')!);
    setTaken(readAllAppointments().filter((a) => a.status !== 'CANCELLED'));
  }, []);

  const poliDoctors = doctors.filter((d) => d.poliId === poliId && d.active !== false);
  const dates = useMemo(() => {
    if (!doctorId) return [];
    const out: { date: string; sch: Schedule }[] = [];
    for (let i = 0; i < 21 && out.length < 10; i++) {
      const d = addDays(new Date(), i);
      const sch = schedules.find((s) => s.doctorId === doctorId && s.day === d.getDay());
      if (sch) out.push({ date: toDateStr(d), sch });
    }
    return out;
  }, [doctorId]);
  const selected = dates.find((d) => d.date === date);
  const now = new Date();
  const slots = selected
    ? timeSlots(selected.sch.start, selected.sch.end).map((t) => {
        const isPast = selected.date === toDateStr(now) && Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) <= now.getHours() * 60 + now.getMinutes() + 30;
        const booked = taken.some((a) => a.doctorId === doctorId && a.date === selected.date && a.time === t);
        return { t, disabled: isPast || booked, booked };
      })
    : [];

  const next = () => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!poliId) e.poli = 'Pilih poliklinik';
      if (!doctorId) e.doctor = 'Pilih dokter';
    }
    if (step === 1) {
      if (!date) e.date = 'Pilih tanggal';
      if (!time) e.time = 'Pilih jam kedatangan';
    }
    setErrors(e);
    if (!Object.keys(e).length) {
      setStep(step + 1);
      document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const submit = (ev: Event) => {
    ev.preventDefault();
    const r = validate(appointmentSchema, f);
    const e: Record<string, string> = r.ok ? {} : { ...r.errors };
    if (!f.gender) e.gender = 'Pilih jenis kelamin';
    if (!f.agree) e.agree = 'Setujui ketentuan untuk melanjutkan';
    setErrors(e);
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0];
      document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setBusy(true);
    const all = readAllAppointments();
    const code = nextBookingCode(date, all.map((a) => a.code));
    const appt: Appointment = {
      id: `APT-${Date.now().toString(36)}`,
      code,
      poliId,
      doctorId,
      date,
      time,
      name: f.name.trim(),
      nik: f.nik,
      birthDate: f.birthDate,
      gender: f.gender as 'L' | 'P',
      phone: f.phone,
      payerType: f.payerType,
      complaint: f.complaint || undefined,
      status: 'BOOKED',
      createdAt: nowISO(),
    };
    try {
      savePendingBooking(appt);
    } catch {
      setBusy(false);
      setErrors({ agree: 'Penyimpanan browser tidak tersedia. Coba nonaktifkan mode privat.' });
      return;
    }
    setTimeout(() => (location.href = `/janji-temu/sukses?kode=${encodeURIComponent(code)}`), 500);
  };

  const doc = doctors.find((d) => d.id === doctorId);
  const poli = polis.find((p) => p.id === poliId);
  const set = (k: keyof typeof f, v: string | boolean) => {
    setF({ ...f, [k]: v });
    if (errors[k]) setErrors({ ...errors, [k]: '' });
  };
  const err = (k: string) =>
    errors[k] ? (
      <p id={`${k}-err`} class="field-error" role="alert">
        {errors[k]}
      </p>
    ) : null;

  return (
    <div id="booking" class="scroll-mt-24">
      <ol class="mb-8 flex items-center gap-2" aria-label="Langkah booking">
        {STEPS.map((s, i) => (
          <li key={s} class="flex flex-1 items-center gap-2" aria-current={i === step ? 'step' : undefined}>
            <span class={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${i < step ? 'bg-primary text-white' : i === step ? 'bg-primary-soft text-primary-strong ring-2 ring-primary' : 'bg-surface-2 text-muted'}`}>{i < step ? '✓' : i + 1}</span>
            <span class={`hidden text-sm font-medium sm:block ${i === step ? 'text-text' : 'text-muted'}`}>{s}</span>
            {i < STEPS.length - 1 && <span class={`h-0.5 flex-1 ${i < step ? 'bg-primary' : 'bg-border'}`} />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div>
          <h2 class="font-heading text-xl font-semibold">Pilih poliklinik</h2>
          <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="radiogroup" aria-label="Poliklinik">
            {polis
              .filter((p) => p.id !== 'POL-IGD')
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={poliId === p.id}
                  onClick={() => {
                    setPoliId(p.id);
                    setDoctorId('');
                    setDate('');
                    setTime('');
                  }}
                  class={`rounded-[var(--radius-field)] border px-3 py-2.5 text-left text-sm font-medium transition ${poliId === p.id ? 'border-primary bg-primary-soft text-primary-strong' : 'border-border hover:border-primary/50'}`}
                >
                  {p.name}
                </button>
              ))}
          </div>
          {err('poli')}
          {poliId && (
            <>
              <h2 class="mt-8 font-heading text-xl font-semibold">Pilih dokter</h2>
              <div class="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Dokter">
                {poliDoctors.map((d) => {
                  const days = schedules.filter((s) => s.doctorId === d.id).map((s) => DAY_NAMES[s.day].slice(0, 3));
                  return (
                    <button
                      key={d.id}
                      type="button"
                      role="radio"
                      aria-checked={doctorId === d.id}
                      onClick={() => {
                        setDoctorId(d.id);
                        setDate('');
                        setTime('');
                      }}
                      class={`flex items-center gap-3 rounded-[var(--radius-card)] border p-3 text-left transition ${doctorId === d.id ? 'border-primary bg-primary-soft ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}
                    >
                      <DoctorPortrait name={d.name} id={d.id} class="h-14 w-14 shrink-0 rounded-xl" />
                      <span>
                        <span class="block font-semibold">{d.name}</span>
                        <span class="block text-sm text-muted">{d.specialty}</span>
                        <span class="block text-xs text-subtle">Praktik: {days.join(', ')}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {err('doctor')}
            </>
          )}
        </div>
      )}

      {step === 1 && (
        <div>
          <p class="text-sm text-muted">
            {poli?.name} · <strong class="text-text">{doc?.name}</strong>
          </p>
          <h2 class="mt-4 font-heading text-xl font-semibold">Pilih tanggal</h2>
          <div class="mt-4 flex gap-2 overflow-x-auto pb-2" role="radiogroup" aria-label="Tanggal">
            {dates.map(({ date: d }) => {
              const dt = new Date(d + 'T00:00:00');
              return (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={date === d}
                  onClick={() => {
                    setDate(d);
                    setTime('');
                  }}
                  class={`w-20 shrink-0 rounded-[var(--radius-card)] border px-2 py-3 text-center transition ${date === d ? 'border-primary bg-primary text-white' : 'border-border hover:border-primary/50'}`}
                >
                  <span class="block text-xs">{DAY_NAMES[dt.getDay()].slice(0, 3)}</span>
                  <span class="tabular block font-heading text-2xl font-bold">{dt.getDate()}</span>
                  <span class="block text-xs">{dt.toLocaleDateString('id-ID', { month: 'short' })}</span>
                </button>
              );
            })}
          </div>
          {err('date')}
          {selected && (
            <>
              <h2 class="mt-8 font-heading text-xl font-semibold">Pilih jam kedatangan</h2>
              <p class="text-sm text-muted">
                {dateLong(selected.date)} · praktik {selected.sch.start.replace(':', '.')} - {selected.sch.end.replace(':', '.')}
              </p>
              <div class="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6" role="radiogroup" aria-label="Jam">
                {slots.map((s) => (
                  <button
                    key={s.t}
                    type="button"
                    role="radio"
                    aria-checked={time === s.t}
                    disabled={s.disabled}
                    title={s.booked ? 'Sudah dipesan' : s.disabled ? 'Sudah lewat' : undefined}
                    onClick={() => setTime(s.t)}
                    class={`tabular rounded-[var(--radius-field)] border py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-subtle disabled:line-through ${time === s.t ? 'border-primary bg-primary text-white' : 'border-border hover:border-primary/50'}`}
                  >
                    {s.t.replace(':', '.')}
                  </button>
                ))}
              </div>
              {err('time')}
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <form onSubmit={submit} noValidate>
          <div class="mb-6 rounded-[var(--radius-card)] bg-surface p-4 text-sm">
            <p class="font-semibold">{doc?.name}</p>
            <p class="text-muted">
              {poli?.name} · {dateLong(date)} · {time.replace(':', '.')} WIB
            </p>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="sm:col-span-2">
              <span class="field-label">
                Nama lengkap <span class="text-primary">*</span>
              </span>
              <input name="name" class="input" autoComplete="name" value={f.name} onInput={(e) => set('name', (e.target as HTMLInputElement).value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-err' : undefined} />
              {err('name')}
            </label>
            <label>
              <span class="field-label">
                NIK (16 digit) <span class="text-primary">*</span>
              </span>
              <input name="nik" class="input tabular" inputMode="numeric" maxLength={16} value={f.nik} onInput={(e) => set('nik', (e.target as HTMLInputElement).value.replace(/\D/g, ''))} aria-invalid={!!errors.nik} aria-describedby={errors.nik ? 'nik-err' : undefined} />
              {err('nik')}
            </label>
            <label>
              <span class="field-label">
                Tanggal lahir <span class="text-primary">*</span>
              </span>
              <input name="birthDate" type="date" class="input" max={toDateStr(new Date())} value={f.birthDate} onInput={(e) => set('birthDate', (e.target as HTMLInputElement).value)} aria-invalid={!!errors.birthDate} aria-describedby={errors.birthDate ? 'birthDate-err' : undefined} />
              {err('birthDate')}
            </label>
            <fieldset aria-describedby={errors.gender ? 'gender-err' : undefined}>
              <legend class="field-label">
                Jenis kelamin <span class="text-primary">*</span>
              </legend>
              <div class="flex gap-2">
                {(
                  [
                    ['L', 'Laki-laki'],
                    ['P', 'Perempuan'],
                  ] as const
                ).map(([v, l]) => (
                  <label key={v} class={`flex flex-1 cursor-pointer items-center gap-2 rounded-[var(--radius-field)] border px-3 py-2 text-sm ${f.gender === v ? 'border-primary bg-primary-soft' : 'border-border'}`}>
                    <input type="radio" name="gender" value={v} checked={f.gender === v} onChange={() => set('gender', v)} class="accent-[var(--color-primary)]" /> {l}
                  </label>
                ))}
              </div>
              {err('gender')}
            </fieldset>
            <label>
              <span class="field-label">
                No HP / WhatsApp <span class="text-primary">*</span>
              </span>
              <input name="phone" class="input tabular" inputMode="tel" autoComplete="tel" placeholder="081234567890" value={f.phone} onInput={(e) => set('phone', (e.target as HTMLInputElement).value.replace(/[^\d+]/g, ''))} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'phone-err' : undefined} />
              {err('phone')}
            </label>
            <label class="sm:col-span-2">
              <span class="field-label">Penjamin</span>
              <select name="payerType" class="input" value={f.payerType} onChange={(e) => set('payerType', (e.target as HTMLSelectElement).value)}>
                <option value="UMUM">Umum / pribadi</option>
                <option value="BPJS">BPJS Kesehatan (bawa surat rujukan)</option>
                <option value="ASURANSI">Asuransi lain</option>
              </select>
            </label>
            <label class="sm:col-span-2">
              <span class="field-label">Keluhan singkat (opsional)</span>
              <textarea name="complaint" class="input min-h-[80px]" value={f.complaint} onInput={(e) => set('complaint', (e.target as HTMLTextAreaElement).value)} />
            </label>
            <label class="flex items-start gap-2 text-sm sm:col-span-2">
              <input name="agree" type="checkbox" class="checkbox mt-0.5" checked={f.agree} onChange={(e) => set('agree', (e.target as HTMLInputElement).checked)} />
              <span>Saya menyatakan data di atas benar dan bersedia datang 15 menit sebelum jadwal. Data diproses sesuai kebijakan privasi rumah sakit.</span>
            </label>
            <div class="sm:col-span-2">{err('agree')}</div>
          </div>
          <div class="mt-8 flex justify-between gap-2">
            <button type="button" class="btn btn-secondary" onClick={() => setStep(1)}>
              ← Kembali
            </button>
            <button type="submit" class="btn btn-primary btn-lg" disabled={busy}>
              {busy ? 'Memproses...' : 'Konfirmasi Booking'}
            </button>
          </div>
        </form>
      )}

      {step < 2 && (
        <div class="mt-8 flex justify-between gap-2">
          <button type="button" class="btn btn-secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>
            ← Kembali
          </button>
          <button type="button" class="btn btn-primary" onClick={next}>
            Lanjut →
          </button>
        </div>
      )}
    </div>
  );
}
