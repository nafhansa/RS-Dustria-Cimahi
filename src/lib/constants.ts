import type { InvoiceStatus, PayMethod, ProcedureCategory, Role, RxStatus, VisitStatus } from './types';

export const HOSPITAL = {
  name: 'Rumah Sakit Dustira',
  shortName: 'RS Dustira',
  city: 'Cimahi',
  address: 'Jl. Dr. Dustira No. 1, Baros, Cimahi Tengah, Kota Cimahi, Jawa Barat 40521',
  phone: '(022) 665-0000',
  emergencyPhone: '(022) 665-0119',
  emergencyTel: '+62226650119',
  phoneTel: '+62226650000',
  email: 'informasi@rsdustira-demo.id',
  hours: 'Poliklinik: Senin - Sabtu, 07.00 - 20.00 WIB. IGD & Farmasi: 24 jam',
} as const;

export const SCHEMA_VERSION = '1.0.4';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'info' | 'danger';

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Admin Pendaftaran',
  PERAWAT: 'Perawat',
  DOKTER: 'Dokter',
  APOTEKER: 'Apoteker',
  KASIR: 'Kasir',
  SUPERADMIN: 'Super Admin',
};

export const ROLE_DESC: Record<Role, string> = {
  ADMIN: 'Data pasien, pendaftaran, antrian, janji temu',
  PERAWAT: 'Antrian poli, triase, tanda vital',
  DOKTER: 'Rekam medis SOAP, diagnosa, tindakan, e-resep',
  APOTEKER: 'Resep masuk, dispensing, stok obat',
  KASIR: 'Tagihan, pembayaran, kwitansi, rekap kas',
  SUPERADMIN: 'Semua modul, master data, laporan, pengaturan',
};

export const ROLE_USER: Record<Role, string> = {
  ADMIN: 'U-ADMIN',
  PERAWAT: 'U-PERAWAT',
  DOKTER: 'U-DOKTER',
  APOTEKER: 'U-APOTEKER',
  KASIR: 'U-KASIR',
  SUPERADMIN: 'U-SUPER',
};

export const VISIT_STATUS: Record<VisitStatus, { label: string; tone: Tone }> = {
  TERDAFTAR: { label: 'Terdaftar', tone: 'neutral' },
  MENUNGGU: { label: 'Menunggu', tone: 'warning' },
  DIPANGGIL: { label: 'Dipanggil', tone: 'info' },
  DIPERIKSA: { label: 'Diperiksa', tone: 'info' },
  FARMASI: { label: 'Farmasi', tone: 'primary' },
  KASIR: { label: 'Kasir', tone: 'primary' },
  SELESAI: { label: 'Selesai', tone: 'success' },
  BATAL: { label: 'Batal', tone: 'danger' },
};

export const RX_STATUS: Record<RxStatus, { label: string; tone: Tone }> = {
  BARU: { label: 'Baru', tone: 'warning' },
  DITELAAH: { label: 'Ditelaah', tone: 'info' },
  DISIAPKAN: { label: 'Disiapkan', tone: 'info' },
  SIAP: { label: 'Siap Diserahkan', tone: 'primary' },
  DISERAHKAN: { label: 'Diserahkan', tone: 'success' },
  BATAL: { label: 'Batal', tone: 'danger' },
};

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: 'Draft (berjalan)', tone: 'neutral' },
  BELUM_BAYAR: { label: 'Belum Dibayar', tone: 'warning' },
  SEBAGIAN: { label: 'Sebagian', tone: 'info' },
  LUNAS: { label: 'Lunas', tone: 'success' },
  BATAL: { label: 'Batal', tone: 'danger' },
};

export const APPT_STATUS = {
  BOOKED: { label: 'Terjadwal', tone: 'info' },
  CHECKED_IN: { label: 'Sudah Check-in', tone: 'success' },
  CANCELLED: { label: 'Dibatalkan', tone: 'danger' },
} as const satisfies Record<string, { label: string; tone: Tone }>;

export const PAYER_LABEL = { UMUM: 'Umum', BPJS: 'BPJS', ASURANSI: 'Asuransi' } as const;
export const PAYER_TONE: Record<string, Tone> = { UMUM: 'neutral', BPJS: 'success', ASURANSI: 'info' };

export const PAY_METHOD_LABEL: Record<PayMethod, string> = {
  TUNAI: 'Tunai',
  DEBIT: 'Kartu Debit',
  KREDIT: 'Kartu Kredit',
  QRIS: 'QRIS',
  TRANSFER: 'Transfer Bank',
};

