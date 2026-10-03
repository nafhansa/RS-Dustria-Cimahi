/**
 * Deterministic seed generator for the SIMRS Dustira demo.
 * Run: `npm run seed` (Node >= 22.6 strips TypeScript types natively).
 *
 * All dates are written as relative tokens and resolved on the client at init time:
 *   "@-3"        -> date 3 days ago (YYYY-MM-DD)
 *   "@-3T09:30"  -> local datetime 3 days ago at 09:30
 *   "{@-3}"      -> YYMMDD of 3 days ago (used inside document numbers)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'seed');
mkdirSync(OUT, { recursive: true });

// ---------- deterministic PRNG ----------
let s = 20261003;
function rnd(): number {
  s |= 0;
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const chance = (p: number) => rnd() < p;
const pad = (n: number, w: number) => String(n).padStart(w, '0');
const pickSome = <T>(arr: readonly T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  return out;
};
const dt = (day: number, h: number, m: number) => `@${day}T${pad(h, 2)}:${pad(m, 2)}`;
const d = (day: number) => `@${day}`;
const yymmdd = (day: number) => `{@${day}}`;

// ---------- reference data ----------
const insurers = [
  { id: 'INS-UMUM', name: 'Umum (Pribadi)', type: 'UMUM', coveragePct: 0, active: true },
  { id: 'INS-BPJS', name: 'BPJS Kesehatan', type: 'BPJS', coveragePct: 100, active: true },
  { id: 'INS-SS', name: 'Asuransi Sehat Sentosa', type: 'ASURANSI', coveragePct: 80, active: true },
  { id: 'INS-PM', name: 'Prima Medika Assurance', type: 'ASURANSI', coveragePct: 90, active: true },
  { id: 'INS-MP', name: 'Mitra Proteksi Mandiri', type: 'ASURANSI', coveragePct: 75, active: true },
];

const polis = [
  ['POL-A', 'PD', 'penyakit-dalam', 'Penyakit Dalam', 'A', 'Diagnosis dan tata laksana penyakit organ dalam pada dewasa: hipertensi, diabetes, gangguan lambung, ginjal, dan infeksi.'],
  ['POL-B', 'ANA', 'anak', 'Anak', 'B', 'Layanan kesehatan bayi, anak, dan remaja termasuk imunisasi, tumbuh kembang, dan penyakit infeksi anak.'],
  ['POL-C', 'OBG', 'kandungan', 'Kandungan & Kebidanan', 'C', 'Pemeriksaan kehamilan, USG, konsultasi kesehatan reproduksi, dan program persalinan aman.'],
  ['POL-D', 'BED', 'bedah', 'Bedah Umum', 'D', 'Tindakan bedah minor dan mayor, perawatan luka, serta konsultasi pra dan pasca operasi.'],
  ['POL-E', 'JAN', 'jantung', 'Jantung & Pembuluh Darah', 'E', 'Deteksi dini dan penanganan penyakit jantung koroner, gagal jantung, dan gangguan irama jantung.'],
  ['POL-F', 'SAR', 'saraf', 'Saraf', 'F', 'Penanganan nyeri kepala, stroke, epilepsi, saraf terjepit, dan gangguan sistem saraf lainnya.'],
  ['POL-G', 'GIG', 'gigi', 'Gigi & Mulut', 'G', 'Perawatan gigi menyeluruh: tambal, cabut, scaling, dan konsultasi kesehatan mulut.'],
  ['POL-H', 'MAT', 'mata', 'Mata', 'H', 'Pemeriksaan visus, refraksi, katarak, glaukoma, dan infeksi mata.'],
  ['POL-I', 'THT', 'tht', 'THT-KL', 'I', 'Telinga, hidung, tenggorokan, kepala dan leher: sinusitis, tonsilitis, gangguan pendengaran.'],
  ['POL-J', 'REH', 'rehabilitasi-medik', 'Rehabilitasi Medik', 'J', 'Fisioterapi dan rehabilitasi pasca stroke, cedera olahraga, serta nyeri punggung dan sendi.'],
  ['POL-IGD', 'IGD', 'igd', 'Instalasi Gawat Darurat', 'Z', 'Pelayanan kegawatdaruratan 24 jam dengan dokter jaga dan tim siaga.'],
].map(([id, code, slug, name, queuePrefix, description]) => ({ id, code, slug, name, queuePrefix, description, active: true }));

const doctors = [
  ['D01', 'dr. Anisa Rahmawati, Sp.PD', 'Spesialis Penyakit Dalam', 'POL-A'],
  ['D02', 'dr. Hendra Gunawan, Sp.PD', 'Spesialis Penyakit Dalam', 'POL-A'],
  ['D03', 'dr. Ratna Sari Dewi, Sp.A', 'Spesialis Anak', 'POL-B'],
  ['D04', 'dr. Yusuf Maulana, Sp.A', 'Spesialis Anak', 'POL-B'],
  ['D05', 'dr. Lestari Handayani, Sp.OG', 'Spesialis Obstetri & Ginekologi', 'POL-C'],
  ['D06', 'dr. Bambang Supriadi, Sp.B', 'Spesialis Bedah Umum', 'POL-D'],
  ['D07', 'dr. Agus Setiawan, Sp.JP', 'Spesialis Jantung & Pembuluh Darah', 'POL-E'],
  ['D08', 'dr. Dewi Anggraini, Sp.N', 'Spesialis Saraf', 'POL-F'],
  ['D09', 'drg. Nurul Hidayah, Sp.KG', 'Spesialis Konservasi Gigi', 'POL-G'],
  ['D10', 'dr. Intan Permatasari, Sp.M', 'Spesialis Mata', 'POL-H'],
  ['D11', 'dr. Teguh Wibowo, Sp.THT-KL', 'Spesialis THT-KL', 'POL-I'],
  ['D12', 'dr. Maya Kusumawati, Sp.KFR', 'Spesialis Kedokteran Fisik & Rehabilitasi', 'POL-J'],
  ['D13', 'dr. Fikri Ramadhan', 'Dokter Umum (IGD)', 'POL-IGD'],
  ['D14', 'dr. Asep Saepudin', 'Dokter Umum (IGD)', 'POL-IGD'],
].map(([id, name, specialty, poliId], i) => ({
  id,
  name,
  specialty,
  poliId,
  sip: `SIP.503/${pad(1201 + i * 37, 4)}/DPMPTSP/2025`,
  bio: `${name.split(',')[0]} berpengalaman lebih dari ${8 + (i % 9)} tahun dan aktif dalam pelayanan ${specialty.toLowerCase()}.`,
  active: true,
}));

// day: 0=Minggu .. 6=Sabtu
const schedDef: Record<string, [number[], string, string, number]> = {
  D01: [[1, 2, 3, 4, 5, 6], '08:00', '12:00', 25],
  D02: [[1, 3, 5], '13:00', '16:00', 20],
  D03: [[1, 2, 4], '08:00', '12:00', 25],
  D04: [[3, 5, 6], '09:00', '13:00', 20],
  D05: [[1, 2, 3, 4], '09:00', '13:00', 20],
  D06: [[2, 4, 6], '08:00', '11:00', 15],
  D07: [[1, 3, 5], '08:00', '12:00', 20],
  D08: [[2, 4], '10:00', '14:00', 15],
  D09: [[1, 2, 3, 4, 5], '08:00', '14:00', 15],
  D10: [[1, 3, 6], '08:00', '12:00', 20],
  D11: [[2, 5], '13:00', '17:00', 15],
  D12: [[1, 4, 6], '08:00', '12:00', 15],
  D13: [[0, 1, 2, 3, 4, 5, 6], '07:00', '19:00', 60],
  D14: [[0, 1, 2, 3, 4, 5, 6], '19:00', '07:00', 60],
};
const schedules: object[] = [];
for (const [doctorId, [days, start, end, quota]] of Object.entries(schedDef))
  for (const day of days) schedules.push({ id: `SCH-${doctorId}-${day}`, doctorId, day, start, end, quota, active: true });

const users = [
  { id: 'U-ADMIN', name: 'Rina Kartika', role: 'ADMIN', title: 'Admin Pendaftaran', active: true },
  { id: 'U-PERAWAT', name: 'Ns. Dimas Prasetyo', role: 'PERAWAT', title: 'Perawat Poliklinik', active: true },
  { id: 'U-DOKTER', name: 'dr. Anisa Rahmawati, Sp.PD', role: 'DOKTER', title: 'Dokter Spesialis Penyakit Dalam', doctorId: 'D01', active: true },
  { id: 'U-APOTEKER', name: 'apt. Fajar Nugraha, S.Farm', role: 'APOTEKER', title: 'Apoteker', active: true },
  { id: 'U-KASIR', name: 'Sari Wulandari', role: 'KASIR', title: 'Kasir', active: true },
  { id: 'U-SUPER', name: 'Admin Sistem', role: 'SUPERADMIN', title: 'Super Admin', active: true },
];

// code, name, category, priceUmum, priceBpjs
const procDef: [string, string, string, string, number, number][] = [
  ['PRC-ADM', 'ADM.01', 'Administrasi Rawat Jalan', 'ADMIN', 25000, 0],
  ['PRC-ADM-IGD', 'ADM.02', 'Administrasi IGD', 'ADMIN', 50000, 0],
  ['PRC-KARTU', 'ADM.03', 'Kartu Pasien Baru', 'ADMIN', 10000, 0],
  ['PRC-KON-UM', '89.03', 'Konsultasi Dokter Umum', 'KONSULTASI', 75000, 0],
  ['PRC-KON-SP', '89.03.1', 'Konsultasi Dokter Spesialis', 'KONSULTASI', 150000, 0],
  ['PRC-KON-GI', '89.03.2', 'Konsultasi Dokter Gigi Spesialis', 'KONSULTASI', 125000, 0],
  ['PRC-KON-IGD', '89.7', 'Pemeriksaan Dokter Jaga IGD', 'KONSULTASI', 125000, 0],
  ['PRC-EKG', '89.52', 'Pemeriksaan EKG', 'MEDIS', 125000, 0],
  ['PRC-NEBU', '93.94', 'Nebulizer', 'MEDIS', 85000, 0],
  ['PRC-LUKA', '96.59', 'Rawat Luka Sederhana', 'MEDIS', 75000, 0],
  ['PRC-HECT', '86.59', 'Penjahitan Luka (≤ 5 jahitan)', 'MEDIS', 150000, 0],
  ['PRC-INSISI', '86.04', 'Insisi & Drainase Abses', 'MEDIS', 250000, 0],
  ['PRC-INJ', '99.29', 'Injeksi IM/IV', 'MEDIS', 35000, 0],
  ['PRC-KATETER', '57.94', 'Pemasangan Kateter Urin', 'MEDIS', 120000, 0],
  ['PRC-SERUMEN', '96.52', 'Ekstraksi Serumen', 'MEDIS', 100000, 0],
  ['PRC-BENDA-MATA', '98.21', 'Ekstraksi Benda Asing Mata', 'MEDIS', 150000, 0],
  ['PRC-CABUT', '23.09', 'Pencabutan Gigi', 'MEDIS', 200000, 0],
  ['PRC-TAMBAL', '23.2', 'Penambalan Gigi (Komposit)', 'MEDIS', 175000, 0],
  ['PRC-SCALING', '96.54', 'Scaling Gigi', 'MEDIS', 250000, 0],
  ['PRC-VISUS', '95.02', 'Pemeriksaan Visus & Refraksi', 'MEDIS', 50000, 0],
  ['PRC-AUDIO', '95.41', 'Audiometri', 'MEDIS', 175000, 0],
  ['PRC-EEG', '89.14', 'Elektroensefalografi (EEG)', 'MEDIS', 350000, 0],
  ['PRC-FISIO', '93.39', 'Fisioterapi (per sesi)', 'MEDIS', 120000, 0],
  ['PRC-DL', '90.59', 'Darah Rutin (Hematologi Lengkap)', 'LAB', 85000, 0],
  ['PRC-GDS', '90.58', 'Gula Darah Sewaktu (GDS)', 'LAB', 30000, 0],
  ['PRC-HBA1C', '90.53', 'HbA1c', 'LAB', 175000, 0],
  ['PRC-KOL', '90.52', 'Profil Lipid (Kolesterol Total)', 'LAB', 55000, 0],
  ['PRC-AU', '90.55', 'Asam Urat', 'LAB', 45000, 0],
  ['PRC-RFT', '90.56', 'Fungsi Ginjal (Ureum, Kreatinin)', 'LAB', 90000, 0],
  ['PRC-LFT', '90.57', 'Fungsi Hati (SGOT, SGPT)', 'LAB', 80000, 0],
  ['PRC-UL', '91.39', 'Urinalisa', 'LAB', 50000, 0],
  ['PRC-THORAX', '87.44', 'Rontgen Thorax PA', 'RADIOLOGI', 175000, 0],
  ['PRC-USG-ABD', '88.76', 'USG Abdomen', 'RADIOLOGI', 300000, 0],
  ['PRC-USG-OBS', '88.78', 'USG Kehamilan', 'RADIOLOGI', 250000, 0],
  ['PRC-PANORAMIK', '87.12', 'Rontgen Gigi Panoramik', 'RADIOLOGI', 200000, 0],
  ['PRC-EKST', '88.26', 'Rontgen Ekstremitas', 'RADIOLOGI', 150000, 0],
  ['PRC-INFUS', '99.18', 'Pemasangan Infus', 'KEPERAWATAN', 85000, 0],
  ['PRC-BALUT', '96.57', 'Ganti Balutan', 'KEPERAWATAN', 50000, 0],
  ['PRC-O2', '93.96', 'Pemberian Oksigen', 'KEPERAWATAN', 40000, 0],
  ['PRC-TTV', '89.39', 'Observasi Tanda Vital IGD', 'KEPERAWATAN', 30000, 0],
];
const procedureMaster = procDef.map(([id, code, name, category, priceUmum, priceBpjs]) => ({ id, code, name, category, priceUmum, priceBpjs, active: true }));
const procById = Object.fromEntries(procedureMaster.map((p) => [p.id, p]));

// id, code, name, generic, category, form, unit, price, minStock, allergyTags, stockProfile
type MedDef = [string, string, string, string, string, string, number, number, string[], ('ok' | 'low' | 'out' | 'ed')?];
const medDef: MedDef[] = [
  ['M001', 'Paracetamol 500 mg', 'Paracetamol', 'GENERIK', 'TABLET', 'tablet', 500, 200, []],
  ['M002', 'Amoxicillin 500 mg', 'Amoxicillin', 'GENERIK', 'KAPSUL', 'kapsul', 1200, 150, ['penisilin', 'amoxicillin', 'beta-laktam'], 'out'],
  ['M003', 'Amoxa-D 500 mg', 'Amoxicillin', 'PATEN', 'KAPSUL', 'kapsul', 3500, 50, ['penisilin', 'amoxicillin', 'beta-laktam']],
  ['M004', 'Amlodipine 5 mg', 'Amlodipine', 'GENERIK', 'TABLET', 'tablet', 800, 200, []],
  ['M005', 'Amlodipine 10 mg', 'Amlodipine', 'GENERIK', 'TABLET', 'tablet', 1200, 100, []],
  ['M006', 'Captopril 25 mg', 'Captopril', 'GENERIK', 'TABLET', 'tablet', 400, 150, ['ace-inhibitor'], 'low'],
  ['M007', 'Lisinopril 10 mg', 'Lisinopril', 'GENERIK', 'TABLET', 'tablet', 1500, 60, ['ace-inhibitor']],
  ['M008', 'Candesartan 8 mg', 'Candesartan', 'GENERIK', 'TABLET', 'tablet', 2500, 60, []],
  ['M009', 'Bisoprolol 5 mg', 'Bisoprolol', 'GENERIK', 'TABLET', 'tablet', 1800, 60, ['beta-bloker']],
  ['M010', 'Furosemide 40 mg', 'Furosemide', 'GENERIK', 'TABLET', 'tablet', 600, 60, ['sulfa']],
  ['M011', 'Metformin 500 mg', 'Metformin', 'GENERIK', 'TABLET', 'tablet', 500, 200, []],
  ['M012', 'Glimepiride 2 mg', 'Glimepiride', 'GENERIK', 'TABLET', 'tablet', 1500, 80, ['sulfonilurea']],
  ['M013', 'Simvastatin 20 mg', 'Simvastatin', 'GENERIK', 'TABLET', 'tablet', 700, 100, []],
  ['M014', 'Atorvastatin 20 mg', 'Atorvastatin', 'GENERIK', 'TABLET', 'tablet', 2500, 60, []],
  ['M015', 'Asam Mefenamat 500 mg', 'Asam Mefenamat', 'GENERIK', 'TABLET', 'tablet', 600, 150, ['nsaid', 'ains']],
  ['M016', 'Ibuprofen 400 mg', 'Ibuprofen', 'GENERIK', 'TABLET', 'tablet', 700, 150, ['nsaid', 'ains']],
  ['M017', 'Natrium Diklofenak 50 mg', 'Natrium Diklofenak', 'GENERIK', 'TABLET', 'tablet', 800, 100, ['nsaid', 'ains']],
  ['M018', 'Meloxicam 15 mg', 'Meloxicam', 'GENERIK', 'TABLET', 'tablet', 1200, 60, ['nsaid', 'ains']],
  ['M019', 'Cetirizine 10 mg', 'Cetirizine', 'GENERIK', 'TABLET', 'tablet', 600, 100, []],
  ['M020', 'Loratadine 10 mg', 'Loratadine', 'GENERIK', 'TABLET', 'tablet', 800, 60, []],
  ['M021', 'CTM 4 mg', 'Klorfeniramin Maleat', 'OTC', 'TABLET', 'tablet', 200, 100, [], 'ed'],
  ['M022', 'Omeprazole 20 mg', 'Omeprazole', 'GENERIK', 'KAPSUL', 'kapsul', 900, 150, [], 'out'],
  ['M023', 'Omepra-D 20 mg', 'Omeprazole', 'PATEN', 'KAPSUL', 'kapsul', 4500, 30, []],
  ['M024', 'Lansoprazole 30 mg', 'Lansoprazole', 'GENERIK', 'KAPSUL', 'kapsul', 1800, 60, []],
  ['M025', 'Ranitidine 150 mg', 'Ranitidine', 'GENERIK', 'TABLET', 'tablet', 500, 100, [], 'ed'],
  ['M026', 'Antasida Doen', 'Antasida', 'OTC', 'TABLET', 'tablet', 300, 100, []],
  ['M027', 'Domperidone 10 mg', 'Domperidone', 'GENERIK', 'TABLET', 'tablet', 700, 80, []],
  ['M028', 'Ondansetron 4 mg', 'Ondansetron', 'GENERIK', 'TABLET', 'tablet', 2500, 50, []],
  ['M029', 'Loperamide 2 mg', 'Loperamide', 'GENERIK', 'TABLET', 'tablet', 500, 60, []],
  ['M030', 'Zinc 20 mg', 'Zinc', 'GENERIK', 'TABLET', 'tablet', 600, 100, []],
  ['M031', 'Ciprofloxacin 500 mg', 'Ciprofloxacin', 'GENERIK', 'TABLET', 'tablet', 1200, 80, ['kuinolon', 'quinolone']],
  ['M032', 'Levofloxacin 500 mg', 'Levofloxacin', 'GENERIK', 'TABLET', 'tablet', 3500, 50, ['kuinolon', 'quinolone']],
  ['M033', 'Cefadroxil 500 mg', 'Cefadroxil', 'GENERIK', 'KAPSUL', 'kapsul', 1800, 80, ['sefalosporin', 'beta-laktam']],
  ['M034', 'Cefixime 100 mg', 'Cefixime', 'GENERIK', 'KAPSUL', 'kapsul', 2500, 60, ['sefalosporin', 'beta-laktam']],
  ['M035', 'Azithromycin 500 mg', 'Azithromycin', 'GENERIK', 'TABLET', 'tablet', 5000, 40, ['makrolida']],
  ['M036', 'Metronidazole 500 mg', 'Metronidazole', 'GENERIK', 'TABLET', 'tablet', 600, 80, []],
  ['M037', 'Kotrimoksazol 480 mg', 'Kotrimoksazol', 'GENERIK', 'TABLET', 'tablet', 500, 80, ['sulfa']],
  ['M038', 'Dexamethasone 0,5 mg', 'Dexamethasone', 'GENERIK', 'TABLET', 'tablet', 200, 150, ['kortikosteroid'], 'low'],
  ['M039', 'Methylprednisolone 4 mg', 'Methylprednisolone', 'GENERIK', 'TABLET', 'tablet', 1200, 80, ['kortikosteroid']],
  ['M040', 'Prednisone 5 mg', 'Prednisone', 'GENERIK', 'TABLET', 'tablet', 400, 60, ['kortikosteroid']],
  ['M041', 'Salbutamol 2 mg', 'Salbutamol', 'GENERIK', 'TABLET', 'tablet', 300, 80, []],
  ['M042', 'Ambroxol 30 mg', 'Ambroxol', 'GENERIK', 'TABLET', 'tablet', 400, 150, []],
  ['M043', 'N-Asetilsistein 200 mg', 'Asetilsistein', 'GENERIK', 'KAPSUL', 'kapsul', 1500, 60, []],
  ['M044', 'Vitamin B Kompleks', 'Vitamin B Kompleks', 'OTC', 'TABLET', 'tablet', 200, 200, []],
  ['M045', 'Vitamin C 500 mg', 'Asam Askorbat', 'OTC', 'TABLET', 'tablet', 400, 150, [], 'ed'],
  ['M046', 'Asam Folat 1 mg', 'Asam Folat', 'GENERIK', 'TABLET', 'tablet', 200, 100, []],
  ['M047', 'Sulfas Ferosus 300 mg', 'Sulfas Ferosus', 'GENERIK', 'TABLET', 'tablet', 300, 100, []],
  ['M048', 'Kalsium Laktat 500 mg', 'Kalsium Laktat', 'GENERIK', 'TABLET', 'tablet', 300, 100, []],
  ['M049', 'Allopurinol 100 mg', 'Allopurinol', 'GENERIK', 'TABLET', 'tablet', 400, 80, []],
  ['M050', 'Kolkisin 0,5 mg', 'Kolkisin', 'GENERIK', 'TABLET', 'tablet', 1500, 40, []],
  ['M051', 'Clopidogrel 75 mg', 'Clopidogrel', 'GENERIK', 'TABLET', 'tablet', 3000, 60, []],
  ['M052', 'Asam Asetilsalisilat 80 mg', 'Asam Asetilsalisilat', 'GENERIK', 'TABLET', 'tablet', 500, 100, ['nsaid', 'salisilat', 'aspirin']],
  ['M053', 'Isosorbid Dinitrat 5 mg', 'Isosorbid Dinitrat', 'GENERIK', 'TABLET', 'tablet', 500, 60, []],
  ['M054', 'Diazepam 5 mg', 'Diazepam', 'PSIKOTROPIKA', 'TABLET', 'tablet', 600, 40, ['benzodiazepin']],
  ['M055', 'Alprazolam 0,5 mg', 'Alprazolam', 'PSIKOTROPIKA', 'TABLET', 'tablet', 1500, 30, ['benzodiazepin']],
  ['M056', 'Kodein 10 mg', 'Kodein', 'NARKOTIKA', 'TABLET', 'tablet', 2500, 30, ['opioid']],
  ['M057', 'Tramadol 50 mg', 'Tramadol', 'GENERIK', 'KAPSUL', 'kapsul', 1500, 40, ['opioid']],
  ['M058', 'Gabapentin 300 mg', 'Gabapentin', 'GENERIK', 'KAPSUL', 'kapsul', 3000, 40, []],
  ['M059', 'Amitriptilin 25 mg', 'Amitriptilin', 'GENERIK', 'TABLET', 'tablet', 500, 40, []],
  ['M060', 'Betahistin 6 mg', 'Betahistin', 'GENERIK', 'TABLET', 'tablet', 1200, 60, []],
  ['M061', 'Flunarizin 5 mg', 'Flunarizin', 'GENERIK', 'KAPSUL', 'kapsul', 800, 60, []],
  ['M062', 'Mekobalamin 500 mcg', 'Mekobalamin', 'GENERIK', 'TABLET', 'tablet', 900, 80, []],
  ['M063', 'Paracetamol Sirup 120 mg/5 mL', 'Paracetamol', 'GENERIK', 'SIRUP', 'botol', 9000, 30, []],
  ['M064', 'Amoxicillin Sirup 125 mg/5 mL', 'Amoxicillin', 'GENERIK', 'SIRUP', 'botol', 12000, 20, ['penisilin', 'amoxicillin', 'beta-laktam']],
  ['M065', 'Ambroxol Sirup 15 mg/5 mL', 'Ambroxol', 'GENERIK', 'SIRUP', 'botol', 10000, 20, []],
  ['M066', 'Salbutamol Sirup 2 mg/5 mL', 'Salbutamol', 'GENERIK', 'SIRUP', 'botol', 9500, 20, []],
  ['M067', 'Cetirizine Sirup 5 mg/5 mL', 'Cetirizine', 'GENERIK', 'SIRUP', 'botol', 15000, 20, []],
  ['M068', 'Ibuprofen Sirup 100 mg/5 mL', 'Ibuprofen', 'GENERIK', 'SIRUP', 'botol', 14000, 20, ['nsaid', 'ains']],
  ['M069', 'Zinc Sirup 20 mg/5 mL', 'Zinc', 'GENERIK', 'SIRUP', 'botol', 16000, 20, []],
  ['M070', 'Antasida Sirup', 'Antasida', 'OTC', 'SIRUP', 'botol', 11000, 20, []],
  ['M071', 'Ceftriaxone 1 g Injeksi', 'Ceftriaxone', 'GENERIK', 'INJEKSI', 'vial', 18000, 30, ['sefalosporin', 'beta-laktam']],
  ['M072', 'Ranitidine Injeksi 50 mg/2 mL', 'Ranitidine', 'GENERIK', 'INJEKSI', 'ampul', 6000, 30, []],
  ['M073', 'Ondansetron Injeksi 4 mg/2 mL', 'Ondansetron', 'GENERIK', 'INJEKSI', 'ampul', 9000, 30, [], 'low'],
  ['M074', 'Ketorolac Injeksi 30 mg/mL', 'Ketorolac', 'GENERIK', 'INJEKSI', 'ampul', 7500, 30, ['nsaid', 'ains']],
  ['M075', 'Dexamethasone Injeksi 5 mg/mL', 'Dexamethasone', 'GENERIK', 'INJEKSI', 'ampul', 4000, 30, ['kortikosteroid']],
  ['M076', 'Gentamicin Salep 0,1%', 'Gentamicin', 'GENERIK', 'SALEP', 'tube', 8000, 20, ['aminoglikosida'], 'low'],
  ['M077', 'Hidrokortison Krim 2,5%', 'Hidrokortison', 'GENERIK', 'SALEP', 'tube', 7000, 20, ['kortikosteroid']],
  ['M078', 'Asam Fusidat Krim 2%', 'Asam Fusidat', 'GENERIK', 'SALEP', 'tube', 25000, 15, []],
  ['M079', 'Kloramfenikol Tetes Mata 0,5%', 'Kloramfenikol', 'GENERIK', 'TETES', 'botol', 15000, 20, []],
  ['M080', 'Ofloksasin Tetes Telinga 0,3%', 'Ofloksasin', 'GENERIK', 'TETES', 'botol', 30000, 15, ['kuinolon', 'quinolone']],
  ['M081', 'Air Mata Buatan Tetes Mata', 'Hipromelosa', 'OTC', 'TETES', 'botol', 22000, 15, []],
  ['M082', 'Oralit 200 mL', 'Oralit', 'OTC', 'TABLET', 'sachet', 1000, 100, []],
];
const medicines = medDef.map(([id, name, genericName, category, form, unit, sellPrice, minStock, allergyTags, profile = 'ok'], i) => {
  const n = profile === 'out' ? 0 : int(1, 3);
  const batches = [];
  for (let b = 0; b < n; b++) {
    let qty = profile === 'low' ? int(Math.floor(minStock * 0.15), Math.floor(minStock * 0.35)) : int(minStock * 0.8, minStock * 2.5);
    qty = Math.max(qty, 3);
    const expiryDay = profile === 'ed' && b === 0 ? int(20, 70) : int(180, 720);
    batches.push({ batchNo: `B${pad(24000 + i * 7 + b, 5)}${String.fromCharCode(65 + b)}`, expiry: d(expiryDay), qty, buyPrice: Math.round((sellPrice * 0.72) / 10) * 10 });
  }
  return { id, code: `OBT-${id.slice(1)}`, name, genericName, category, form, unit, sellPrice, minStock, allergyTags, batches, active: true };
});
const medById = Object.fromEntries(medicines.map((m) => [m.id, m]));
const stockMovements: object[] = [];
for (const m of medicines)
  for (const b of m.batches)
    stockMovements.push({ id: `SM-${m.id}-${b.batchNo}`, medicineId: m.id, batchNo: b.batchNo, type: 'IN', qty: b.qty, ref: 'SALDO-AWAL', reason: 'Saldo awal stok', at: dt(-61, 8, 0), by: 'U-APOTEKER' });

const icd10: [string, string][] = [
  ['A01.0', 'Demam tifoid'], ['A09', 'Diare dan gastroenteritis infeksi'], ['A15.0', 'Tuberkulosis paru'], ['A90', 'Demam dengue'], ['A91', 'Demam berdarah dengue'],
  ['B01.9', 'Varisela tanpa komplikasi'], ['B35.4', 'Tinea korporis'], ['B86', 'Skabies'], ['D50.9', 'Anemia defisiensi besi'], ['E03.9', 'Hipotiroidisme'],
  ['E05.9', 'Tirotoksikosis'], ['E11.9', 'Diabetes melitus tipe 2 tanpa komplikasi'], ['E11.6', 'Diabetes melitus tipe 2 dengan komplikasi lain'], ['E66.9', 'Obesitas'], ['E78.0', 'Hiperkolesterolemia murni'],
  ['E78.5', 'Hiperlipidemia'], ['E79.0', 'Hiperurisemia'], ['F32.9', 'Episode depresif'], ['F41.1', 'Gangguan cemas menyeluruh'], ['F51.0', 'Insomnia nonorganik'],
  ['G40.9', 'Epilepsi'], ['G43.9', 'Migren'], ['G44.2', 'Nyeri kepala tipe tegang'], ['G45.9', 'Transient ischemic attack'], ['G51.0', "Bell's palsy"],
  ['G56.0', 'Sindrom terowongan karpal'], ['G62.9', 'Polineuropati'], ['H10.9', 'Konjungtivitis'], ['H25.9', 'Katarak senilis'], ['H40.9', 'Glaukoma'],
  ['H52.1', 'Miopia'], ['H52.4', 'Presbiopia'], ['H60.9', 'Otitis eksterna'], ['H61.2', 'Serumen prop'], ['H65.9', 'Otitis media nonsupuratif'],
  ['H66.9', 'Otitis media supuratif'], ['H81.1', 'Vertigo posisional paroksismal benigna'], ['H91.9', 'Gangguan pendengaran'], ['I10', 'Hipertensi esensial (primer)'], ['I11.9', 'Penyakit jantung hipertensi'],
  ['I20.9', 'Angina pektoris'], ['I25.1', 'Penyakit jantung aterosklerotik'], ['I48', 'Fibrilasi atrium'], ['I50.9', 'Gagal jantung'], ['I63.9', 'Infark serebral (stroke iskemik)'],
  ['I69.4', 'Sekuele stroke'], ['I83.9', 'Varises tungkai'], ['I84.9', 'Hemoroid'], ['J00', 'Nasofaringitis akut (common cold)'], ['J01.9', 'Sinusitis akut'],
  ['J02.9', 'Faringitis akut'], ['J03.9', 'Tonsilitis akut'], ['J06.9', 'Infeksi saluran pernapasan atas akut (ISPA)'], ['J18.9', 'Pneumonia'], ['J20.9', 'Bronkitis akut'],
  ['J30.4', 'Rinitis alergi'], ['J32.9', 'Sinusitis kronis'], ['J35.0', 'Tonsilitis kronis'], ['J44.9', 'Penyakit paru obstruktif kronis (PPOK)'], ['J45.9', 'Asma'],
  ['K02.9', 'Karies gigi'], ['K04.0', 'Pulpitis'], ['K05.1', 'Gingivitis kronis'], ['K08.1', 'Kehilangan gigi'], ['K21.9', 'Penyakit refluks gastroesofageal (GERD)'],
  ['K29.7', 'Gastritis'], ['K30', 'Dispepsia'], ['K35.8', 'Apendisitis akut'], ['K40.9', 'Hernia inguinalis'], ['K59.0', 'Konstipasi'],
  ['K80.2', 'Kolelitiasis'], ['L02.9', 'Abses kulit'], ['L03.9', 'Selulitis'], ['L20.9', 'Dermatitis atopik'], ['L23.9', 'Dermatitis kontak alergi'],
  ['L50.9', 'Urtikaria'], ['M10.9', 'Gout'], ['M17.9', 'Osteoartritis lutut'], ['M25.5', 'Nyeri sendi'], ['M47.8', 'Spondilosis'],
  ['M51.2', 'Hernia nukleus pulposus (HNP)'], ['M54.5', 'Nyeri punggung bawah'], ['M62.6', 'Strain otot'], ['M75.0', 'Frozen shoulder'], ['M79.1', 'Mialgia'],
  ['N18.9', 'Penyakit ginjal kronis'], ['N20.0', 'Batu ginjal'], ['N39.0', 'Infeksi saluran kemih'], ['N76.0', 'Vaginitis akut'], ['N92.6', 'Menstruasi tidak teratur'],
  ['N94.6', 'Dismenore'], ['O21.0', 'Hiperemesis gravidarum ringan'], ['O26.9', 'Kondisi terkait kehamilan'], ['R05', 'Batuk'], ['R10.4', 'Nyeri perut'],
  ['R50.9', 'Demam'], ['R51', 'Nyeri kepala'], ['S01.8', 'Luka terbuka kepala'], ['S61.9', 'Luka terbuka pergelangan dan tangan'], ['S93.4', 'Keseleo pergelangan kaki'],
  ['T14.1', 'Luka terbuka'], ['T78.4', 'Reaksi alergi'], ['Z00.0', 'Pemeriksaan kesehatan umum'], ['Z34.9', 'Pengawasan kehamilan normal'], ['Z48.0', 'Perawatan balutan dan jahitan'],
];
const icdName = Object.fromEntries(icd10);

// Clinical templates per poli: [icd, s, o-extra, p, meds(id, dose, freq, days, instruction), procedures]
type RxT = [string, string, string, number, string];
type Cond = { icd: string; s: string; o: string; p: string; rx: RxT[]; proc: string[] };
const C = (icd: string, s: string, o: string, p: string, rx: RxT[], proc: string[] = []): Cond => ({ icd, s, o, p, rx, proc });
const conds: Record<string, Cond[]> = {
  'POL-A': [
    C('I10', 'Pusing dan tengkuk terasa berat sejak 3 hari. Riwayat hipertensi, kontrol rutin.', 'Kesadaran compos mentis, jantung dan paru dalam batas normal.', 'Lanjutkan antihipertensi, diet rendah garam, kontrol 1 bulan.', [['M004', '5 mg', '1x1', 30, 'Sesudah makan']], ['PRC-EKG']),
    C('E11.9', 'Sering haus dan buang air kecil malam hari. Riwayat DM tipe 2.', 'Akral hangat, tidak ada luka di kaki.', 'Metformin dilanjutkan, edukasi diet DM, cek HbA1c.', [['M011', '500 mg', '2x1', 30, 'Sesudah makan']], ['PRC-GDS', 'PRC-HBA1C']),
    C('K29.7', 'Nyeri ulu hati, mual, kembung sejak 1 minggu, memberat saat telat makan.', 'Nyeri tekan epigastrium (+).', 'PPI dan antasida, makan teratur, hindari makanan pedas.', [['M024', '30 mg', '1x1', 7, 'Sebelum makan'], ['M026', '1 tablet', '3x1', 5, 'Dikunyah sebelum makan']]),
    C('A01.0', 'Demam naik turun 6 hari, lebih tinggi sore hari, lidah terasa pahit.', 'Lidah kotor, nyeri tekan perut kanan bawah ringan.', 'Antibiotik, tirah baring, diet lunak.', [['M031', '500 mg', '2x1', 7, 'Sesudah makan'], ['M001', '500 mg', '3x1', 5, 'Bila demam']], ['PRC-DL']),
    C('E78.5', 'Kontrol hasil lab kolesterol tinggi, tidak ada keluhan.', 'Status gizi lebih.', 'Statin malam hari, olahraga teratur.', [['M013', '20 mg', '1x1', 30, 'Malam hari']], ['PRC-KOL']),
    C('M10.9', 'Nyeri dan bengkak jempol kaki kanan sejak semalam.', 'MTP I dextra hiperemis, nyeri tekan (+).', 'Antiinflamasi dan kolkisin, kurangi jeroan.', [['M050', '0,5 mg', '2x1', 5, 'Sesudah makan'], ['M049', '100 mg', '1x1', 30, 'Sesudah makan']], ['PRC-AU']),
  ],
  'POL-B': [
    C('J06.9', 'Anak batuk pilek 3 hari, demam ringan, nafsu makan menurun.', 'Faring hiperemis ringan, paru vesikuler tanpa ronki.', 'Simtomatik, banyak minum, kontrol bila demam > 3 hari.', [['M063', '5 mL', '3x1', 5, 'Bila demam'], ['M065', '2,5 mL', '3x1', 5, 'Sesudah makan']]),
    C('A09', 'BAB cair 5 kali sejak kemarin, tanpa darah, masih mau minum.', 'Turgor kulit baik, mata tidak cekung.', 'Oralit dan zinc 10 hari, ASI/makan dilanjutkan.', [['M082', '1 sachet', '3x1', 3, 'Setiap habis BAB'], ['M069', '5 mL', '1x1', 10, 'Sesudah makan']]),
    C('J45.9', 'Sesak dan mengi kambuh setelah terpapar debu.', 'Wheezing ekspirasi (+) minimal.', 'Nebulizer, bronkodilator oral.', [['M066', '2,5 mL', '3x1', 5, 'Sesudah makan']], ['PRC-NEBU']),
    C('R50.9', 'Demam 2 hari, tidak ada batuk pilek.', 'Suhu 38,2°C, tidak ada tanda dehidrasi.', 'Antipiretik, observasi tanda bahaya, cek darah bila demam > 3 hari.', [['M063', '5 mL', '3x1', 3, 'Bila demam']], ['PRC-DL']),
  ],
  'POL-C': [
    C('Z34.9', 'Kontrol kehamilan rutin, gerak janin aktif.', 'TFU sesuai usia kehamilan, DJJ 142x/menit.', 'Vitamin kehamilan, kontrol 4 minggu.', [['M046', '1 mg', '1x1', 30, 'Sesudah makan'], ['M047', '300 mg', '1x1', 30, 'Malam hari']], ['PRC-USG-OBS']),
    C('N94.6', 'Nyeri perut bawah saat menstruasi hari pertama.', 'Abdomen supel, nyeri tekan suprapubik ringan.', 'Analgetik saat nyeri, kompres hangat.', [['M015', '500 mg', '3x1', 3, 'Sesudah makan']]),
    C('O21.0', 'Mual muntah setiap pagi, usia kehamilan 9 minggu.', 'Dehidrasi ringan tidak ada.', 'Antiemetik, makan porsi kecil sering.', [['M028', '4 mg', '2x1', 5, 'Sebelum makan'], ['M046', '1 mg', '1x1', 30, 'Sesudah makan']], ['PRC-USG-OBS']),
  ],
  'POL-D': [
    C('L02.9', 'Benjolan nyeri bernanah di punggung 5 hari.', 'Abses diameter 3 cm, fluktuasi (+).', 'Insisi drainase, antibiotik, rawat luka.', [['M033', '500 mg', '2x1', 5, 'Sesudah makan'], ['M015', '500 mg', '3x1', 3, 'Sesudah makan']], ['PRC-INSISI']),
    C('T14.1', 'Luka robek di telapak tangan terkena pisau 1 jam lalu.', 'Vulnus laceratum 3 cm, perdarahan aktif minimal.', 'Hecting, rawat luka, kontrol 5 hari.', [['M033', '500 mg', '2x1', 5, 'Sesudah makan'], ['M001', '500 mg', '3x1', 3, 'Bila nyeri']], ['PRC-HECT']),
    C('K40.9', 'Benjolan di lipat paha kanan hilang timbul saat mengejan.', 'Benjolan reponibel inguinal dextra.', 'Rencana herniorafi elektif, cek lab pra operasi.', [], ['PRC-DL', 'PRC-THORAX']),
    C('Z48.0', 'Kontrol luka pasca jahit 5 hari.', 'Luka kering, tanda infeksi tidak ada.', 'Aff hecting, ganti balutan.', [], ['PRC-BALUT']),
  ],
  'POL-E': [
    C('I11.9', 'Sesak saat aktivitas berat, berdebar kadang-kadang.', 'JVP tidak meningkat, ronki basah tidak ada.', 'Optimalisasi obat jantung, batasi garam.', [['M008', '8 mg', '1x1', 30, 'Pagi hari'], ['M009', '5 mg', '1x1', 30, 'Pagi hari']], ['PRC-EKG']),
    C('I20.9', 'Nyeri dada kiri seperti tertekan saat jalan cepat, hilang dengan istirahat.', 'Bunyi jantung reguler, murmur tidak ada.', 'Antiplatelet, nitrat, statin; rencana treadmill.', [['M052', '80 mg', '1x1', 30, 'Sesudah makan'], ['M053', '5 mg', '3x1', 30, 'Sesudah makan'], ['M014', '20 mg', '1x1', 30, 'Malam hari']], ['PRC-EKG']),
    C('I50.9', 'Kaki bengkak dan cepat lelah sejak 2 minggu.', 'Edema pretibial (+/+).', 'Diuretik, timbang berat badan harian.', [['M010', '40 mg', '1x1', 14, 'Pagi hari']], ['PRC-EKG', 'PRC-THORAX']),
  ],
  'POL-F': [
    C('G44.2', 'Nyeri kepala seperti diikat, terutama saat stres kerja.', 'Pemeriksaan neurologis dalam batas normal.', 'Analgetik, manajemen stres, tidur cukup.', [['M001', '500 mg', '3x1', 5, 'Bila nyeri'], ['M059', '25 mg', '1x1', 14, 'Malam hari']]),
    C('H81.1', 'Pusing berputar saat menoleh atau bangun tidur.', 'Dix-Hallpike (+) kanan.', 'Manuver Epley, betahistin.', [['M060', '6 mg', '3x1', 7, 'Sesudah makan']]),
    C('M54.5', 'Nyeri pinggang menjalar ke tungkai kiri sejak 2 minggu.', 'Laseque (+) 60° kiri.', 'Analgetik, neurotropik, fisioterapi.', [['M018', '15 mg', '1x1', 7, 'Sesudah makan'], ['M062', '500 mcg', '3x1', 14, 'Sesudah makan']]),
    C('I69.4', 'Kontrol pasca stroke, kelemahan tangan kanan membaik.', 'Hemiparesis dextra 4/5.', 'Lanjut antiplatelet, rehabilitasi medik.', [['M051', '75 mg', '1x1', 30, 'Sesudah makan']]),
  ],
  'POL-G': [
    C('K02.9', 'Gigi geraham kiri bawah berlubang, ngilu saat minum dingin.', 'Karies media gigi 36.', 'Penambalan komposit.', [], ['PRC-TAMBAL']),
    C('K04.0', 'Sakit gigi berdenyut sejak 2 hari, sulit tidur.', 'Karies profunda gigi 46, perkusi (+).', 'Ekstraksi, analgetik.', [['M015', '500 mg', '3x1', 3, 'Sesudah makan'], ['M003', '500 mg', '3x1', 5, 'Sesudah makan']], ['PRC-CABUT']),
    C('K05.1', 'Gusi mudah berdarah saat sikat gigi.', 'Kalkulus supragingiva (+).', 'Scaling, edukasi kebersihan mulut.', [], ['PRC-SCALING']),
  ],
  'POL-H': [
    C('H10.9', 'Mata merah berair dan gatal sejak 2 hari.', 'Injeksi konjungtiva (+), sekret serous.', 'Tetes mata antibiotik, jaga kebersihan tangan.', [['M079', '1 tetes', '4x1', 5, 'Teteskan pada mata yang sakit']], ['PRC-VISUS']),
    C('H52.1', 'Pandangan jauh kabur, sering menyipitkan mata.', 'Visus ODS 6/18, koreksi S-1.50 menjadi 6/6.', 'Resep kacamata.', [], ['PRC-VISUS']),
    C('H25.9', 'Penglihatan berkabut perlahan sejak 1 tahun.', 'Lensa keruh ODS, visus 6/30.', 'Rencana operasi katarak, cek lab pra operasi.', [['M081', '1 tetes', '4x1', 30, 'Teteskan pada kedua mata']], ['PRC-VISUS', 'PRC-GDS']),
  ],
  'POL-I': [
    C('J03.9', 'Nyeri menelan dan demam sejak 3 hari.', 'Tonsil T3-T3 hiperemis, detritus (+).', 'Antibiotik, analgetik, kumur air garam.', [['M034', '100 mg', '2x1', 5, 'Sesudah makan'], ['M001', '500 mg', '3x1', 3, 'Bila demam']]),
    C('H61.2', 'Telinga kanan terasa penuh dan pendengaran berkurang.', 'Serumen obturans AD.', 'Ekstraksi serumen.', [], ['PRC-SERUMEN']),
    C('J30.4', 'Bersin-bersin dan hidung meler setiap pagi.', 'Konka edema pucat.', 'Antihistamin, hindari alergen.', [['M019', '10 mg', '1x1', 14, 'Malam hari']]),
    C('J01.9', 'Hidung tersumbat, nyeri pipi, ingus kental kuning.', 'Nyeri tekan sinus maksila (+).', 'Antibiotik, dekongestan, cuci hidung.', [['M003', '500 mg', '3x1', 7, 'Sesudah makan'], ['M039', '4 mg', '2x1', 5, 'Sesudah makan']]),
  ],
  'POL-J': [
    C('M17.9', 'Nyeri lutut kanan saat naik tangga.', 'Krepitasi (+), ROM terbatas ringan.', 'Fisioterapi 2x/minggu, latihan penguatan.', [['M017', '50 mg', '2x1', 7, 'Sesudah makan']], ['PRC-FISIO']),
    C('M75.0', 'Bahu kiri kaku dan nyeri saat mengangkat tangan.', 'ROM bahu terbatas semua arah.', 'Fisioterapi, latihan pendulum.', [], ['PRC-FISIO']),
    C('M54.5', 'Nyeri punggung bawah setelah mengangkat beban.', 'Spasme otot paravertebra.', 'Fisioterapi, koreksi postur.', [['M017', '50 mg', '2x1', 5, 'Sesudah makan']], ['PRC-FISIO']),
  ],
  'POL-IGD': [
    C('A09', 'Muntah dan BAB cair lebih dari 8 kali sejak pagi, lemas.', 'Dehidrasi sedang, mukosa kering.', 'Rehidrasi IV, antiemetik, observasi.', [['M028', '4 mg', '3x1', 3, 'Sebelum makan'], ['M082', '1 sachet', '3x1', 3, 'Setiap habis BAB']], ['PRC-INFUS', 'PRC-INJ']),
    C('S61.9', 'Jari tangan terluka terkena mesin potong.', 'Vulnus laceratum 2 cm digiti II.', 'Hecting, rawat luka, ATS.', [['M001', '500 mg', '3x1', 3, 'Bila nyeri']], ['PRC-HECT', 'PRC-INJ']),
    C('J45.9', 'Sesak napas berat sejak 1 jam, riwayat asma.', 'Wheezing (+/+), SpO2 92%.', 'Nebulizer, oksigen, steroid.', [['M041', '2 mg', '3x1', 5, 'Sesudah makan'], ['M039', '4 mg', '3x1', 3, 'Sesudah makan']], ['PRC-NEBU', 'PRC-O2']),
    C('R10.4', 'Nyeri perut hebat ulu hati sejak 3 jam.', 'Nyeri tekan epigastrium, defans (-).', 'Injeksi PPI, analgetik, observasi.', [['M024', '30 mg', '1x1', 5, 'Sebelum makan']], ['PRC-INJ', 'PRC-TTV']),
  ],
};

// ---------- patients ----------
const maleFirst = ['Asep', 'Dadang', 'Ujang', 'Cecep', 'Dede', 'Agus', 'Budi', 'Rudi', 'Hendra', 'Iwan', 'Yayan', 'Endang', 'Deden', 'Wawan', 'Rizky', 'Fajar', 'Dimas', 'Galih', 'Ilham', 'Teguh', 'Yusuf', 'Bayu', 'Rahmat', 'Dani', 'Ikhsan'];
const femaleFirst = ['Siti', 'Euis', 'Neneng', 'Lilis', 'Imas', 'Yuyun', 'Rina', 'Dewi', 'Rani', 'Nurul', 'Wulan', 'Intan', 'Ayu', 'Putri', 'Fitri', 'Lina', 'Tati', 'Elis', 'Dian', 'Nia', 'Sri', 'Yanti', 'Mega', 'Nisa', 'Ratih'];
const lastNames = ['Suryana', 'Hidayat', 'Kusnadi', 'Sudrajat', 'Permana', 'Saputra', 'Ramdani', 'Setiawan', 'Gunawan', 'Nugraha', 'Rahayu', 'Lestari', 'Kurniawati', 'Maryati', 'Sumarni', 'Hermawan', 'Firmansyah', 'Supriatna', 'Wijaya', 'Hasanah', 'Komalasari', 'Mulyana', 'Sobari', 'Juhana', 'Purnama'];
const areas = [
  { district: 'Cimahi Utara', villages: ['Cibabat', 'Citeureup', 'Cipageran', 'Pasirkaliki'], city: 'Kota Cimahi', postal: '40511', code: '03' },
  { district: 'Cimahi Tengah', villages: ['Baros', 'Cigugur Tengah', 'Karangmekar', 'Setiamanah', 'Padasuka', 'Cimahi'], city: 'Kota Cimahi', postal: '40521', code: '02' },
  { district: 'Cimahi Selatan', villages: ['Leuwigajah', 'Melong', 'Utama', 'Cibeber', 'Cibeureum'], city: 'Kota Cimahi', postal: '40531', code: '01' },
  { district: 'Padalarang', villages: ['Kertajaya', 'Padalarang', 'Laksanamekar', 'Jayamekar'], city: 'Kabupaten Bandung Barat', postal: '40553', code: '04' },
  { district: 'Batujajar', villages: ['Batujajar Barat', 'Batujajar Timur', 'Galanggang', 'Selacau'], city: 'Kabupaten Bandung Barat', postal: '40561', code: '05' },
];
const streets = ['Jl. Amir Machmud', 'Jl. Gatot Subroto', 'Jl. Kolonel Masturi', 'Jl. Sriwijaya', 'Jl. Encep Kartawiria', 'Jl. Baros', 'Jl. Jend. Sudirman', 'Jl. Pesantren', 'Jl. Cihanjuang', 'Jl. Melong Raya', 'Jl. Raya Padalarang', 'Jl. Raya Batujajar', 'Gg. Mawar', 'Komp. Pemda'];
const occupations = ['Karyawan Swasta', 'Wiraswasta', 'PNS', 'TNI', 'Guru', 'Ibu Rumah Tangga', 'Pelajar', 'Mahasiswa', 'Buruh', 'Pedagang', 'Pensiunan', 'Petani', 'Belum Bekerja'];
const religions = ['Islam', 'Islam', 'Islam', 'Islam', 'Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha'];
const educations = ['SD', 'SMP', 'SMA/SMK', 'D3', 'S1', 'S2'];
const allergyPool = ['Penisilin', 'NSAID', 'Sulfa', 'Seafood', 'Debu', 'Kacang'];
const histories = ['', '', '', 'Hipertensi sejak 5 tahun', 'Diabetes melitus tipe 2', 'Asma sejak kecil', 'Riwayat gastritis', 'Kolesterol tinggi', 'Riwayat operasi usus buntu (2019)'];

const patients: any[] = [];
for (let i = 0; i < 60; i++) {
  const gender = chance(0.5) ? 'L' : 'P';
  const first = pick(gender === 'L' ? maleFirst : femaleFirst);
  const last = pick(lastNames);
  const name = chance(0.25) ? first : `${first} ${last}`;
  const pediatric = i % 9 === 4;
  const year = pediatric ? int(2015, 2023) : int(1950, 2004);
  const month = int(1, 12);
  const day = int(1, 28);
  const area = pick(areas);
  const nikDay = gender === 'P' ? day + 40 : day;
  const nik = `3277${area.code}${pad(nikDay, 2)}${pad(month, 2)}${String(year).slice(2)}${pad(int(1, 9999), 4)}`;
  const r = rnd();
  const payerType = r < 0.45 ? 'BPJS' : r < 0.8 ? 'UMUM' : 'ASURANSI';
  const payer: any = { type: payerType };
  if (payerType === 'BPJS') Object.assign(payer, { insurerId: 'INS-BPJS', memberNo: `000${pad(int(1, 9999999999), 10)}`, class: pick([1, 2, 3, 3]) });
  if (payerType === 'ASURANSI') Object.assign(payer, { insurerId: pick(['INS-SS', 'INS-PM', 'INS-MP']), memberNo: `POL-${pad(int(100000, 999999), 6)}` });
  if (payerType === 'UMUM') payer.insurerId = 'INS-UMUM';
  const allergies = chance(0.18) ? pickSome(allergyPool, int(1, 2)) : [];
  if (i === 2) allergies.splice(0, allergies.length, 'Penisilin');
  const created = -int(70, 900);
  patients.push({
    id: `P-${pad(i + 1, 4)}`,
    mrn: `RM-${pad(101 + i, 6)}`,
    nik,
    kk: `3277${area.code}${pad(int(1, 99999999), 8)}${pad(int(10, 99), 2)}`,
    name,
    gender,
    birthPlace: pick(['Cimahi', 'Cimahi', 'Bandung', 'Garut', 'Sumedang', 'Tasikmalaya', 'Cianjur']),
    birthDate: `${year}-${pad(month, 2)}-${pad(day, 2)}`,
    bloodType: pick(['A', 'B', 'AB', 'O', 'O', '-']),
    religion: pick(religions),
    maritalStatus: pediatric || year > 2000 ? 'Belum Kawin' : pick(['Kawin', 'Kawin', 'Kawin', 'Cerai Mati']),
    education: pediatric ? 'Belum Sekolah' : pick(educations),
    occupation: pediatric ? 'Pelajar' : pick(occupations),
    nationality: 'WNI',
    phone: `08${pick(['12', '13', '21', '22', '52', '57', '77', '81', '95'])}${pad(int(10000000, 99999999), 8)}`,
    email: chance(0.4) ? `${first.toLowerCase()}.${last.toLowerCase()}${int(1, 99)}@contoh.id` : undefined,
    address: {
      street: `${pick(streets)} No. ${int(1, 220)}`,
      rt: pad(int(1, 12), 3),
      rw: pad(int(1, 20), 3),
      village: pick(area.villages),
      district: area.district,
      city: area.city,
      province: 'Jawa Barat',
      postalCode: area.postal,
    },
    payer,
    emergencyContact: { name: `${pick(gender === 'L' ? femaleFirst : maleFirst)} ${last}`, relation: pick(['Suami', 'Istri', 'Anak', 'Orang Tua', 'Saudara']), phone: `08${pad(int(1000000000, 9999999999), 10)}` },
    allergies,
    medicalHistory: pick(histories),
    notes: '',
    createdAt: dt(created, int(8, 15), int(0, 59)),
    updatedAt: dt(created, int(8, 15), int(0, 59)),
  });
}

// ---------- transactions ----------
const visits: any[] = [];
const medicalRecords: any[] = [];
const procedureActions: any[] = [];
const prescriptions: any[] = [];
const invoices: any[] = [];
const payments: any[] = [];
const auditLog: any[] = [];

const counters: Record<string, number> = {};
const nextNo = (prefix: string, day: number, width = 4) => {
  const k = `${prefix}${day}`;
  counters[k] = (counters[k] ?? 0) + 1;
  return `${prefix}-${yymmdd(day)}-${pad(counters[k], width)}`;
};
const queueCounters: Record<string, number> = {};
const nextQueue = (poliId: string, day: number) => {
  const k = `${poliId}${day}`;
  queueCounters[k] = (queueCounters[k] ?? 0) + 1;
  const prefix = polis.find((p) => p.id === poliId)!.queuePrefix;
  return `${prefix}-${pad(queueCounters[k], 3)}`;
};
const coverage = (payer: any, amount: number) => {
  if (payer.type === 'BPJS') return amount;
  if (payer.type === 'ASURANSI') return Math.round((amount * (insurers.find((x) => x.id === payer.insurerId)?.coveragePct ?? 0)) / 100);
  return 0;
};
const doctorsOf = (poliId: string) => doctors.filter((x) => x.poliId === poliId);
const poliWeights: [string, number][] = [['POL-A', 22], ['POL-B', 12], ['POL-C', 8], ['POL-D', 7], ['POL-E', 9], ['POL-F', 7], ['POL-G', 8], ['POL-H', 7], ['POL-I', 7], ['POL-J', 5], ['POL-IGD', 8]];
const weightedPoli = () => {
  const total = poliWeights.reduce((a, [, w]) => a + w, 0);
  let r = rnd() * total;
  for (const [p, w] of poliWeights) if ((r -= w) < 0) return p;
  return 'POL-A';
};
let vSeq = 0, itemSeq = 0;
const iid = () => `II-${pad(++itemSeq, 6)}`;

function vitalsFor(age: number, h: number, m: number, day: number, cond: Cond) {
  const height = age < 14 ? int(95, 155) : int(150, 178);
  const weight = age < 14 ? int(14, 45) : int(45, 88);
  const hyper = cond.icd.startsWith('I1') || cond.icd.startsWith('I2');
  return {
    sys: hyper ? int(140, 168) : int(105, 132),
    dia: hyper ? int(88, 100) : int(68, 84),
    pulse: int(68, 98),
    temp: cond.icd === 'A01.0' || cond.icd === 'R50.9' || cond.icd === 'J03.9' ? +(38 + rnd()).toFixed(1) : +(36.3 + rnd() * 0.8).toFixed(1),
    rr: int(16, 22),
    spo2: int(96, 99),
    weight,
    height,
    bmi: +(weight / (height / 100) ** 2).toFixed(1),
    pain: int(0, 5),
    chiefComplaint: cond.s.split(',')[0].split('.')[0],
    recordedBy: 'U-PERAWAT',
    recordedAt: dt(day, h, m + 5 > 59 ? 59 : m + 5),
  };
}

type Stage = 'MENUNGGU' | 'DIPANGGIL' | 'DIPERIKSA_TTV' | 'DIPERIKSA_SOAP' | 'FARMASI_BARU' | 'FARMASI_DITELAAH' | 'FARMASI_SIAP' | 'KASIR' | 'SELESAI' | 'BATAL';

function makeVisit(day: number, patient: any, poliId: string, h: number, m: number, stage: Stage, opts: { condIdx?: number; source?: string } = {}) {
  vSeq++;
  const vid = `V-${pad(vSeq, 5)}`;
  const doctor = poliId === 'POL-A' && day === 0 ? doctors[0] : pick(doctorsOf(poliId));
  const isIgd = poliId === 'POL-IGD';
  const age = 2026 - Number(patient.birthDate.slice(0, 4));
  const poliConds = conds[poliId];
  const cond = poliConds[opts.condIdx ?? Math.floor(rnd() * poliConds.length)];
  const payer = { ...patient.payer };
  const at = (mm: number) => dt(day, h + Math.floor((m + mm) / 60), (m + mm) % 60);
  const visit: any = {
    id: vid,
    regNo: nextNo('REG', day),
    patientId: patient.id,
    poliId,
    doctorId: doctor.id,
    type: isIgd ? 'IGD' : 'RAJAL',
    source: opts.source ?? (isIgd ? 'WALKIN' : chance(0.15) ? 'RUJUKAN' : 'WALKIN'),
    payer,
    queueNo: nextQueue(poliId, day),
    status: 'MENUNGGU',
    registeredAt: at(0),
  };
  if (visit.source === 'RUJUKAN') visit.referral = { number: `0301${pad(int(1, 99999999), 8)}`, origin: pick(['Puskesmas Cimahi Tengah', 'Puskesmas Melong Asih', 'Klinik Pratama Sehat Cibabat', 'Puskesmas Padalarang']) };
  if (payer.type === 'BPJS') visit.sepNo = `0301R001${pad(int(1, 99999999999), 11)}`;
  visits.push(visit);

  // invoice draft
  const items: any[] = [];
  const addItem = (category: string, name: string, qty: number, price: number, refId?: string) =>
    items.push({ id: iid(), category, name, qty, price, coveredByPayer: coverage(payer, qty * price), refId });
  const adm = procById[isIgd ? 'PRC-ADM-IGD' : 'PRC-ADM'];
  addItem('ADMIN', adm.name, 1, adm.priceUmum, adm.id);
  const kon = procById[isIgd ? 'PRC-KON-IGD' : doctor.name.startsWith('drg.') ? 'PRC-KON-GI' : doctor.specialty.startsWith('Spesialis') ? 'PRC-KON-SP' : 'PRC-KON-UM'];
  addItem('DOKTER', `${kon.name} - ${doctor.name}`, 1, kon.priceUmum, kon.id);
  const invoice: any = { id: `INV-${vid}`, invoiceNo: nextNo('INV', day), visitId: vid, patientId: patient.id, items, status: 'DRAFT', createdAt: at(0) };
  invoices.push(invoice);

  if (day === 0) auditLog.push({ id: `AU-${vid}`, at: at(0), userId: 'U-ADMIN', role: 'ADMIN', action: 'Mendaftarkan kunjungan', entity: 'Kunjungan', entityId: visit.regNo, detail: `${patient.name} ke ${polis.find((p) => p.id === poliId)!.name} (${visit.queueNo})` });

  if (stage === 'BATAL') {
    visit.status = 'BATAL';
    visit.cancelReason = 'Pasien membatalkan karena ada keperluan mendadak';
    invoice.status = 'BATAL';
    invoice.cancelReason = 'Kunjungan dibatalkan';
    return visit;
  }
  if (stage === 'MENUNGGU') return visit;
  visit.calledAt = at(12);
  visit.status = 'DIPANGGIL';
  if (stage === 'DIPANGGIL') return visit;
  visit.status = 'DIPERIKSA';
  visit.examStartedAt = at(15);

  const mr: any = {
    id: `MR-${vid}`,
    visitId: vid,
    patientId: patient.id,
    doctorId: doctor.id,
    vitals: vitalsFor(age, h, m, day, cond),
    soap: { s: '', o: '', a: '', p: '' },
    diagnoses: [],
    procedures: [],
    status: 'DRAFT',
    addenda: [],
    updatedAt: at(16),
  };
  medicalRecords.push(mr);
  if (stage === 'DIPERIKSA_TTV') return visit;
  const v = mr.vitals;
  mr.soap = {
    s: cond.s,
    o: `TD ${v.sys}/${v.dia} mmHg, N ${v.pulse}x/mnt, S ${v.temp}°C, RR ${v.rr}x/mnt, SpO2 ${v.spo2}%. ${cond.o}`,
    a: `${icdName[cond.icd]} (${cond.icd})`,
    p: cond.p,
  };
  mr.diagnoses = [{ code: cond.icd, name: icdName[cond.icd], type: 'PRIMER' }];
  if (chance(0.15) && patient.medicalHistory?.includes('Hipertensi') && cond.icd !== 'I10') mr.diagnoses.push({ code: 'I10', name: icdName['I10'], type: 'SEKUNDER' });
  for (const pid of cond.proc) {
    if (!chance(0.8) && day !== 0) continue;
    const pm = procById[pid];
    const paId = `PA-${vid}-${pid}`;
    procedureActions.push({ id: paId, visitId: vid, procedureId: pid, qty: 1, performerId: doctor.id, price: pm.priceUmum, at: at(25) });
    mr.procedures.push(paId);
    addItem('TINDAKAN', pm.name, 1, pm.priceUmum, paId);
  }
  if (stage === 'DIPERIKSA_SOAP') {
    mr.diagnoses = [];
    mr.soap.a = '';
    mr.soap.p = '';
    return visit;
  }
  mr.status = 'FINAL';
  mr.signedAt = at(30);
  mr.signedBy = doctor.id;
  if (cond.icd === 'I10' || cond.icd === 'E11.9') mr.followUp = { type: 'KONTROL', date: d(day + 30), note: 'Kontrol rutin 1 bulan' };
  else mr.followUp = { type: 'PULANG' };

  const hasRx = cond.rx.length > 0;
  let rx: any;
  if (hasRx) {
    rx = {
      id: `RX-${vid}`,
      rxNo: nextNo('RX', day),
      visitId: vid,
      patientId: patient.id,
      doctorId: doctor.id,
      items: cond.rx.map(([medicineId, dose, frequency, durationDays, instruction]) => {
        const perDay = Number(frequency.split('x')[0]) || 1;
        const med = medById[medicineId];
        const qty = ['SIRUP', 'SALEP', 'TETES'].includes(med.form) ? 1 : med.unit === 'sachet' ? perDay * durationDays : perDay * durationDays;
        return { medicineId, dose, frequency, route: med.form === 'TETES' || med.form === 'SALEP' ? 'Topikal' : 'Oral', durationDays, qty, instruction };
      }),
      status: 'BARU',
      createdAt: at(30),
      updatedAt: at(30),
    };
    prescriptions.push(rx);
    mr.prescriptionId = rx.id;
    visit.status = 'FARMASI';
  } else {
    visit.status = 'KASIR';
  }
  const addMeds = () => {
    for (const it of rx.items) {
      it.qtyGiven = it.qty;
      const med = medById[it.medicineId];
      addItem('OBAT', med.name, it.qty, med.sellPrice, rx.id);
    }
  };
  if (hasRx) {
    if (stage === 'FARMASI_BARU') return visit;
    rx.review = { admin: true, pharmaceutical: true, clinical: true };
    rx.status = 'DITELAAH';
    rx.updatedAt = at(40);
    if (stage === 'FARMASI_DITELAAH') return visit;
    addMeds();
    rx.status = 'SIAP';
    if (stage === 'FARMASI_SIAP') return visit;
    rx.status = 'DISERAHKAN';
    rx.receivedBy = patient.name;
    visit.status = 'KASIR';
  }
  invoice.status = 'BELUM_BAYAR';
  if (stage === 'KASIR') return visit;

  // paid
  const subtotal = items.reduce((a, it) => a + it.qty * it.price, 0);
  const covered = items.reduce((a, it) => a + it.coveredByPayer, 0);
  const due = subtotal - covered;
  const method = due === 0 ? null : pick(['TUNAI', 'TUNAI', 'TUNAI', 'DEBIT', 'QRIS', 'QRIS', 'KREDIT', 'TRANSFER']);
  const payAt = at(55);
  const pay: any = {
    id: `PAY-${vid}`,
    invoiceId: invoice.id,
    receiptNo: nextNo('KW', day),
    methods: method ? [{ type: method, amount: due, ...(method === 'DEBIT' || method === 'KREDIT' ? { bank: pick(['BRI', 'BNI', 'Mandiri', 'BCA', 'BJB']), ref: `${int(100000, 999999)}` } : {}), ...(method === 'QRIS' ? { ref: `QR${int(10000000, 99999999)}` } : {}) }] : [],
    cashierId: 'U-KASIR',
    at: payAt,
  };
  if (method === 'TUNAI') {
    const received = Math.ceil(due / 50000) * 50000;
    pay.cashReceived = received;
    pay.change = received - due;
  }
  if (!method) pay.note = 'Ditanggung penuh oleh penjamin';
  payments.push(pay);
  invoice.status = 'LUNAS';
  visit.status = 'SELESAI';
  visit.finishedAt = payAt;
  return visit;
}

// history: ~400 visits over the last 60 days
for (let day = -60; day <= -1; day++) {
  const weekday = ((day % 7) + 7) % 7; // relative; real weekday is unknown at generation time
  const n = weekday === 0 ? int(2, 4) : int(5, 9);
  const times = Array.from({ length: n }, () => [int(7, 14), int(0, 59)] as [number, number]).sort((a, b) => a[0] * 60 + a[1] - (b[0] * 60 + b[1]));
  for (const [h, m] of times) makeVisit(day, pick(patients), weightedPoli(), h, m, 'SELESAI');
}

// today: 15 visits with varied status so every worklist has content
const todayPlan: [string, Stage, number?][] = [
  ['POL-A', 'SELESAI', 0],
  ['POL-IGD', 'SELESAI'],
  ['POL-A', 'KASIR', 2],
  ['POL-A', 'FARMASI_SIAP', 0],
  ['POL-D', 'KASIR', 2],
  ['POL-B', 'FARMASI_DITELAAH', 0],
  ['POL-A', 'FARMASI_BARU', 1],
  ['POL-C', 'BATAL'],
  ['POL-E', 'DIPERIKSA_TTV', 0],
  ['POL-A', 'DIPERIKSA_SOAP', 3],
  ['POL-A', 'DIPANGGIL'],
  ['POL-A', 'MENUNGGU'],
  ['POL-B', 'MENUNGGU'],
  ['POL-A', 'MENUNGGU'],
  ['POL-E', 'MENUNGGU'],
];
const todayPatients = pickSome(patients, 15);
// make sure the allergy patient appears in a waiting slot (alergi warning demo)
const allergyPatient = patients[2];
if (!todayPatients.includes(allergyPatient)) todayPatients[13] = allergyPatient;
// paid / cashier slots use non-BPJS patients so today's revenue is visible on the dashboard
for (const slot of [0, 1, 2, 3, 4]) {
  if (todayPatients[slot].payer.type !== 'BPJS') continue;
  const j = todayPatients.findIndex((p, k) => k > 4 && k !== 13 && p.payer.type !== 'BPJS');
  if (j > -1) [todayPatients[slot], todayPatients[j]] = [todayPatients[j], todayPatients[slot]];
}
// two patients registered for the first time today
for (const slot of [11, 14]) {
  todayPatients[slot].createdAt = dt(0, 7, 5 + slot);
  todayPatients[slot].updatedAt = dt(0, 7, 5 + slot);
}
todayPlan.forEach(([poli, stage, condIdx], i) => {
  const minutes = 7 * 60 + i * 6;
  makeVisit(0, todayPatients[i], poli, Math.floor(minutes / 60), minutes % 60, stage, { condIdx, source: i === 12 ? 'BOOKING' : undefined });
});

// online bookings (today & tomorrow)
const bookingNames: [string, 'L' | 'P', string][] = [
  ['Gilang Ramadhan', 'L', '1991-04-12'], ['Nadia Safitri', 'P', '1996-09-02'], ['Hj. Kokom Komariah', 'P', '1958-01-23'], ['Raka Pratama', 'L', '1988-11-30'],
  ['Salsabila Putri', 'P', '2001-06-15'], ['Ade Kurnia', 'L', '1979-03-08'], ['Yati Suryati', 'P', '1969-12-19'],
];
const appointments: any[] = [];
const bookingCounters: Record<string, number> = {};
const bookingPlan: [number, string, string, string][] = [
  [0, 'POL-A', 'D01', '09:30'], [0, 'POL-E', 'D07', '10:00'], [0, 'POL-H', 'D10', '10:30'], [1, 'POL-A', 'D01', '08:30'],
  [1, 'POL-B', 'D03', '09:00'], [1, 'POL-F', 'D08', '11:00'], [1, 'POL-I', 'D11', '14:00'],
];
bookingPlan.forEach(([day, poliId, doctorId, time], i) => {
  bookingCounters[day] = (bookingCounters[day] ?? 0) + 1;
  const [name, gender, birthDate] = bookingNames[i];
  appointments.push({
    id: `APT-${pad(i + 1, 3)}`,
    code: `BK-${yymmdd(day)}-${pad(bookingCounters[day], 3)}`,
    poliId,
    doctorId,
    date: d(day),
    time,
    name,
    gender,
    nik: `3277${pick(['01', '02', '03'])}${pad(Number(birthDate.slice(8)) + (gender === 'P' ? 40 : 0), 2)}${birthDate.slice(5, 7)}${birthDate.slice(2, 4)}${pad(int(1, 9999), 4)}`,
    birthDate,
    phone: `08${pad(int(1000000000, 9999999999), 10)}`,
    payerType: i % 3 === 0 ? 'BPJS' : 'UMUM',
    complaint: pick(['Kontrol tekanan darah', 'Nyeri dada sesekali', 'Mata kabur', 'Anak demam', 'Sakit kepala berulang', 'Telinga berdenging', 'Cek gula darah']),
    status: i === 6 ? 'CANCELLED' : 'BOOKED',
    cancelReason: i === 6 ? 'Dibatalkan pasien via telepon' : undefined,
    createdAt: dt(day - 1, int(8, 20), int(0, 59)),
  });
});
// one booking already checked in (linked to today's BOOKING visit)
const bookedVisit = visits.find((v) => v.source === 'BOOKING' && v.registeredAt.startsWith('@0T'));
if (bookedVisit) {
  const p = patients.find((x) => x.id === bookedVisit.patientId);
  bookingCounters[0]++;
  appointments.push({
    id: 'APT-008', code: `BK-${yymmdd(0)}-${pad(bookingCounters[0], 3)}`, poliId: bookedVisit.poliId, doctorId: bookedVisit.doctorId, date: d(0), time: '07:30',
    name: p.name, gender: p.gender, nik: p.nik, birthDate: p.birthDate, phone: p.phone, payerType: p.payer.type, complaint: 'Kontrol', status: 'CHECKED_IN',
    patientId: p.id, visitId: bookedVisit.id, createdAt: dt(-1, 19, 12),
  });
  bookedVisit.appointmentId = 'APT-008';
}

// ---------- write ----------
const write = (name: string, data: unknown) => writeFileSync(join(OUT, `${name}.json`), JSON.stringify(data));
const strip = (o: unknown) => JSON.parse(JSON.stringify(o));
write('patients', strip(patients));
write('doctors', doctors);
write('polyclinics', polis);
write('schedules', schedules);
write('visits', strip(visits));
write('medical-records', medicalRecords);
write('icd10', icd10.map(([code, name]) => ({ code, name })));
write('procedures', procedureMaster);
write('procedure-actions', procedureActions);
write('medicines', medicines);
write('stock-movements', stockMovements);
write('prescriptions', prescriptions);
write('invoices', invoices);
write('payments', payments);
write('insurers', insurers);
write('users', users);
write('appointments', strip(appointments));
write('audit-log', auditLog);
console.log(`seed: ${patients.length} pasien, ${visits.length} kunjungan, ${prescriptions.length} resep, ${invoices.length} invoice, ${medicines.length} obat, ${procedureMaster.length} tindakan, ${icd10.length} ICD-10`);
