import polisJson from './seed/polyclinics.json';
import doctorsJson from './seed/doctors.json';
import schedulesJson from './seed/schedules.json';
import type { Doctor, Poli, Schedule } from '../lib/types';

export const polis = polisJson as Poli[];
export const doctors = doctorsJson as Doctor[];
export const schedules = schedulesJson as Schedule[];

/** Poliklinik + penunjang shown on the public site. `icon` keys map to lucide icons in components. */
export const services: { slug: string; name: string; icon: string; desc: string; poliId?: string; facilities: string[] }[] = [
  ...polis
    .filter((p) => p.id !== 'POL-IGD')
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      poliId: p.id,
      desc: p.description,
      icon: { 'penyakit-dalam': 'stethoscope', anak: 'baby', kandungan: 'heart', bedah: 'scissors', jantung: 'heartpulse', saraf: 'brain', gigi: 'smile', mata: 'eye', tht: 'ear', 'rehabilitasi-medik': 'accessibility' }[p.slug] ?? 'stethoscope',
      facilities: (
        {
          'penyakit-dalam': ['Konsultasi spesialis', 'Pemeriksaan EKG', 'Edukasi diabetes & hipertensi'],
          anak: ['Imunisasi lengkap', 'Pemantauan tumbuh kembang', 'Ruang tunggu ramah anak'],
          kandungan: ['USG kehamilan', 'Kelas ibu hamil', 'Konsultasi KB'],
          bedah: ['Bedah minor', 'Perawatan luka modern', 'Konsultasi pra-operasi'],
          jantung: ['EKG & treadmill', 'Ekokardiografi', 'Program rehabilitasi jantung'],
          saraf: ['Pemeriksaan neurologis', 'EEG', 'Klinik nyeri kepala'],
          gigi: ['Tambal & cabut', 'Scaling', 'Rontgen panoramik'],
          mata: ['Pemeriksaan visus & refraksi', 'Skrining katarak & glaukoma', 'Resep kacamata'],
          tht: ['Audiometri', 'Ekstraksi serumen', 'Endoskopi THT'],
          'rehabilitasi-medik': ['Fisioterapi', 'Terapi okupasi', 'Rehabilitasi pasca stroke'],
        } as Record<string, string[]>
      )[p.slug] ?? [],
    })),
  { slug: 'laboratorium', name: 'Laboratorium', icon: 'flask', desc: 'Pemeriksaan hematologi, kimia klinik, urinalisa, dan imunologi dengan hasil cepat dan terstandar.', facilities: ['Buka 06.00 - 22.00', 'Hasil daring', 'Paket medical check-up'] },
  { slug: 'radiologi', name: 'Radiologi', icon: 'scan', desc: 'Rontgen digital, USG, dan pemeriksaan pencitraan lain dengan dosis radiasi rendah.', facilities: ['Rontgen digital', 'USG abdomen & kehamilan', 'Rontgen gigi panoramik'] },
];

export const stats = [
  { value: 40, suffix: '+', label: 'Dokter umum & spesialis' },
  { value: 20, suffix: '+', label: 'Poliklinik & layanan penunjang' },
  { value: 24, suffix: '/7', label: 'IGD & farmasi siaga' },
  { value: 100, suffix: 'rb+', label: 'Pasien terlayani setiap tahun' },
];

export const testimonials = [
  { name: 'Ibu Euis S.', role: 'Pasien Poli Penyakit Dalam', rating: 5, text: 'Daftar online lalu datang sesuai jam, tidak perlu antre lama. Dokternya menjelaskan dengan sabar soal tekanan darah saya.' },
  { name: 'Bapak Dadang K.', role: 'Keluarga pasien IGD', rating: 5, text: 'Malam hari ayah saya sesak, di IGD langsung ditangani. Perawatnya sigap dan terus memberi kabar ke keluarga.' },
  { name: 'Rani P.', role: 'Pasien Poli Anak', rating: 5, text: 'Ruang tunggunya nyaman untuk anak. Obat sudah siap saat kami selesai di kasir, prosesnya rapi.' },
];

export const insurerPlaceholders = ['Jaminan Kesehatan Nasional', 'Asuransi Sehat Sentosa', 'Prima Medika Assurance', 'Mitra Proteksi Mandiri', 'Asuransi Korporat', 'Program Perusahaan'];

export const faqs = [
  { q: 'Bagaimana cara mendaftar berobat?', a: 'Anda dapat membuat janji temu online melalui menu "Buat Janji Temu" dan akan mendapat kode booking. Tunjukkan kode tersebut di loket pendaftaran. Pendaftaran langsung di loket juga tersedia setiap hari pukul 07.00 - 20.00.' },
  { q: 'Apakah menerima pasien BPJS Kesehatan?', a: 'Ya. Siapkan kartu BPJS/KTP dan surat rujukan dari fasilitas kesehatan tingkat pertama (kecuali kondisi gawat darurat). Petugas akan menerbitkan SEP saat pendaftaran.' },
  { q: 'Kapan jam besuk pasien rawat inap?', a: 'Jam besuk pukul 11.00 - 13.00 dan 17.00 - 19.00. Maksimal dua pengunjung per pasien dan anak di bawah 12 tahun tidak dianjurkan berkunjung.' },
  { q: 'Apakah tersedia area parkir?', a: 'Tersedia area parkir mobil dan motor di area depan dan samping gedung, serta drop-off khusus IGD yang buka 24 jam.' },
  { q: 'Bagaimana cara mengecek status booking?', a: 'Masukkan kode booking pada kolom "Cek Antrian" di halaman utama atau buka menu Cek Kode Booking di bagian bawah situs.' },
];

export const DAY_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function scheduleSummary(doctorId: string): string {
  const s = schedules.filter((x) => x.doctorId === doctorId).sort((a, b) => a.day - b.day);
  if (!s.length) return '-';
  if (s.length === 7) return `Setiap hari · ${s[0].start.replace(':', '.')}-${s[0].end.replace(':', '.')}`;
  return `${s.map((x) => DAY_SHORT[x.day]).join(', ')} · ${s[0].start.replace(':', '.')}-${s[0].end.replace(':', '.')}`;
}
