import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { Database, Link2, RefreshCw, Save, UserPlus } from 'lucide-preact';
import { SCHEMA_VERSION } from '../../../lib/constants';
import type { Settings as SettingsT } from '../../../lib/types';
import { $patients, $settings, $visits, DEFAULT_SETTINGS } from '../../../stores/db';
import { createPatient, saveSettings } from '../../../stores/actions';
import { showInfo, toast } from '../../../stores/ui';
import { Card, KV, PageHeader, PageSkeleton } from '../../ui/Display';
import { Input, RadioGroup, Switch } from '../../ui/Field';
import { run, useReady } from '../../ui/hooks';
import { confirmReset } from '../../app/Topbar';

const FIRST_M = ['Asep', 'Dadang', 'Ujang', 'Cecep', 'Agus', 'Budi', 'Rudi', 'Hendra', 'Iwan', 'Yayan', 'Deden', 'Rizky', 'Fajar', 'Galih', 'Ilham'];
const FIRST_F = ['Siti', 'Euis', 'Neneng', 'Lilis', 'Imas', 'Rina', 'Dewi', 'Rani', 'Wulan', 'Intan', 'Ayu', 'Putri', 'Fitri', 'Tati', 'Nisa'];
const LAST = ['Suryana', 'Hidayat', 'Kusnadi', 'Sudrajat', 'Permana', 'Saputra', 'Ramdani', 'Setiawan', 'Nugraha', 'Rahayu', 'Lestari', 'Kurniawati', 'Hermawan', 'Firmansyah', 'Mulyana'];
const DISTRICTS = [
  ['Cimahi Utara', 'Cibabat', '03'],
  ['Cimahi Tengah', 'Baros', '02'],
  ['Cimahi Selatan', 'Melong', '01'],
];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const rint = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pad = (n: number, w: number) => String(n).padStart(w, '0');

export function generateRandomPatients(n: number): number {
  let made = 0;
  for (let i = 0; i < n; i++) {
    const gender = Math.random() < 0.5 ? 'L' : 'P';
    const [district, village, code] = pick(DISTRICTS);
    const y = rint(1955, 2018);
    const m = rint(1, 12);
    const d = rint(1, 28);
    const nik = `3277${code}${pad(gender === 'P' ? d + 40 : d, 2)}${pad(m, 2)}${String(y).slice(2)}${pad(rint(1, 9999), 4)}`;
    const bpjs = Math.random() < 0.45;
    try {
      createPatient({
        name: `${pick(gender === 'L' ? FIRST_M : FIRST_F)} ${pick(LAST)}`,
        nik,
        gender,
        birthDate: `${y}-${pad(m, 2)}-${pad(d, 2)}`,
        birthPlace: 'Cimahi',
        phone: `08${pick(['12', '13', '21', '57', '81'])}${pad(rint(10000000, 99999999), 8)}`,
        nationality: 'WNI',
        address: { street: `Jl. ${pick(['Gatot Subroto', 'Amir Machmud', 'Sriwijaya', 'Baros', 'Melong Raya'])} No. ${rint(1, 200)}`, district, village, city: 'Kota Cimahi', province: 'Jawa Barat' },
        payer: bpjs ? { type: 'BPJS', insurerId: 'INS-BPJS', memberNo: `000${pad(rint(1, 999999999), 10)}`, class: 3 } : { type: 'UMUM', insurerId: 'INS-UMUM' },
        allergies: Math.random() < 0.12 ? [pick(['Penisilin', 'NSAID', 'Sulfa', 'Seafood'])] : [],
        notes: 'Data demo tambahan (acak)',
      });
      made++;
    } catch {
      /* duplicate NIK: skip */
    }
  }
  return made;
}

