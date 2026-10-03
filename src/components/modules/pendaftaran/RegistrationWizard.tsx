import { useEffect, useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { ArrowLeft, ArrowRight, CheckCircle2, ListOrdered, Loader2, Printer, RotateCcw, UserPlus, X, BadgeCheck, FilePlus2 } from 'lucide-preact';
import { DAY_NAMES } from '../../../lib/constants';
import { isSameDay } from '../../../lib/date';
import { ageLabel, maskId } from '../../../lib/format';
import { dummySep } from '../../../lib/id';
import type { Patient, Payer, PayerType, Visit } from '../../../lib/types';
import { patientSchema, validate } from '../../../lib/validators';
import { $doctors, $insurers, $patients, $polis, $schedules, $visits } from '../../../stores/db';
import { createPatient, registerVisit } from '../../../stores/actions';
import { Badge } from '../../ui/Badge';
import { Combobox } from '../../ui/Combobox';
import { Avatar, Card, KV, PageHeader, PageSkeleton, Stepper } from '../../ui/Display';
import { Input, RadioGroup, Select } from '../../ui/Field';
import { Modal } from '../../ui/Modal';
import { go, run, useParam, useReady } from '../../ui/hooks';
import { AllergyBadge, PayerBadge } from '../shared';

const STEPS = ['Pilih Pasien', 'Kunjungan', 'Penjamin', 'Konfirmasi'];

function QuickPatientModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (p: Patient) => void }) {
  const [f, setF] = useState({ name: '', nik: '', birthDate: '', gender: '' as 'L' | 'P' | '', phone: '', payerType: 'UMUM' as PayerType, memberNo: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  useEffect(() => {
    if (!open) {
      setF({ name: '', nik: '', birthDate: '', gender: '', phone: '', payerType: 'UMUM', memberNo: '' });
      setErrors({});
    }
  }, [open]);
  const submit = () => {
    const r = validate(patientSchema, { ...f, insurerId: 'INS-SS' });
    if (!r.ok) return setErrors(r.errors);
    const p = run(
      () =>
        createPatient({
          name: f.name.trim(),
          nik: f.nik,
          birthDate: f.birthDate,
          gender: f.gender as 'L' | 'P',
          phone: f.phone,
          nationality: 'WNI',
          address: { street: '-', city: 'Kota Cimahi', province: 'Jawa Barat' },
          payer: f.payerType === 'BPJS' ? { type: 'BPJS', insurerId: 'INS-BPJS', memberNo: f.memberNo, class: 3 } : { type: 'UMUM', insurerId: 'INS-UMUM' },
          allergies: [],
          notes: 'Didaftarkan melalui form ringkas. Lengkapi data saat senggang.',
        }),
      (x) => `Pasien baru ${x.mrn} tersimpan`,
    );
    if (p) onCreated(p);
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pasien Baru (Form Ringkas)"
      description="Data minimal untuk pendaftaran cepat. Data lengkap bisa dilengkapi kemudian."
      footer={
        <>
          <a href="/app/pasien/baru?return=pendaftaran" class="btn btn-ghost mr-auto">
            Ke form lengkap
          </a>
          <button type="button" class="btn btn-secondary" onClick={onClose}>
            Batal
          </button>
          <button type="button" class="btn btn-primary" onClick={submit}>
            Simpan & Pilih
          </button>
        </>
      }
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <Input class="sm:col-span-2" label="Nama lengkap" required data-autofocus value={f.name} onValue={(v) => set('name', v)} error={errors.name} />
        <Input label="NIK" required inputMode="numeric" maxLength={16} value={f.nik} onValue={(v) => set('nik', v.replace(/\D/g, ''))} error={errors.nik} />
        <Input label="Tanggal lahir" type="date" required value={f.birthDate} onValue={(v) => set('birthDate', v)} error={errors.birthDate} />
        <RadioGroup
          label="Jenis kelamin"
          name="q-gender"
          required
          value={f.gender}
          onValue={(v) => set('gender', v)}
          options={[
            { value: 'L', label: 'Laki-laki' },
            { value: 'P', label: 'Perempuan' },
          ]}
          error={errors.gender}
        />
        <Input label="No HP" required inputMode="tel" value={f.phone} onValue={(v) => set('phone', v.replace(/[^\d+]/g, ''))} error={errors.phone} />
        <Select label="Penjamin" value={f.payerType} onValue={(v) => set('payerType', v)} options={[{ value: 'UMUM', label: 'Umum' }, { value: 'BPJS', label: 'BPJS Kesehatan' }]} />
        {f.payerType === 'BPJS' && <Input label="No kartu BPJS" required inputMode="numeric" maxLength={13} value={f.memberNo} onValue={(v) => set('memberNo', v.replace(/\D/g, ''))} error={errors.memberNo} />}
      </div>
    </Modal>
  );
}

export default function RegistrationWizard() {
  const ready = useReady(150);
  const presetPatient = useParam('patient');
  const patients = useStore($patients);
  const polis = useStore($polis);
  const doctors = useStore($doctors);
  const schedules = useStore($schedules);
  const visits = useStore($visits);
  const insurers = useStore($insurers);

  const [step, setStep] = useState(0);
  const [patientId, setPatientId] = useState('');
  const [quickOpen, setQuickOpen] = useState(false);
  const [type, setType] = useState<Visit['type']>('RAJAL');
  const [poliId, setPoliId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [source, setSource] = useState<Visit['source']>('WALKIN');
  const [refNo, setRefNo] = useState('');
  const [refOrigin, setRefOrigin] = useState('');
  const [payer, setPayer] = useState<Payer>({ type: 'UMUM' });
  const [sep, setSep] = useState('');
  const [sepBusy, setSepBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Visit | null>(null);

  useEffect(() => {
    if (ready && presetPatient && patients.some((p) => p.id === presetPatient)) selectPatient(presetPatient);
  }, [ready, presetPatient]);

  const patient = patients.find((p) => p.id === patientId);
  const selectPatient = (id: string) => {
    setPatientId(id);
    const p = patients.find((x) => x.id === id) ?? $patients.get().find((x) => x.id === id);
    if (p) setPayer({ ...p.payer });
    setSep('');
  };

  const today = new Date();
  const dow = today.getDay();
  const todayVisits = useMemo(() => visits.filter((v) => isSameDay(v.registeredAt) && v.status !== 'BATAL'), [visits]);
  const doctorOptions = useMemo(() => {
    return doctors
      .filter((d) => d.active !== false && d.poliId === poliId)
      .map((d) => {
        const sch = schedules.find((s) => s.doctorId === d.id && s.day === dow && s.active !== false);
        const used = todayVisits.filter((v) => v.doctorId === d.id).length;
        return { d, sch, used, left: sch ? Math.max(sch.quota - used, 0) : 0 };
      });
  }, [doctors, poliId, schedules, todayVisits]);
  const visibleDoctors = showAll ? doctorOptions : doctorOptions.filter((o) => o.sch);

  const activePolis = polis.filter((p) => p.active !== false && (type === 'IGD' ? p.id === 'POL-IGD' : p.id !== 'POL-IGD'));

  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 0 && !patientId) e.patient = 'Pilih pasien terlebih dahulu';
    if (s === 1) {
      if (!poliId) e.poli = 'Pilih poli tujuan';
      if (!doctorId) e.doctor = 'Pilih dokter';
      if (source === 'RUJUKAN' && !refNo.trim()) e.refNo = 'No rujukan wajib diisi';
      if (source === 'RUJUKAN' && !refOrigin.trim()) e.refOrigin = 'Faskes asal wajib diisi';
    }
    if (s === 2) {
      if (payer.type === 'BPJS' && !/^\d{13}$/.test(payer.memberNo ?? '')) e.memberNo = 'No kartu BPJS harus 13 digit';
      if (payer.type === 'BPJS' && !sep) e.sep = 'Buat SEP terlebih dahulu (simulasi)';
      if (payer.type === 'ASURANSI' && !payer.insurerId) e.insurer = 'Pilih asuransi';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const next = () => validateStep(step) && setStep(step + 1);

  const createSep = () => {
    if (!/^\d{13}$/.test(payer.memberNo ?? '')) {
      setErrors({ memberNo: 'No kartu BPJS harus 13 digit' });
      return;
    }
    setSepBusy(true);
    setTimeout(() => {
      setSep(dummySep());
      setSepBusy(false);
      setErrors({});
    }, 1100);
  };

  const submit = () => {
    if (!patient) return;
    const v = run(
      () =>
        registerVisit({
          patientId: patient.id,
          poliId,
          doctorId,
          type,
          source,
          referral: source === 'RUJUKAN' ? { number: refNo, origin: refOrigin } : undefined,
          payer,
          sepNo: sep || undefined,
        }),
      (x) => `Pendaftaran berhasil · Antrian ${x.queueNo}`,
      patient.name,
    );
    if (v) setDone(v);
  };

  const reset = () => {
    setStep(0);
    setPatientId('');
    setPoliId('');
    setDoctorId('');
    setType('RAJAL');
    setSource('WALKIN');
    setRefNo('');
    setRefOrigin('');
    setSep('');
    setDone(null);
    history.replaceState(null, '', '/app/pendaftaran/baru');
  };

  if (!ready) return <PageSkeleton />;

  if (done) {
    const poli = polis.find((p) => p.id === done.poliId);
    const doc = doctors.find((d) => d.id === done.doctorId);
    return (
      <div class="mx-auto max-w-xl">
        <div class="card p-8 text-center">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success-strong">
            <CheckCircle2 size={30} />
          </div>
          <h1 class="mt-4 text-2xl font-bold">Pendaftaran Berhasil</h1>
          <p class="mt-1 text-muted">{patient?.name} terdaftar dan masuk antrian.</p>
          <div class="mx-auto mt-6 w-56 rounded-[var(--radius-card)] border-2 border-dashed border-primary/40 bg-primary-soft p-5">
            <p class="text-xs font-semibold tracking-wider text-primary-strong uppercase">Nomor Antrian</p>
            <p class="tabular font-heading text-5xl font-extrabold text-primary">{done.queueNo}</p>
            <p class="mt-1 text-sm font-medium">{poli?.name}</p>
          </div>
          <div class="mt-6 text-left">
            <KV
              items={[
                ['No Registrasi', <span class="tabular">{done.regNo}</span>],
                ['Dokter', doc?.name],
                ['Penjamin', <PayerBadge payer={done.payer} />],
                ['No SEP', done.sepNo ?? '-'],
              ]}
            />
          </div>
          <p class="mt-4 rounded-[var(--radius-field)] bg-surface p-3 text-left text-xs text-muted">Tagihan draft otomatis dibuat (biaya administrasi dan jasa konsultasi dokter).</p>
          <div class="mt-6 flex flex-wrap justify-center gap-2">
            <a href={`/app/pendaftaran/detail?id=${done.id}&print=1`} class="btn btn-primary">
              <Printer size={16} /> Cetak Bukti Pendaftaran
            </a>
            <button type="button" class="btn btn-secondary" onClick={reset}>
              <RotateCcw size={16} /> Pendaftaran Lain
            </button>
            <a href="/app/antrian" class="btn btn-secondary">
              <ListOrdered size={16} /> Ke Antrian
            </a>
          </div>
        </div>
      </div>
    );
  }

  const poli = polis.find((p) => p.id === poliId);
  const doc = doctors.find((d) => d.id === doctorId);

  return (
    <div class="mx-auto max-w-4xl">
      <PageHeader title="Pendaftaran Kunjungan" subtitle="Daftarkan pasien ke poliklinik atau IGD dalam 4 langkah." back={{ href: '/app/pendaftaran', label: 'Daftar registrasi' }} />
      <div class="card mb-6 p-4">
        <Stepper steps={STEPS} current={step} onStep={(i) => setStep(i)} />
      </div>

      {step === 0 && (
        <Card title="Pilih Pasien">
          <div class="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <Combobox
              label="Cari pasien lama (No RM, nama, NIK, No BPJS)"
              items={patients}
              itemKey={(p) => p.id}
              filter={(p, q) => p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q) || p.nik.includes(q) || (p.payer.memberNo ?? '').includes(q)}
              onSelect={(p) => selectPatient(p.id)}
              placeholder="Ketik minimal 2 karakter..."
              autoFocus
              renderItem={(p) => (
                <div class="flex items-center gap-3">
                  <Avatar name={p.name} size={30} />
                  <div class="min-w-0 flex-1">
                    <p class="truncate font-medium">{p.name}</p>
                    <p class="tabular text-xs text-muted">
                      {p.mrn} · {ageLabel(p.birthDate)} · NIK {maskId(p.nik)}
                    </p>
                  </div>
                  <PayerBadge payer={p.payer} />
                </div>
              )}
            />
            <button type="button" class="btn btn-secondary" onClick={() => setQuickOpen(true)}>
              <UserPlus size={16} /> Pasien Baru
            </button>
          </div>
          {errors.patient && (
            <p class="field-error" role="alert">
              {errors.patient}
            </p>
          )}
          {patient && (
            <div class="mt-5 flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] border border-primary/30 bg-primary-soft/50 p-4">
              <Avatar name={patient.name} size={48} />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-lg font-semibold">{patient.name}</p>
                  <PayerBadge payer={patient.payer} />
                  <AllergyBadge allergies={patient.allergies} full />
                </div>
                <p class="tabular text-sm text-muted">
                  {patient.mrn} · {patient.gender} · {ageLabel(patient.birthDate)} · NIK {maskId(patient.nik)} · {patient.phone}
                </p>
              </div>
              <button type="button" class="btn-icon" onClick={() => setPatientId('')} aria-label="Ganti pasien">
                <X size={18} />
              </button>
            </div>
          )}
        </Card>
      )}

      {step === 1 && (
        <Card title="Data Kunjungan">
          <div class="space-y-5">
            <RadioGroup
              label="Jenis kunjungan"
              name="type"
              value={type}
              onValue={(v) => {
                setType(v);
                setDoctorId('');
                setPoliId(v === 'IGD' ? 'POL-IGD' : '');
              }}
              options={[
                { value: 'RAJAL', label: 'Rawat Jalan (Poliklinik)' },
                { value: 'IGD', label: 'IGD (Gawat Darurat)' },
              ]}
            />
            <Select
              label="Poli tujuan"
              required
              value={poliId}
              onValue={(v) => {
                setPoliId(v);
                setDoctorId('');
              }}
              options={activePolis.map((p) => ({ value: p.id, label: `${p.name} (antrian ${p.queuePrefix})` }))}
              placeholder="Pilih poli"
              error={errors.poli}
            />
            {poliId && (
              <div>
                <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p class="field-label mb-0">
                    Dokter <span class="font-normal text-muted">· jadwal hari {DAY_NAMES[dow]}</span>
                  </p>
                  <label class="inline-flex items-center gap-2 text-sm text-muted">
                    <input type="checkbox" class="checkbox" checked={showAll} onChange={(e) => setShowAll((e.target as HTMLInputElement).checked)} />
                    Tampilkan dokter di luar jadwal
                  </label>
                </div>
                {visibleDoctors.length === 0 && (
                  <p class="rounded-[var(--radius-field)] bg-warning-soft p-3 text-sm text-warning-strong">
                    Tidak ada dokter praktik hari ini di poli ini. Centang "Tampilkan dokter di luar jadwal" untuk memilih dokter lain (demo).
                  </p>
                )}
                <div class="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Pilih dokter">
                  {visibleDoctors.map(({ d, sch, left, used }) => {
                    const full = !!sch && left === 0;
                    const active = doctorId === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={full}
                        onClick={() => setDoctorId(d.id)}
                        class={`flex items-start gap-3 rounded-[var(--radius-card)] border p-3.5 text-left transition disabled:opacity-50 ${active ? 'border-primary bg-primary-soft ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}
                      >
                        <Avatar name={d.name} size={40} />
                        <div class="min-w-0 flex-1">
                          <p class="text-sm font-semibold">{d.name}</p>
                          <p class="text-xs text-muted">{d.specialty}</p>
                          <p class="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                            {sch ? (
                              <>
                                <Badge tone="info">
                                  {sch.start.replace(':', '.')} - {sch.end.replace(':', '.')}
                                </Badge>
                                <Badge tone={full ? 'danger' : left <= 3 ? 'warning' : 'success'}>
                                  {full ? 'Kuota penuh' : `Sisa kuota ${left}/${sch.quota}`}
                                </Badge>
                              </>
                            ) : (
                              <Badge tone="neutral">Tidak praktik hari ini · {used} pasien</Badge>
                            )}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {errors.doctor && (
                  <p class="field-error" role="alert">
                    {errors.doctor}
                  </p>
                )}
              </div>
            )}
            <RadioGroup
              label="Cara masuk"
              name="source"
              value={source}
              onValue={setSource}
              options={[
                { value: 'WALKIN', label: 'Datang sendiri' },
                { value: 'RUJUKAN', label: 'Rujukan' },
                { value: 'BOOKING', label: 'Booking online' },
              ]}
            />
            {source === 'RUJUKAN' && (
              <div class="grid gap-4 sm:grid-cols-2">
                <Input label="No rujukan" required value={refNo} onValue={setRefNo} error={errors.refNo} />
                <Input label="Faskes asal" required value={refOrigin} onValue={setRefOrigin} placeholder="Contoh: Puskesmas Cimahi Tengah" error={errors.refOrigin} />
              </div>
            )}
          </div>
        </Card>
      )}

      {step === 2 && patient && (
        <Card title="Penjamin">
          <div class="space-y-5">
            <p class="text-sm text-muted">
              Default dari data pasien: <PayerBadge payer={patient.payer} />. Dapat diganti untuk kunjungan ini.
            </p>
            <RadioGroup
              name="payer"
              value={payer.type}
              onValue={(t) => {
                setSep('');
                setPayer(t === patient.payer.type ? { ...patient.payer } : t === 'BPJS' ? { type: 'BPJS', insurerId: 'INS-BPJS', class: 3, memberNo: '' } : t === 'UMUM' ? { type: 'UMUM', insurerId: 'INS-UMUM' } : { type: 'ASURANSI', insurerId: '' });
              }}
              options={[
                { value: 'UMUM', label: 'Umum' },
                { value: 'BPJS', label: 'BPJS Kesehatan' },
                { value: 'ASURANSI', label: 'Asuransi' },
              ]}
            />
            {payer.type === 'BPJS' && (
              <div class="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4">
                <div class="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <Input
                    label="No kartu BPJS"
                    required
                    inputMode="numeric"
                    maxLength={13}
                    value={payer.memberNo ?? ''}
                    onValue={(v) => {
                      setPayer({ ...payer, memberNo: v.replace(/\D/g, '') });
                      setSep('');
                    }}
                    error={errors.memberNo}
                  />
                  <button type="button" class="btn btn-primary" onClick={createSep} disabled={sepBusy || !!sep}>
                    {sepBusy ? <Loader2 size={16} class="animate-spin" /> : <FilePlus2 size={16} />}
                    {sepBusy ? 'Menghubungi V-Claim...' : sep ? 'SEP dibuat' : 'Buat SEP (simulasi)'}
                  </button>
                </div>
                {sep && (
                  <div class="flex items-center gap-2 rounded-[var(--radius-field)] bg-success-soft p-3 text-sm text-success-strong" role="status">
                    <BadgeCheck size={18} />
                    <span>
                      SEP berhasil dibuat: <strong class="tabular">{sep}</strong> · Peserta aktif kelas {payer.class ?? 3}
                    </span>
                  </div>
                )}
                {errors.sep && (
                  <p class="field-error" role="alert">
                    {errors.sep}
                  </p>
                )}
              </div>
            )}
            {payer.type === 'ASURANSI' && (
              <div class="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Asuransi"
                  required
                  value={payer.insurerId ?? ''}
                  onValue={(v) => setPayer({ ...payer, insurerId: v })}
                  options={insurers.filter((i) => i.type === 'ASURANSI' && i.active !== false).map((i) => ({ value: i.id, label: `${i.name} (${i.coveragePct}%)` }))}
                  placeholder="Pilih asuransi"
                  error={errors.insurer}
                />
                <Input label="No polis" value={payer.memberNo ?? ''} onValue={(v) => setPayer({ ...payer, memberNo: v })} />
              </div>
            )}
          </div>
        </Card>
      )}

      {step === 3 && patient && (
        <Card title="Konfirmasi Pendaftaran">
          <KV
            items={[
              ['Pasien', `${patient.name} (${patient.mrn})`],
              ['Jenis kunjungan', type === 'IGD' ? 'IGD' : 'Rawat Jalan'],
              ['Poli', poli?.name],
              ['Dokter', doc?.name],
              ['Cara masuk', source === 'WALKIN' ? 'Datang sendiri' : source === 'RUJUKAN' ? `Rujukan ${refNo} dari ${refOrigin}` : 'Booking online'],
              ['Penjamin', <PayerBadge payer={payer} />],
              ['No SEP', sep || '-'],
              ['Perkiraan antrian', <span class="tabular font-semibold">{poli?.queuePrefix}-{String(todayVisits.filter((v) => v.poliId === poliId).length + 1).padStart(3, '0')}</span>],
            ]}
          />
          {patient.allergies.length > 0 && (
            <p class="mt-4 rounded-[var(--radius-field)] bg-danger-soft p-3 text-sm font-medium text-danger-strong">Perhatian: pasien memiliki alergi {patient.allergies.join(', ')}.</p>
          )}
        </Card>
      )}

      <div class="mt-6 flex items-center justify-between gap-2">
        <button type="button" class="btn btn-secondary" onClick={() => (step === 0 ? go('/app/pendaftaran') : setStep(step - 1))}>
          <ArrowLeft size={16} /> {step === 0 ? 'Batal' : 'Kembali'}
        </button>
        {step < 3 ? (
          <button type="button" class="btn btn-primary" onClick={next}>
            Lanjut <ArrowRight size={16} />
          </button>
        ) : (
          <button type="button" class="btn btn-primary btn-lg" onClick={submit}>
            <CheckCircle2 size={18} /> Daftarkan
          </button>
        )}
      </div>

      <QuickPatientModal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onCreated={(p) => {
          setQuickOpen(false);
          setPatientId(p.id);
          setPayer({ ...p.payer });
        }}
      />
    </div>
  );
}