export const PROC_CATEGORY_LABEL: Record<ProcedureCategory, string> = {
  ADMIN: 'Administrasi',
  KONSULTASI: 'Konsultasi',
  MEDIS: 'Tindakan Medis',
  LAB: 'Laboratorium',
  RADIOLOGI: 'Radiologi',
  KEPERAWATAN: 'Keperawatan',
};

export const INVOICE_CATEGORY_LABEL = {
  ADMIN: 'Administrasi',
  DOKTER: 'Jasa Dokter',
  TINDAKAN: 'Tindakan',
  OBAT: 'Obat',
  LAIN: 'Lain-lain',
} as const;

export const MED_CATEGORY_LABEL = {
  GENERIK: 'Generik',
  PATEN: 'Paten',
  NARKOTIKA: 'Narkotika',
  PSIKOTROPIKA: 'Psikotropika',
  OTC: 'OTC (Bebas)',
} as const;

export const MED_FORM_LABEL = {
  TABLET: 'Tablet',
  KAPSUL: 'Kapsul',
  SIRUP: 'Sirup',
  INJEKSI: 'Injeksi',
  SALEP: 'Salep/Krim',
  TETES: 'Tetes',
} as const;

export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const BANKS = ['BRI', 'BNI', 'Mandiri', 'BCA', 'BJB', 'BSI'];

export const DISCOUNT_PIN = '1234';

export const PROVINCES_CITIES: Record<string, string[]> = {
  'Jawa Barat': ['Kota Cimahi', 'Kabupaten Bandung Barat', 'Kota Bandung', 'Kabupaten Bandung', 'Kabupaten Sumedang', 'Kabupaten Garut', 'Kabupaten Cianjur', 'Kota Bogor', 'Kota Bekasi'],
  'DKI Jakarta': ['Jakarta Pusat', 'Jakarta Selatan', 'Jakarta Barat', 'Jakarta Timur', 'Jakarta Utara'],
  'Jawa Tengah': ['Kota Semarang', 'Kota Surakarta'],
};
export const DISTRICTS = ['Cimahi Utara', 'Cimahi Tengah', 'Cimahi Selatan', 'Padalarang', 'Batujajar', 'Ngamprah', 'Lembang', 'Lainnya'];
export const RELIGIONS = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'];
export const MARITAL = ['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'];
export const EDUCATIONS = ['Belum Sekolah', 'SD', 'SMP', 'SMA/SMK', 'D3', 'S1', 'S2', 'S3'];
export const OCCUPATIONS = ['Karyawan Swasta', 'Wiraswasta', 'PNS', 'TNI', 'Polri', 'Guru', 'Ibu Rumah Tangga', 'Pelajar', 'Mahasiswa', 'Buruh', 'Pedagang', 'Pensiunan', 'Petani', 'Belum Bekerja', 'Lainnya'];

export const SOAP_TEMPLATES: { label: string; s: string; o: string; a: string; p: string; icd?: string }[] = [
  {
    label: 'ISPA',
    s: 'Batuk pilek sejak 3 hari, disertai demam ringan dan nyeri tenggorokan. Tidak ada sesak napas.',
    o: 'Faring hiperemis, tonsil T1-T1 tenang. Paru vesikuler, ronki (-), wheezing (-).',
    a: 'Infeksi saluran pernapasan atas akut (J06.9)',
    p: 'Terapi simtomatik, istirahat cukup, banyak minum air hangat. Kontrol bila demam > 3 hari atau sesak.',
    icd: 'J06.9',
  },
  {
    label: 'Hipertensi kontrol',
    s: 'Kontrol rutin hipertensi. Keluhan pusing dan tengkuk berat sesekali. Obat diminum teratur.',
    o: 'Kesadaran compos mentis. Jantung: BJ I-II reguler, murmur (-). Paru: vesikuler, ronki (-). Edema tungkai (-).',
    a: 'Hipertensi esensial (I10), terkontrol sebagian.',
    p: 'Lanjutkan antihipertensi, diet rendah garam (< 5 g/hari), olahraga ringan 30 menit/hari, kontrol 1 bulan. EKG hari ini.',
    icd: 'I10',
  },
  {
    label: 'Dispepsia / Gastritis',
    s: 'Nyeri ulu hati, mual, dan kembung sejak 1 minggu, memberat saat telat makan.',
    o: 'Abdomen supel, nyeri tekan epigastrium (+), bising usus normal.',
    a: 'Gastritis (K29.7)',
    p: 'PPI pagi sebelum makan, antasida bila perlu. Makan teratur porsi kecil, hindari pedas, asam, kopi.',
    icd: 'K29.7',
  },
  {
    label: 'DM tipe 2 kontrol',
    s: 'Kontrol diabetes. Sering haus, BAK malam 2-3 kali. Tidak ada luka di kaki.',
    o: 'Akral hangat, sensasi kaki baik, tidak ada ulkus.',
    a: 'Diabetes melitus tipe 2 tanpa komplikasi (E11.9)',
    p: 'Lanjutkan metformin, edukasi diet DM dan aktivitas fisik. Cek GDS dan HbA1c.',
    icd: 'E11.9',
  },
];