export default function Settings() {
  const ready = useReady();
  const settings = useStore($settings);
  const patients = useStore($patients);
  const visits = useStore($visits);
  const [f, setF] = useState<SettingsT>(settings);
  useEffect(() => setF(settings), [settings]);

  if (!ready) return <PageSkeleton />;
  let storageKb = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k.startsWith('rsd:')) storageKb += (localStorage.getItem(k)?.length ?? 0) / 1024;
    }
  } catch {
    /* ignore */
  }

  return (
    <div>
      <PageHeader title="Pengaturan" subtitle="Profil rumah sakit, format cetak, dan pengelolaan data demo." />
      <div class="grid gap-6 xl:grid-cols-3">
        <Card title="Profil Rumah Sakit" class="xl:col-span-2">
          <div class="flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-4">
            <img src="/logo.webp" alt="Logo Rumah Sakit Dustira" width="200" height="50" class="h-12 w-auto" />
            <p class="text-sm text-muted">Logo resmi dari klien. Penggantian logo tersedia pada versi produksi.</p>
          </div>
          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            <Input class="sm:col-span-2" label="Nama rumah sakit" value={f.hospitalName} onValue={(v) => setF({ ...f, hospitalName: v })} />
            <Input class="sm:col-span-2" label="Alamat" value={f.address} onValue={(v) => setF({ ...f, address: v })} />
            <Input label="Telepon" value={f.phone} onValue={(v) => setF({ ...f, phone: v })} />
            <Input label="Telepon IGD" value={f.emergencyPhone} onValue={(v) => setF({ ...f, emergencyPhone: v })} />
            <Input class="sm:col-span-2" label="Email" value={f.email} onValue={(v) => setF({ ...f, email: v })} />
          </div>
          <h3 class="mt-6 mb-3 text-sm font-semibold">Preferensi cetak</h3>
          <div class="space-y-4">
            <RadioGroup
              label="Format default kwitansi"
              name="receipt"
              value={f.receiptFormat}
              onValue={(v) => setF({ ...f, receiptFormat: v })}
              options={[
                { value: 'A5', label: 'A5 (lembar)' },
                { value: 'THERMAL', label: 'Thermal 80 mm' },
              ]}
            />
            <Switch checked={f.showWatermark} onChange={(v) => setF({ ...f, showWatermark: v })} label='Tampilkan watermark "DEMO" pada dokumen cetak' />
          </div>
          <div class="mt-6 flex justify-end gap-2">
            <button type="button" class="btn btn-ghost" onClick={() => setF(DEFAULT_SETTINGS)}>
              Kembalikan default
            </button>
            <button type="button" class="btn btn-primary" onClick={() => run(() => saveSettings(f), 'Pengaturan disimpan')}>
              <Save size={16} /> Simpan
            </button>
          </div>
        </Card>

        <div class="space-y-6">
          <Card title="Data Demo">
            <div class="space-y-3">
              <button type="button" class="btn btn-secondary w-full justify-start" onClick={() => { const n = generateRandomPatients(20); toast(`${n} pasien acak ditambahkan`, { message: `Total pasien sekarang ${$patients.get().length}` }); }}>
                <UserPlus size={16} /> Isi Data Demo Tambahan (20 pasien)
              </button>
              <button type="button" class="btn btn-danger w-full justify-start" onClick={confirmReset}>
                <RefreshCw size={16} /> Reset Data Demo
              </button>
            </div>
            <div class="mt-4">
              <KV
                cols={1}
                items={[
                  ['Pasien', patients.length],
                  ['Kunjungan', visits.length],
                  ['Penyimpanan lokal', `${storageKb.toFixed(0)} KB (localStorage)`],
                ]}
              />
            </div>
          </Card>
          <Card title="Integrasi">
            <div class="space-y-2">
              {['BPJS V-Claim (SEP & rujukan)', 'SATUSEHAT (FHIR)', 'Payment gateway QRIS', 'Notifikasi WhatsApp'].map((x) => (
                <button key={x} type="button" class="flex w-full items-center justify-between rounded-[var(--radius-field)] border border-border px-3 py-2 text-left text-sm hover:bg-surface" onClick={() => showInfo(`Integrasi ${x}`)}>
                  <span class="flex items-center gap-2">
                    <Link2 size={14} class="text-subtle" /> {x}
                  </span>
                  <span class="badge bg-surface-2 text-muted">Simulasi</span>
                </button>
              ))}
            </div>
          </Card>
          <Card title="Informasi Versi">
            <KV
              cols={1}
              items={[
                ['Aplikasi', 'SIMRS Lite Demo v1.0 (MVP)'],
                ['Skema data', SCHEMA_VERSION],
                ['Stack', 'Astro 5 · Preact · nanostores · Tailwind v4 · Three.js'],
                [<span class="flex items-center gap-1"><Database size={12} /> Penyimpanan</span>, 'Browser (tanpa backend)'],
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
