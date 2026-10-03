import { useEffect, useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { AlertTriangle, BadgeCheck, Loader2, Save, ClipboardPlus } from 'lucide-preact';
import { DISTRICTS, EDUCATIONS, MARITAL, OCCUPATIONS, PROVINCES_CITIES, RELIGIONS } from '../../../lib/constants';
import type { Patient, PayerType } from '../../../lib/types';
import { patientSchema, validate } from '../../../lib/validators';
import { $insurers, $patients } from '../../../stores/db';
import { createPatient, findPatientByNik, updatePatient } from '../../../stores/actions';
import { confirmDialog } from '../../../stores/ui';
import { Card, NotFound, PageHeader, PageSkeleton } from '../../ui/Display';
import { Input, RadioGroup, Select, Textarea } from '../../ui/Field';
import { TagInput } from '../../ui/TagInput';
import { go, run, useParam, useReady } from '../../ui/hooks';

interface FormState {
  name: string;
  nik: string;
  kk: string;
  birthPlace: string;
  birthDate: string;
  gender: 'L' | 'P' | '';
  bloodType: string;
  religion: string;
  maritalStatus: string;
  education: string;
  occupation: string;
  nationality: string;
  phone: string;
  email: string;
  street: string;
  rt: string;
  rw: string;
  village: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  payerType: PayerType;
  insurerId: string;
  memberNo: string;
  bpjsClass: string;
  ecName: string;
  ecRelation: string;
  ecPhone: string;
  allergies: string[];
  medicalHistory: string;
  notes: string;
}

const EMPTY: FormState = {
  name: '',
  nik: '',
  kk: '',
  birthPlace: '',
  birthDate: '',
  gender: '',
  bloodType: '-',
  religion: 'Islam',
  maritalStatus: 'Belum Kawin',
  education: '',
  occupation: '',
  nationality: 'WNI',
  phone: '',
  email: '',
  street: '',
  rt: '',
  rw: '',
  village: '',
  district: 'Cimahi Tengah',
  city: 'Kota Cimahi',
  province: 'Jawa Barat',
  postalCode: '',
  payerType: 'UMUM',
  insurerId: '',
  memberNo: '',
  bpjsClass: '3',
  ecName: '',
  ecRelation: '',
  ecPhone: '',
  allergies: [],
  medicalHistory: '',
  notes: '',
};

function fromPatient(p: Patient): FormState {
  return {
    ...EMPTY,
    name: p.name,
    nik: p.nik,
    kk: p.kk ?? '',
    birthPlace: p.birthPlace ?? '',
    birthDate: p.birthDate,
    gender: p.gender,
    bloodType: p.bloodType ?? '-',
    religion: p.religion ?? '',
    maritalStatus: p.maritalStatus ?? '',
    education: p.education ?? '',
    occupation: p.occupation ?? '',
    nationality: p.nationality ?? 'WNI',
    phone: p.phone,
    email: p.email ?? '',
    street: p.address.street,
    rt: p.address.rt ?? '',
    rw: p.address.rw ?? '',
    village: p.address.village ?? '',
    district: p.address.district ?? '',
    city: p.address.city,
    province: p.address.province,
    postalCode: p.address.postalCode ?? '',
    payerType: p.payer.type,
    insurerId: p.payer.insurerId ?? '',
    memberNo: p.payer.memberNo ?? '',
    bpjsClass: String(p.payer.class ?? 3),
    ecName: p.emergencyContact?.name ?? '',
    ecRelation: p.emergencyContact?.relation ?? '',
    ecPhone: p.emergencyContact?.phone ?? '',
    allergies: [...p.allergies],
    medicalHistory: p.medicalHistory ?? '',
    notes: p.notes ?? '',
  };
}

function toInput(f: FormState): Omit<Patient, 'id' | 'mrn' | 'createdAt' | 'updatedAt'> {
  return {
    name: f.name.trim(),
    nik: f.nik,
    kk: f.kk || undefined,
    birthPlace: f.birthPlace || undefined,
    birthDate: f.birthDate,
    gender: f.gender as 'L' | 'P',
    bloodType: (f.bloodType || '-') as Patient['bloodType'],
    religion: f.religion || undefined,
    maritalStatus: f.maritalStatus || undefined,
    education: f.education || undefined,
    occupation: f.occupation || undefined,
    nationality: f.nationality,
    phone: f.phone,
    email: f.email || undefined,
    address: { street: f.street || '-', rt: f.rt || undefined, rw: f.rw || undefined, village: f.village || undefined, district: f.district || undefined, city: f.city, province: f.province, postalCode: f.postalCode || undefined },
    payer:
      f.payerType === 'BPJS'
        ? { type: 'BPJS', insurerId: 'INS-BPJS', memberNo: f.memberNo, class: Number(f.bpjsClass) as 1 | 2 | 3 }
        : f.payerType === 'ASURANSI'
          ? { type: 'ASURANSI', insurerId: f.insurerId, memberNo: f.memberNo }
          : { type: 'UMUM', insurerId: 'INS-UMUM' },
    emergencyContact: f.ecName ? { name: f.ecName, relation: f.ecRelation, phone: f.ecPhone } : undefined,
    allergies: f.allergies,
    medicalHistory: f.medicalHistory || undefined,
    notes: f.notes || undefined,
  };
}

export default function PatientForm({ mode }: { mode: 'new' | 'edit' }) {
  const ready = useReady(150);
  const id = useParam('id');
  const returnTo = useParam('return');
  const patients = useStore($patients);
  const insurers = useStore($insurers);
  const existing = mode === 'edit' ? patients.find((p) => p.id === id) : undefined;
  const [f, setF] = useState<FormState>(EMPTY);
  const [initial, setInitial] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bpjs, setBpjs] = useState<'idle' | 'checking' | 'active' | 'invalid'>('idle');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!ready || loaded) return;
    if (mode === 'edit' && existing) {
      const s = fromPatient(existing);
      setF(s);
      setInitial(s);
    }
    setLoaded(true);
  }, [ready, existing]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setF((prev) => ({ ...prev, [k]: v }));
    if (errors[k as string]) setErrors((e) => ({ ...e, [k as string]: '' }));
  };
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);
  const dup = f.nik.length === 16 ? findPatientByNik(f.nik, existing?.id) : undefined;
  const cities = PROVINCES_CITIES[f.province] ?? [];
  const asuransi = useMemo(() => insurers.filter((i) => i.type === 'ASURANSI' && i.active !== false), [insurers]);

  const checkBpjs = () => {
    if (!/^\d{13}$/.test(f.memberNo)) {
      setErrors((e) => ({ ...e, memberNo: 'No kartu BPJS harus 13 digit' }));
      setBpjs('invalid');
      return;
    }
    setBpjs('checking');
    setTimeout(() => setBpjs('active'), 1000);
  };

  const save = (andRegister: boolean) => {
    const r = validate(patientSchema, { ...f, memberNo: f.memberNo, insurerId: f.insurerId });
    if (!r.ok) {
      setErrors(r.errors);
      const first = Object.keys(r.errors)[0];
      setTimeout(() => document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus(), 30);
      return;
    }
    if (dup) {
      setErrors((e) => ({ ...e, nik: 'NIK sudah terdaftar' }));
      return;
    }
    const input = toInput(f);
    const saved =
      mode === 'edit' && existing
        ? run(() => updatePatient(existing.id, input), 'Data pasien diperbarui', input.name)
        : run(() => createPatient(input), (p) => `Pasien baru tersimpan: ${p.mrn}`, input.name);
    if (!saved) return;
    setInitial(f);
    if (andRegister || returnTo === 'pendaftaran') go(`/app/pendaftaran/baru?patient=${saved.id}`);
    else go(`/app/pasien/detail?id=${saved.id}`);
  };

  const cancel = async () => {
    if (dirty) {
      const r = await confirmDialog({ title: 'Batalkan perubahan?', message: 'Data yang sudah diisi belum disimpan dan akan hilang.', confirmLabel: 'Ya, buang perubahan', tone: 'danger' });
      if (!r.ok) return;
    }
    go(existing ? `/app/pasien/detail?id=${existing.id}` : '/app/pasien');
  };

  if (!ready || !loaded) return <PageSkeleton />;
  if (mode === 'edit' && !existing) return <NotFound what="Pasien" back={{ href: '/app/pasien', label: 'Kembali ke daftar pasien' }} />;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(false);
      }}
      noValidate
    >
      <PageHeader
        title={mode === 'edit' ? `Edit Pasien · ${existing?.mrn}` : 'Pasien Baru'}
        subtitle={mode === 'edit' ? existing?.name : 'No RM dibuat otomatis saat disimpan. Kolom bertanda * wajib diisi.'}
        back={{ href: existing ? `/app/pasien/detail?id=${existing.id}` : '/app/pasien', label: existing ? 'Detail pasien' : 'Data pasien' }}
      />

      <div class="grid gap-6">
        <Card title="1. Identitas">
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Input class="md:col-span-2" label="Nama lengkap" name="name" required value={f.name} onValue={(v) => set('name', v)} error={errors.name} autoComplete="off" />
            <Input
              label="NIK"
              name="nik"
              required
              inputMode="numeric"
              maxLength={16}
              value={f.nik}
              onValue={(v) => set('nik', v.replace(/\D/g, ''))}
              error={errors.nik}
              hint={`${f.nik.length}/16 digit`}
            />
            {dup && (
              <div class="flex items-start gap-2 rounded-[var(--radius-field)] border border-warning/40 bg-warning-soft p-3 text-sm text-warning-strong md:col-span-2 xl:col-span-3" role="alert">
                <AlertTriangle size={18} class="mt-0.5 shrink-0" />
                <span>
                  NIK ini sudah terdaftar atas nama <strong>{dup.name}</strong> ({dup.mrn}).{' '}
                  <a href={`/app/pasien/detail?id=${dup.id}`} class="font-semibold underline">
                    Buka data pasien
                  </a>{' '}
                  atau{' '}
                  <a href={`/app/pendaftaran/baru?patient=${dup.id}`} class="font-semibold underline">
                    daftarkan kunjungan
                  </a>
                  .
                </span>
              </div>
            )}
            <Input label="No KK" name="kk" inputMode="numeric" maxLength={16} value={f.kk} onValue={(v) => set('kk', v.replace(/\D/g, ''))} error={errors.kk} />
            <Input label="Tempat lahir" name="birthPlace" value={f.birthPlace} onValue={(v) => set('birthPlace', v)} />
            <Input label="Tanggal lahir" name="birthDate" type="date" required max={new Date().toISOString().slice(0, 10)} value={f.birthDate} onValue={(v) => set('birthDate', v)} error={errors.birthDate} />
            <RadioGroup
              label="Jenis kelamin"
              name="gender"
              required
              value={f.gender}
              onValue={(v) => set('gender', v)}
              options={[
                { value: 'L', label: 'Laki-laki' },
                { value: 'P', label: 'Perempuan' },
              ]}
              error={errors.gender}
            />
            <Select label="Golongan darah" name="bloodType" value={f.bloodType} onValue={(v) => set('bloodType', v)} options={['A', 'B', 'AB', 'O', { value: '-', label: 'Tidak tahu' }]} />
            <Select label="Agama" name="religion" value={f.religion} onValue={(v) => set('religion', v)} options={RELIGIONS} placeholder="Pilih" />
            <Select label="Status pernikahan" name="maritalStatus" value={f.maritalStatus} onValue={(v) => set('maritalStatus', v)} options={MARITAL} placeholder="Pilih" />
            <Select label="Pendidikan" name="education" value={f.education} onValue={(v) => set('education', v)} options={EDUCATIONS} placeholder="Pilih" />
            <Select label="Pekerjaan" name="occupation" value={f.occupation} onValue={(v) => set('occupation', v)} options={OCCUPATIONS} placeholder="Pilih" />
            <Select label="Kewarganegaraan" name="nationality" value={f.nationality} onValue={(v) => set('nationality', v)} options={['WNI', 'WNA']} />
          </div>
        </Card>

        <Card title="2. Kontak & Alamat">
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input label="No HP" name="phone" required inputMode="tel" placeholder="081234567890" value={f.phone} onValue={(v) => set('phone', v.replace(/[^\d+]/g, ''))} error={errors.phone} />
            <Input label="Email" name="email" type="email" value={f.email} onValue={(v) => set('email', v)} error={errors.email} />
            <Input class="md:col-span-2" label="Alamat" name="street" placeholder="Nama jalan, nomor rumah" value={f.street} onValue={(v) => set('street', v)} />
            <div class="grid grid-cols-2 gap-3">
              <Input label="RT" name="rt" inputMode="numeric" maxLength={3} value={f.rt} onValue={(v) => set('rt', v.replace(/\D/g, ''))} />
              <Input label="RW" name="rw" inputMode="numeric" maxLength={3} value={f.rw} onValue={(v) => set('rw', v.replace(/\D/g, ''))} />
            </div>
            <Input label="Kelurahan/Desa" name="village" value={f.village} onValue={(v) => set('village', v)} />
            <Select label="Kecamatan" name="district" value={f.district} onValue={(v) => set('district', v)} options={DISTRICTS} />
            <Select label="Kota/Kabupaten" name="city" value={f.city} onValue={(v) => set('city', v)} options={cities} />
            <Select
              label="Provinsi"
              name="province"
              value={f.province}
              onValue={(v) => {
                set('province', v);
                set('city', PROVINCES_CITIES[v]?.[0] ?? '');
              }}
              options={Object.keys(PROVINCES_CITIES)}
            />
            <Input label="Kode pos" name="postalCode" inputMode="numeric" maxLength={5} value={f.postalCode} onValue={(v) => set('postalCode', v.replace(/\D/g, ''))} />
          </div>
        </Card>

        <Card title="3. Penjamin">
          <div class="space-y-4">
            <RadioGroup
              name="payerType"
              value={f.payerType}
              onValue={(v) => {
                set('payerType', v);
                setBpjs('idle');
              }}
              options={[
                { value: 'UMUM', label: 'Umum (pribadi)' },
                { value: 'BPJS', label: 'BPJS Kesehatan' },
                { value: 'ASURANSI', label: 'Asuransi lain' },
              ]}
            />
            {f.payerType === 'BPJS' && (
              <div class="grid items-start gap-4 md:grid-cols-[1fr_160px_auto]">
                <Input
                  label="No kartu BPJS"
                  name="memberNo"
                  required
                  inputMode="numeric"
                  maxLength={13}
                  value={f.memberNo}
                  onValue={(v) => {
                    set('memberNo', v.replace(/\D/g, ''));
                    setBpjs('idle');
                  }}
                  error={errors.memberNo}
                  hint={`${f.memberNo.length}/13 digit`}
                />
                <Select label="Kelas" name="bpjsClass" value={f.bpjsClass} onValue={(v) => set('bpjsClass', v)} options={['1', '2', '3'].map((c) => ({ value: c, label: `Kelas ${c}` }))} />
                <div class="md:pt-[26px]">
                  <button type="button" class="btn btn-secondary" onClick={checkBpjs} disabled={bpjs === 'checking'}>
                    {bpjs === 'checking' ? <Loader2 size={16} class="animate-spin" /> : <BadgeCheck size={16} />}
                    {bpjs === 'checking' ? 'Memeriksa...' : 'Cek Kepesertaan'}
                  </button>
                  {bpjs === 'active' && (
                    <p class="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-success-strong" role="status">
                      <span class="badge bg-success text-white">Aktif</span> Peserta JKN aktif · Faskes I: Puskesmas Cimahi Tengah (simulasi)
                    </p>
                  )}
                </div>
              </div>
            )}
            {f.payerType === 'ASURANSI' && (
              <div class="grid gap-4 md:grid-cols-2">
                <Select label="Perusahaan asuransi" name="insurerId" required value={f.insurerId} onValue={(v) => set('insurerId', v)} options={asuransi.map((i) => ({ value: i.id, label: `${i.name} (tanggungan ${i.coveragePct}%)` }))} placeholder="Pilih asuransi" error={errors.insurerId} />
                <Input label="No polis / kartu" name="memberNo" required value={f.memberNo} onValue={(v) => set('memberNo', v)} error={errors.memberNo} />
              </div>
            )}
          </div>
        </Card>

        <div class="grid gap-6 xl:grid-cols-2">
          <Card title="4. Penanggung Jawab / Kontak Darurat">
            <div class="grid gap-4 md:grid-cols-3">
              <Input label="Nama" name="ecName" value={f.ecName} onValue={(v) => set('ecName', v)} />
              <Select label="Hubungan" name="ecRelation" value={f.ecRelation} onValue={(v) => set('ecRelation', v)} options={['Suami', 'Istri', 'Anak', 'Orang Tua', 'Saudara', 'Lainnya']} placeholder="Pilih" />
              <Input label="No HP" name="ecPhone" inputMode="tel" value={f.ecPhone} onValue={(v) => set('ecPhone', v.replace(/[^\d+]/g, ''))} />
            </div>
          </Card>
          <Card title="5. Medis Dasar">
            <div class="grid gap-4">
              <TagInput label="Alergi" value={f.allergies} onChange={(v) => set('allergies', v)} suggestions={['Penisilin', 'NSAID', 'Sulfa', 'Seafood', 'Debu']} hint="Alergi akan ditandai merah di seluruh layar klinis dan dicek saat peresepan." />
              <Input label="Riwayat penyakit" name="medicalHistory" value={f.medicalHistory} onValue={(v) => set('medicalHistory', v)} placeholder="Contoh: Hipertensi sejak 2019" />
              <Textarea label="Catatan" name="notes" value={f.notes} onValue={(v) => set('notes', v)} />
            </div>
          </Card>
        </div>
      </div>

      <div class="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-white/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        {dirty && <span class="mr-auto text-sm text-muted">Ada perubahan yang belum disimpan</span>}
        <button type="button" class="btn btn-ghost" onClick={cancel}>
          Batal
        </button>
        <button type="button" class="btn btn-secondary" onClick={() => save(true)}>
          <ClipboardPlus size={16} /> Simpan & Daftarkan Kunjungan
        </button>
        <button type="submit" class="btn btn-primary">
          <Save size={16} /> Simpan
        </button>
      </div>
    </form>
  );
}