export const FREQUENCIES = ['1x1', '2x1', '3x1', '4x1', '1x2', '2x2', '3x2', 'Bila perlu'];
export const ROUTES = ['Oral', 'Topikal', 'Tetes mata', 'Tetes telinga', 'Intramuskular', 'Intravena', 'Inhalasi', 'Sublingual'];
export const INSTRUCTIONS = ['Sesudah makan', 'Sebelum makan', 'Bersama makan', 'Malam hari', 'Pagi hari', 'Bila demam', 'Bila nyeri'];

export const SUPPLIERS = ['PBF Sehat Farma Bandung', 'PBF Medika Jaya Utama', 'PBF Cimahi Farmasindo', 'PBF Nusantara Husada'];

/** Menu definition: path, label, roles allowed. */
export const MENU: { group: string; items: { href: string; label: string; icon: string; roles: Role[]; badge?: string }[] }[] = [
  {
    group: 'Utama',
    items: [{ href: '/app', label: 'Dashboard', icon: 'dashboard', roles: ['ADMIN', 'PERAWAT', 'DOKTER', 'APOTEKER', 'KASIR', 'SUPERADMIN'] }],
  },
  {
    group: 'Pelayanan',
    items: [
      { href: '/app/pasien', label: 'Data Pasien', icon: 'users', roles: ['ADMIN', 'DOKTER', 'PERAWAT', 'SUPERADMIN'] },
      { href: '/app/pendaftaran', label: 'Pendaftaran', icon: 'clipboard', roles: ['ADMIN', 'SUPERADMIN'] },
      { href: '/app/janji-temu', label: 'Janji Temu Online', icon: 'calendar', roles: ['ADMIN', 'SUPERADMIN'], badge: 'appointments' },
      { href: '/app/antrian', label: 'Antrian', icon: 'queue', roles: ['ADMIN', 'PERAWAT', 'SUPERADMIN'], badge: 'queue' },
      { href: '/app/rekam-medis', label: 'Rekam Medis', icon: 'stethoscope', roles: ['DOKTER', 'PERAWAT', 'SUPERADMIN'], badge: 'worklist' },
      { href: '/app/tindakan', label: 'Tindakan', icon: 'activity', roles: ['DOKTER', 'PERAWAT', 'SUPERADMIN'] },
    ],
  },
  {
    group: 'Farmasi & Keuangan',
    items: [
      { href: '/app/farmasi', label: 'Farmasi', icon: 'pill', roles: ['APOTEKER', 'SUPERADMIN'], badge: 'pharmacy' },
      { href: '/app/farmasi/stok', label: 'Stok Obat', icon: 'package', roles: ['APOTEKER', 'SUPERADMIN'], badge: 'stock' },
      { href: '/app/kasir', label: 'Kasir', icon: 'wallet', roles: ['KASIR', 'SUPERADMIN'], badge: 'cashier' },
      { href: '/app/kasir/rekap', label: 'Rekap Kas', icon: 'receipt', roles: ['KASIR', 'SUPERADMIN'] },
    ],
  },
  {
    group: 'Manajemen',
    items: [
      { href: '/app/laporan', label: 'Laporan', icon: 'chart', roles: ['SUPERADMIN'] },
      { href: '/app/tindakan/master', label: 'Master Tindakan', icon: 'list', roles: ['SUPERADMIN'] },
      { href: '/app/master', label: 'Master Data', icon: 'database', roles: ['SUPERADMIN'] },
      { href: '/app/audit', label: 'Audit Log', icon: 'shield', roles: ['SUPERADMIN'] },
      { href: '/app/pengaturan', label: 'Pengaturan', icon: 'settings', roles: ['SUPERADMIN'] },
    ],
  },
];
