# PRD: SIMRS Lite Demo, Rumah Sakit Dustria Cimahi

**Versi:** 1.0 (MVP Demo)
**Jenis:** Frontend-only, data dummy, end-to-end flow
**Stack utama:** Astro (full), Islands untuk interaktivitas
**Penulis:** Senior Software Engineer
**Status:** Siap dikerjakan

---

## 1. Ringkasan

Membangun demo web Sistem Informasi Manajemen Klinik/Rumah Sakit (SIMRS Lite) untuk Rumah Sakit Dustria Cimahi yang terdiri dari dua bagian:

1. **Landing page publik** yang immersive, bernuansa trustworthy, dominan putih dengan aksen merah, dilengkapi asset - asset 3D interaktif, dengan performa halaman tinggi.
2. **Aplikasi internal (dashboard)** yang mencakup alur pelayanan pasien dari awal sampai akhir: **Data Pasien → Pendaftaran → Rekam Medis → Tindakan → Obat (Farmasi) → Pembayaran (Kasir)**.

Seluruh data adalah dummy. Tidak ada backend. Semua tombol harus berfungsi (minimal menghasilkan perubahan state, navigasi, modal, toast, atau print preview). Alur end-to-end harus bisa didemokan dari pasien baru datang hingga kwitansi tercetak, dan perubahan data harus "terasa nyata" selama sesi demo.

---

## 2. Tujuan & Non-Tujuan

### 2.1 Tujuan
- Menunjukkan kepada stakeholder RS gambaran produk yang realistis, lengkap, dan bisa diklik dari ujung ke ujung.
- Membangun citra brand RS yang **terpercaya, bersih, modern, profesional**.
- Landing page dengan skor Lighthouse tinggi meskipun memiliki elemen 3D.
- Seluruh fitur operasional (6 modul) tersedia dengan halaman, form, tabel, filter, aksi, dan status yang lengkap.
- Alur data antarmodul tersambung (pasien yang didaftarkan muncul di antrian, rekam medis menghasilkan resep dan tindakan, keduanya menjadi tagihan di kasir).

### 2.2 Non-Tujuan
- Tidak ada backend, database, API nyata, atau autentikasi nyata.
- Tidak ada integrasi BPJS (V-Claim), SATUSEHAT, PACS, LIS, atau payment gateway nyata. Integrasi hanya disimulasikan secara visual.
- Tidak ada kepatuhan regulasi penuh (Permenkes 24/2022 tentang Rekam Medis Elektronik) di level implementasi; hanya direpresentasikan pada struktur data dan UI.
- Tidak ada aplikasi mobile native.

---

## 3. Persona & Role

Role disimulasikan lewat **role switcher** di halaman login demo (tanpa password nyata). Role menentukan menu sidebar yang tampil dan aksi yang tersedia.

| Role | Nama Dummy | Akses Utama |
|---|---|---|
| Admin Pendaftaran | Rina Kartika | Data Pasien, Pendaftaran, Antrian |
| Perawat | Ns. Dimas Prasetyo | Antrian poli, Triase, Tanda Vital (bagian rekam medis) |
| Dokter | dr. Anisa Rahmawati, Sp.PD | Rekam Medis (SOAP), Diagnosa, Tindakan, E-Resep |
| Apoteker | apt. Fajar Nugraha, S.Farm | Resep masuk, Dispensing, Stok Obat |
| Kasir | Sari Wulandari | Tagihan, Pembayaran, Kwitansi |
| Super Admin | Admin Sistem | Semua modul, Master Data, Laporan, Pengaturan |

Untuk kebutuhan demo, Super Admin adalah default agar presenter bisa berpindah modul tanpa ganti role.

---

## 4. Brand & Design System

### 4.1 Nilai yang Diangkat
**Trustworthiness**, diterjemahkan menjadi:
- **Clarity:** tipografi tegas, hierarki jelas, tidak ramai.
- **Calm:** whitespace luas, animasi halus, tidak agresif.
- **Credibility:** angka dan fakta (akreditasi, jumlah dokter, layanan 24 jam), foto/ilustrasi tenaga medis, sertifikasi.
- **Care:** copywriting hangat, CTA yang membantu ("Buat Janji Temu", "Cek Jadwal Dokter").

### 4.2 Palet Warna

Merah dipakai sebagai aksen, bukan latar dominan. Di konteks medis, merah berlebihan terasa "darurat"; batasi pada CTA, highlight, ikon, dan elemen brand.

| Token | Hex | Penggunaan |
|---|---|---|
| `--color-bg` | `#FFFFFF` | Latar utama |
| `--color-surface` | `#F8F9FB` | Kartu, section alternatif |
| `--color-surface-2` | `#F1F3F6` | Input, tabel header |
| `--color-border` | `#E4E7EC` | Garis, divider |
| `--color-text` | `#101828` | Teks utama |
| `--color-text-muted` | `#475467` | Teks sekunder |
| `--color-primary` | `#C8102E` | Merah brand, CTA utama (sesuaikan dengan hex logo resmi) |
| `--color-primary-hover` | `#A50D26` | Hover CTA |
| `--color-primary-soft` | `#FDECEE` | Badge, highlight lembut |
| `--color-success` | `#12B76A` | Status lunas, selesai |
| `--color-warning` | `#F79009` | Menunggu, stok menipis |
| `--color-info` | `#2E90FA` | Informasi, status dalam proses |
| `--color-danger` | `#D92D20` | Error, stok habis, batal (dibedakan dari merah brand) |

Catatan: warna danger dibuat sedikit berbeda dari merah brand dan selalu disertai ikon atau label agar tidak ambigu.

Kontras teks wajib memenuhi WCAG AA (minimal 4.5:1). Teks putih di atas `#C8102E` lolos.

### 4.3 Tipografi
- **Heading:** `Plus Jakarta Sans` (600, 700), self-hosted via `@fontsource-variable`.
- **Body/UI:** `Inter` (400, 500, 600), self-hosted.
- **Angka tabel/nominal:** `font-variant-numeric: tabular-nums`.
- Skala: 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48 / 60 px.
- `font-display: swap`, preload hanya weight yang dipakai di atas lipatan.

### 4.4 Komponen Dasar (Design System)
Button (primary, secondary, ghost, danger, icon; ukuran sm/md/lg; state loading/disabled), Input, Textarea, Select, Combobox (search), DatePicker, Checkbox, Radio, Switch, Badge/StatusPill, Card, StatCard, Table (sort, filter, pagination, empty state, skeleton), Tabs, Modal/Dialog, Drawer, Toast, Tooltip, Dropdown Menu, Breadcrumb, Stepper, Timeline, Avatar, Pagination, EmptyState, ConfirmDialog, PrintLayout.

Radius: 8px (input/button), 12px (card), 16px (modal). Shadow lembut, maksimal 2 level.

### 4.5 Ikon
`lucide` (via `astro-icon` atau `lucide-static` SVG inline) agar tidak menambah JS.

---

## 5. Arsitektur Teknis

### 5.1 Stack

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Framework | **Astro 5** (output `static`) | Zero-JS by default, islands, page speed |
| Styling | Tailwind CSS v4 + CSS variables | Konsisten dengan design token |
| Interaktivitas UI | **Preact** islands (`@astrojs/preact`) | Jauh lebih ringan dari React, API kompatibel |
| State global | **nanostores** + `@nanostores/persistent` | Kecil, framework-agnostic, sinkron antar island |
| Persistensi demo | `localStorage` | Data hasil input bertahan selama demo, bisa di-reset |
| 3D | **Three.js** (vanilla, tree-shaken) di dalam island `client:visible` | Kontrol penuh atas ukuran bundle |
| Model 3D | glTF/GLB terkompresi Draco + Meshopt, tekstur KTX2 | Ukuran aset minimal |
| Animasi UI | CSS transitions + View Transitions API Astro | Tanpa library tambahan |
| Chart (dashboard/laporan) | `uPlot` atau `chart.js` (lazy) | Ringan |
| Tabel | Custom Preact table | Hindari dependensi besar |
| Form & validasi | `zod` + helper form kecil | Validasi NIK, tanggal, dll |
| Print | CSS `@media print` + halaman khusus cetak | Kwitansi, resep, kartu pasien |
| Ikon | `astro-icon` + lucide | SVG inline |
| Linting | ESLint, Prettier, `astro check` | Kualitas kode |
| Deploy | Vercel / Netlify / Cloudflare Pages (statis) | Gratis, cepat |

### 5.2 Prinsip Arsitektur
1. **Halaman = file `.astro`**, kerangka statis (layout, sidebar, header, judul) dirender saat build.
2. **Bagian yang membaca/menulis data = island Preact** dengan `client:load` (konten utama) atau `client:visible` (di bawah lipatan).
3. **Single source of truth** di nanostores. Seed awal diambil dari file JSON di `src/data/`. Saat pertama kali dibuka, seed disalin ke `localStorage`.
4. **Tombol "Reset Data Demo"** di header untuk mengembalikan seed.
5. **Rute dinamis**: karena output statis dan data baru dibuat di sisi klien, halaman detail memakai query param (`/pasien/detail?id=P-0001`) bukan `[id].astro`. Ini memastikan pasien yang baru dibuat saat demo tetap punya halaman detail yang bisa dibuka.
6. Landing page tidak memuat store aplikasi sama sekali, agar bundle landing tetap minimal.

### 5.3 Struktur Folder

```
src/
  assets/
    3d/              # .glb terkompresi
    images/          # foto, ilustrasi (diproses astro:assets)
  components/
    ui/              # Button, Input, Modal, Table, Badge, ...
    landing/         # Hero, Hero3D, Services, Doctors, Stats, ...
    app/             # Sidebar, Topbar, RoleSwitcher, ResetDemo, ...
    modules/
      pasien/
      pendaftaran/
      antrian/
      rekam-medis/
      tindakan/
      farmasi/
      kasir/
      laporan/
  data/
    seed/
      patients.json
      doctors.json
      polyclinics.json
      schedules.json
      visits.json
      medical-records.json
      icd10.json
      procedures.json
      medicines.json
      prescriptions.json
      invoices.json
      payments.json
      insurers.json
      users.json
  stores/
    db.ts            # persistentAtom per koleksi
    session.ts       # role aktif, user aktif
    selectors.ts     # query turunan (antrian hari ini, tagihan terbuka, dll)
    actions.ts       # createPatient, registerVisit, saveSOAP, ...
  lib/
    format.ts        # rupiah, tanggal Indonesia, umur
    id.ts            # generator No RM, No Registrasi, No Invoice
    validators.ts    # zod schemas
    print.ts
  layouts/
    LandingLayout.astro
    AppLayout.astro
    PrintLayout.astro
  pages/
    ...              # lihat Sitemap
  styles/
    tokens.css
    global.css
```

### 5.4 Model State

```ts
// stores/db.ts (ilustrasi)
export const patients = persistentAtom<Patient[]>('rsd:patients', seedPatients, { encode: JSON.stringify, decode: JSON.parse });
export const visits = persistentAtom<Visit[]>('rsd:visits', seedVisits, ...);
export const medicalRecords = persistentAtom<MedicalRecord[]>('rsd:mr', ...);
export const prescriptions = persistentAtom<Prescription[]>('rsd:rx', ...);
export const medicines = persistentAtom<Medicine[]>('rsd:meds', ...);
export const invoices = persistentAtom<Invoice[]>('rsd:inv', ...);
export const payments = persistentAtom<Payment[]>('rsd:pay', ...);
export const auditLog = persistentAtom<AuditEntry[]>('rsd:audit', ...);
```

Semua mutasi melalui fungsi di `actions.ts` agar efek samping (misal: menyimpan resep otomatis menambah item tagihan) terpusat dan konsisten.

Tambahkan `SCHEMA_VERSION` di localStorage. Jika versi seed berubah, data lama otomatis di-reset agar tidak terjadi error struktur saat demo.

---

## 6. Sitemap & Daftar Halaman

### 6.1 Publik (Landing)

| Path | Halaman |
|---|---|
| `/` | Landing page utama (immersive, 3D) |
| `/layanan` | Daftar layanan & poliklinik |
| `/dokter` | Jadwal & profil dokter (filter poli, hari) |
| `/janji-temu` | Form buat janji temu online (dummy, menghasilkan kode booking) |
| `/janji-temu/sukses?kode=` | Konfirmasi booking |
| `/tentang` | Tentang RS, visi misi, akreditasi |
| `/kontak` | Kontak, peta (embed statis/gambar), IGD 24 jam |
| `/404` | Halaman tidak ditemukan |

### 6.2 Aplikasi Internal

| Path | Halaman | Role |
|---|---|---|
| `/app/login` | Login demo + role switcher | Semua |
| `/app` | Dashboard ringkasan | Semua (konten berbeda per role) |
| **Data Pasien** | | |
| `/app/pasien` | Daftar pasien | Admin, Dokter, Perawat |
| `/app/pasien/baru` | Form pasien baru | Admin |
| `/app/pasien/detail?id=` | Detail pasien (profil, riwayat kunjungan, RM, tagihan) | Admin, Dokter, Perawat |
| `/app/pasien/edit?id=` | Edit pasien | Admin |
| `/app/pasien/kartu?id=` | Cetak kartu pasien | Admin |
| **Pendaftaran** | | |
| `/app/pendaftaran` | Daftar registrasi hari ini & riwayat | Admin |
| `/app/pendaftaran/baru` | Wizard pendaftaran kunjungan | Admin |
| `/app/pendaftaran/detail?id=` | Detail registrasi + bukti pendaftaran | Admin |
| `/app/antrian` | Papan antrian per poli (operator) | Admin, Perawat |
| `/app/antrian/display` | Layar TV antrian (fullscreen) | Publik internal |
| `/app/janji-temu` | Daftar booking online masuk, check-in | Admin |
| **Rekam Medis** | | |
| `/app/rekam-medis` | Worklist pasien poli (menunggu, diperiksa, selesai) | Dokter, Perawat |
| `/app/rekam-medis/periksa?visit=` | Form pemeriksaan (Triase/TTV, SOAP, Diagnosa, Tindakan, Resep, Rujukan) | Dokter, Perawat |
| `/app/rekam-medis/riwayat?id=` | Timeline rekam medis pasien | Dokter |
| `/app/rekam-medis/resume?visit=` | Resume medis (cetak) | Dokter |
| **Tindakan** | | |
| `/app/tindakan` | Daftar tindakan yang dilakukan (log) | Dokter, Perawat |
| `/app/tindakan/master` | Master tarif tindakan (ICD-9-CM) | Super Admin |
| **Obat / Farmasi** | | |
| `/app/farmasi` | Resep masuk (antrian farmasi) | Apoteker |
| `/app/farmasi/resep?id=` | Detail resep, telaah, dispensing | Apoteker |
| `/app/farmasi/stok` | Stok obat (daftar, filter, status) | Apoteker |
| `/app/farmasi/stok/detail?id=` | Kartu stok obat | Apoteker |
| `/app/farmasi/penerimaan` | Penerimaan barang (tambah stok) | Apoteker |
| `/app/farmasi/etiket?id=` | Cetak etiket obat | Apoteker |
| **Pembayaran** | | |
| `/app/kasir` | Daftar tagihan (belum bayar, lunas, batal) | Kasir |
| `/app/kasir/tagihan?id=` | Detail tagihan + proses pembayaran | Kasir |
| `/app/kasir/kwitansi?id=` | Cetak kwitansi | Kasir |
| `/app/kasir/rekap` | Rekap kas harian / tutup shift | Kasir |
| **Pendukung** | | |
| `/app/laporan` | Laporan kunjungan, top diagnosa, pendapatan, obat keluar | Super Admin |
| `/app/master` | Master data: Dokter, Poli, Jadwal, Penjamin, Pengguna | Super Admin |
| `/app/pengaturan` | Profil RS, reset demo, preferensi | Super Admin |
| `/app/audit` | Log aktivitas (siapa melakukan apa) | Super Admin |

---

## 7. Landing Page (Detail)

### 7.1 Struktur Section `/`

1. **Navbar** (sticky, transparan ke putih saat scroll): logo, Layanan, Dokter, Tentang, Kontak, tombol sekunder "Masuk Staf" (ke `/app/login`), tombol primer merah "Buat Janji Temu". Pada mobile menjadi hamburger dengan drawer.
2. **Emergency strip** tipis di atas navbar: "IGD 24 Jam: (022) xxx-xxxx" dengan ikon telepon (klik = `tel:`).
3. **Hero immersive**
   - Kiri: headline (contoh: "Pelayanan yang Bisa Anda Percaya, Setiap Saat"), subheadline, 2 CTA ("Buat Janji Temu", "Lihat Jadwal Dokter"), trust badges (Akreditasi, Layanan 24 Jam, Dokter Spesialis).
   - Kanan: **Kanvas 3D interaktif** (lihat 7.2).
4. **Quick Action Bar** (kartu mengambang di bawah hero): Cari Dokter (select poli + hari, tombol Cari ke `/dokter?poli=&hari=`), Cek Antrian (input kode booking), IGD.
5. **Statistik kepercayaan**: angka count-up saat terlihat (contoh: 40+ dokter, 20+ poliklinik, 24/7 IGD, 100rb+ pasien terlayani). Semua angka dummy.
6. **Layanan Unggulan**: grid kartu poli (Penyakit Dalam, Anak, Kandungan, Bedah, Jantung, Saraf, Gigi, Mata, THT, Rehabilitasi Medik, Laboratorium, Radiologi). Hover lift, klik ke `/layanan#slug`.
7. **Alur Layanan Pasien**: stepper visual 5 langkah (Daftar → Periksa → Tindakan → Ambil Obat → Bayar) yang sekaligus "menceritakan" produk SIMRS. Animasi garis muncul saat scroll.
8. **Dokter Kami**: carousel kartu dokter (foto ilustrasi/placeholder, nama, spesialis, jadwal ringkas, tombol "Buat Janji").
9. **Kenapa Memilih Kami**: 4 pilar trust (Tenaga medis bersertifikat, Fasilitas modern, Data pasien aman, Pelayanan ramah).
10. **Testimoni**: 3 kartu testimoni dummy dengan rating.
11. **Penjamin/Asuransi**: logo grid grayscale (gunakan placeholder generik, bukan logo merek nyata, sampai ada izin).
12. **FAQ**: accordion (cara daftar, BPJS, jam besuk, parkir).
13. **CTA akhir**: banner merah lembut "Butuh konsultasi? Buat janji sekarang."
14. **Footer**: alamat Cimahi, telepon, email, jam operasional, link cepat, sosial media, copyright.

### 7.2 Set 3D Interaktif

**Konsep yang direkomendasikan:** model 3D **salib medis / simbol RS bergaya "glass + merah"** atau **jantung anatomis stylized** yang melayang, dengan partikel lembut. Pilih salah satu:

| Opsi | Deskripsi | Kesan |
|---|---|---|
| A. Medical Cross Glass | Salib medis dengan material kaca/frosted, inti merah bercahaya lembut | Brand-forward, bersih, paling cocok dengan logo |
| B. Stylized Heart | Jantung low-poly halus dengan detak (scale pulse) dan garis EKG | Care, hangat |
| C. Miniatur Gedung RS | Diorama gedung isometrik | Fasilitas, tapi aset lebih berat |

Rekomendasi: **Opsi A** sebagai hero, karena paling ringan (geometri sederhana bisa dibuat prosedural tanpa file GLB) dan paling dekat dengan identitas logo.

**Interaksi:**
- Objek mengikuti posisi kursor (parallax rotation, dibatasi ±15°, dengan damping/lerp).
- Drag untuk memutar (pointer events, juga touch).
- Scroll: objek perlahan berputar dan mengecil saat hero di-scroll keluar.
- Hover pada objek: emissive merah sedikit menguat.
- Idle: rotasi pelan + floating sinus.
- Partikel "titik plus" kecil melayang di latar (InstancedMesh, < 300 instance).

**Aturan performa 3D (wajib):**
1. Island dimuat dengan `client:visible` dan **dynamic import** Three.js setelah halaman interaktif. LCP tidak boleh bergantung pada kanvas.
2. Tampilkan **poster statis** (AVIF/WebP render dari scene yang sama) sebagai placeholder dengan ukuran identik untuk mencegah CLS. Kanvas fade-in di atas poster saat siap.
3. Import Three.js secara selektif (`import { WebGLRenderer, Scene, ... } from 'three'`), target JS 3D ≤ 150 KB gzip.
4. Jika memakai GLB: Draco/Meshopt, ≤ 300 KB, tekstur KTX2.
5. `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`, antialias hanya di desktop.
6. Render loop berhenti saat kanvas tidak terlihat (IntersectionObserver) dan saat tab tidak aktif (`visibilitychange`).
7. **`prefers-reduced-motion`**: tampilkan poster statis saja.
8. **Fallback**: jika WebGL tidak tersedia atau perangkat low-end (`navigator.hardwareConcurrency <= 4` dan `deviceMemory <= 4`), tetap poster statis.
9. Dispose geometry/material/renderer saat navigasi keluar (View Transitions).

### 7.3 Target Performa Landing

| Metrik | Target |
|---|---|
| Lighthouse Performance (mobile) | ≥ 90 |
| Lighthouse Accessibility | ≥ 95 |
| Lighthouse Best Practices / SEO | ≥ 95 |
| LCP (mobile, 4G) | < 2.0 s |
| CLS | < 0.05 |
| INP | < 200 ms |
| TBT | < 200 ms |
| JS awal (sebelum 3D) | < 30 KB gzip |
| Total halaman (termasuk 3D) | < 1 MB |

Teknik: `astro:assets` untuk gambar (AVIF/WebP, `sizes`, lazy), preload font hero, critical CSS inline (bawaan Astro), tidak ada library animasi berat, prefetch link `/app/login` saat hover.

### 7.4 Halaman Publik Lainnya
- **`/layanan`**: hero kecil, grid poli dengan deskripsi, fasilitas penunjang, anchor per poli.
- **`/dokter`**: filter (poli, hari, nama), kartu dokter, jadwal per hari, tombol "Buat Janji" membawa parameter dokter ke form.
- **`/janji-temu`**: form 3 langkah (Pilih Poli & Dokter → Pilih Tanggal & Jam dari slot jadwal dummy → Data Diri: nama, NIK, tanggal lahir, no HP, penjamin). Submit menyimpan booking ke store (`appointments`) dan mengarahkan ke halaman sukses dengan kode booking (format `BK-YYMMDD-XXX`). Booking ini **muncul di `/app/janji-temu`** sehingga menyambung ke alur internal.
- **`/tentang`**, **`/kontak`**: konten statis, form kontak dummy dengan toast "Pesan terkirim".

Catatan: karena store aplikasi dipakai oleh form janji temu, hanya halaman `/janji-temu` yang memuat modul store, bukan `/`.

---

## 8. Aplikasi Internal: Layout & Komponen Global

### 8.1 AppLayout
- **Sidebar** (collapsible): logo, menu per modul sesuai role, badge angka (contoh: Farmasi "5" resep menunggu, Kasir "3" tagihan terbuka).
- **Topbar**: breadcrumb, global search pasien (No RM/nama/NIK, Ctrl+K), tanggal & jam live, notifikasi (dropdown), role badge, avatar menu (Ganti Role, Reset Data Demo, Keluar).
- **Banner demo** tipis: "Mode Demo: semua data fiktif." dengan tombol Reset.
- **Toast container**, **Confirm dialog** global.
- Responsif: sidebar menjadi drawer di < 1024px. Target utama penggunaan adalah desktop 1366px ke atas.

### 8.2 Login Demo `/app/login`
- Form username/password (apa pun diterima) + kartu pilihan role (6 role dengan avatar dan deskripsi akses).
- Tombol "Masuk sebagai [Role]" langsung masuk ke `/app`.
- Guard sederhana: halaman `/app/*` mengecek `session` di store; jika kosong, redirect ke login.

### 8.3 Dashboard `/app`
Konten berbeda per role:
- **Super Admin/Admin:** StatCard (Kunjungan hari ini, Pasien baru, Antrian aktif, Pendapatan hari ini), grafik kunjungan 7 hari, distribusi per poli, tabel 5 registrasi terakhir, shortcut (Pasien Baru, Daftarkan Kunjungan).
- **Dokter:** jumlah pasien menunggu di polinya, tombol "Panggil Pasien Berikutnya", daftar pasien hari ini.
- **Perawat:** antrian triase, pasien belum diisi TTV.
- **Apoteker:** resep menunggu, obat stok menipis, obat mendekati kedaluwarsa.
- **Kasir:** tagihan terbuka, total diterima hari ini per metode bayar.

Semua angka dihitung dari store (selectors), sehingga berubah ketika data diubah saat demo.

---

## 9. Spesifikasi Modul

Untuk setiap modul: semua tombol yang disebut di sini wajib berfungsi.

### 9.1 Modul Data Pasien

**Daftar `/app/pasien`**
- Tabel: No RM, Nama, JK, Tgl Lahir (umur), NIK (tersamarkan sebagian, contoh `3277********0012`), No HP, Penjamin, Kunjungan terakhir, Aksi.
- Pencarian (No RM, nama, NIK, No BPJS), filter (JK, penjamin, rentang umur), sort, pagination (10/25/50).
- Tombol: **Tambah Pasien**, **Export CSV** (generate file dari data dummy), per baris: **Lihat**, **Edit**, **Daftarkan Kunjungan** (ke wizard pendaftaran dengan pasien terpilih), **Cetak Kartu**.
- Empty state dan skeleton loading (simulasi delay 300 ms agar terasa nyata).

**Form Pasien Baru `/app/pasien/baru`** (juga dipakai untuk Edit)
Bagian:
1. Identitas: Nama lengkap*, NIK* (16 digit, validasi), No KK, Tempat lahir, Tanggal lahir*, Jenis kelamin*, Golongan darah, Agama, Status pernikahan, Pendidikan, Pekerjaan, Kewarganegaraan.
2. Kontak & Alamat: No HP*, Email, Alamat, RT/RW, Kelurahan, Kecamatan, Kota/Kab, Provinsi (dropdown dummy Jabar), Kode pos.
3. Penjamin: Umum / BPJS / Asuransi lain; jika BPJS: No kartu BPJS (13 digit), Kelas; tombol **Cek Kepesertaan** (simulasi: spinner 1 detik lalu badge "Aktif").
4. Penanggung jawab/Kontak darurat: Nama, Hubungan, No HP.
5. Medis dasar: Alergi (multi-tag input), Riwayat penyakit, Catatan.
- Tombol: **Simpan**, **Simpan & Daftarkan Kunjungan**, **Batal** (konfirmasi jika form kotor).
- No RM otomatis (format `RM-000123`, 6 digit berurutan).
- Deteksi duplikat: jika NIK sudah ada, tampilkan peringatan dengan link ke pasien terkait.
- Setelah simpan: toast + redirect ke detail.

**Detail `/app/pasien/detail?id=`**
- Header: avatar inisial, nama, No RM, umur, JK, golongan darah, badge penjamin, **badge alergi merah** jika ada.
- Tabs: **Profil**, **Riwayat Kunjungan** (tabel), **Rekam Medis** (timeline ringkas, link ke riwayat RM), **Resep**, **Tagihan**, **Dokumen** (dummy file list).
- Tombol: **Edit**, **Daftarkan Kunjungan**, **Cetak Kartu**, **Lihat Riwayat RM**.

**Kartu Pasien `/app/pasien/kartu?id=`**: layout kartu ukuran ID card, logo, nama, No RM, barcode/QR (generate SVG dari No RM, library kecil atau QR SVG pre-generated). Tombol **Cetak** (`window.print()`).

### 9.2 Modul Pendaftaran & Antrian

**Daftar Registrasi `/app/pendaftaran`**
- Tabel: No Registrasi (`REG-YYMMDD-0001`), Waktu, No RM, Nama, Poli, Dokter, Penjamin, No Antrian, Status.
- Status kunjungan (state machine, lihat 10.2): `Terdaftar`, `Menunggu`, `Dipanggil`, `Diperiksa`, `Farmasi`, `Kasir`, `Selesai`, `Batal`.
- Filter: tanggal, poli, dokter, status, penjamin.
- Tombol: **Pendaftaran Baru**, per baris: **Detail**, **Cetak Bukti**, **Batalkan** (konfirmasi + alasan).

**Wizard `/app/pendaftaran/baru`** (Stepper 4 langkah)
1. **Pilih Pasien:** search combobox pasien lama, atau tombol **Pasien Baru** (modal form ringkas atau ke form lengkap lalu kembali).
2. **Kunjungan:** Jenis kunjungan (Rawat Jalan / IGD), Poli, Dokter (difilter berdasarkan jadwal hari ini, tampilkan sisa kuota), Cara masuk (Datang sendiri, Rujukan, Booking online), jika rujukan: No rujukan & faskes asal.
3. **Penjamin:** default dari data pasien, bisa diganti; untuk BPJS tombol **Buat SEP (simulasi)** menghasilkan No SEP dummy.
4. **Konfirmasi:** ringkasan, tombol **Daftarkan**.
- Hasil: nomor antrian per poli (`A-012` untuk poli A, dst.), visit tercipta dengan status `Menunggu`, tagihan draft otomatis dibuat dengan item **biaya administrasi/pendaftaran** dan **jasa konsultasi dokter**.
- Halaman sukses dengan tombol **Cetak Bukti Pendaftaran**, **Pendaftaran Lain**, **Ke Antrian**.

**Antrian `/app/antrian`**
- Kolom per poli (kanban sederhana) atau tab per poli: daftar nomor antrian dengan status.
- Tombol: **Panggil** (status → Dipanggil, memutar suara "ding" + text-to-speech `speechSynthesis` "Nomor antrian A dua belas, silakan ke Poli Penyakit Dalam"), **Panggil Ulang**, **Lewati**, **Kembalikan ke Antrian**, **Mulai Periksa** (ke form rekam medis).

**Display `/app/antrian/display`**
- Fullscreen, nomor yang sedang dipanggil besar per poli, daftar berikutnya, jam, running text. Update otomatis dari store (event `storage` antar tab, sehingga bisa dibuka di tab/monitor lain saat demo).

**Janji Temu `/app/janji-temu`**
- Daftar booking dari landing (dan seed). Tombol: **Check-in** (membuat/menautkan pasien dan langsung membuat registrasi), **Reschedule** (modal), **Batalkan**.

### 9.3 Modul Rekam Medis

**Worklist `/app/rekam-medis`**
- Filter poli & dokter (default: dokter yang login). Tabs: Menunggu, Sedang Diperiksa, Selesai.
- Kartu/tabel: No antrian, nama, umur, JK, penjamin, alergi, waktu daftar.
- Tombol: **Panggil**, **Periksa**, **Lihat Riwayat**.

**Form Pemeriksaan `/app/rekam-medis/periksa?visit=`**
Layout dua kolom:
- **Panel kiri (sticky):** identitas pasien ringkas, alergi (merah), penjamin, riwayat 3 kunjungan terakhir (expand), obat rutin.
- **Panel kanan (Tabs):**
  1. **Triase & TTV** (Perawat): Tekanan darah (sistol/diastol), Nadi, Suhu, RR, SpO2, BB, TB, IMT (otomatis), Skala nyeri (0 to 10 slider), Keluhan utama. Nilai di luar rentang normal diberi highlight warning.
  2. **SOAP** (Dokter): Subjective, Objective (prefill dari TTV), Assessment, Plan. Template teks cepat (dropdown "Template: ISPA", "Hipertensi kontrol") untuk demo yang cepat.
  3. **Diagnosa:** search ICD-10 (dataset dummy ±100 kode umum, contoh J06.9, I10, E11.9, K30), tambahkan sebagai Primer/Sekunder, hapus.
  4. **Tindakan:** search master tindakan (ICD-9-CM + tarif), qty, pelaksana, catatan. Setiap tindakan tersimpan **otomatis menambah item tagihan**.
  5. **Resep (E-Resep):** search obat (menampilkan stok tersedia), dosis, frekuensi (contoh 3x1), rute, durasi (hari), jumlah (otomatis dihitung, bisa diubah), aturan pakai (sebelum/sesudah makan), catatan. Peringatan jika pasien alergi terhadap obat (cek kecocokan nama/golongan dummy). Racikan opsional (nice to have). Tombol **Kirim ke Farmasi**.
  6. **Rencana Lanjut:** Kontrol ulang (tanggal), Rujuk (internal ke poli lain / eksternal), Rawat inap (simulasi badge), Pulang.
- **Footer aksi:** **Simpan Draft**, **Selesaikan Pemeriksaan** (validasi: minimal 1 diagnosa dan SOAP terisi), **Cetak Resume**, **Batal**.
- Saat selesai: status visit → `Farmasi` jika ada resep, jika tidak → `Kasir`. Rekam medis dikunci (read-only) dengan label "Ditandatangani oleh dr. ... pada ..." (tanda tangan elektronik disimulasikan). Tombol **Addendum** untuk menambah catatan setelah dikunci (best practice RME: tidak menghapus, hanya menambah).

**Riwayat `/app/rekam-medis/riwayat?id=`**
- Timeline vertikal per kunjungan: tanggal, poli, dokter, diagnosa, ringkasan SOAP, tindakan, resep. Filter per poli/tahun. Expand untuk detail. Tombol **Cetak** per kunjungan.

**Resume Medis `/app/rekam-medis/resume?visit=`**: dokumen print-ready (kop RS, identitas, SOAP, diagnosa, tindakan, terapi, tanda tangan dokter).

### 9.4 Modul Tindakan

**Log `/app/tindakan`**
- Tabel semua tindakan: tanggal, pasien, poli, tindakan, kode ICD-9-CM, pelaksana, qty, tarif, status tagihan.
- Filter tanggal, poli, pelaksana. Tombol **Detail** (drawer), **Export CSV**.
- Tombol **Tambah Tindakan** (modal pilih kunjungan aktif lalu tindakan), untuk tindakan oleh perawat/penunjang di luar form dokter.

**Master `/app/tindakan/master`**
- Daftar tindakan dengan kategori (Konsultasi, Tindakan medis, Laboratorium, Radiologi, Keperawatan), kode, nama, tarif Umum, tarif BPJS (paket/0 untuk ditanggung), status aktif.
- Tombol: **Tambah**, **Edit**, **Nonaktifkan** (modal, mutasi store).

### 9.5 Modul Obat (Farmasi)

**Resep Masuk `/app/farmasi`**
- Tabs status resep: `Baru`, `Ditelaah`, `Disiapkan`, `Siap Diserahkan`, `Diserahkan`, `Batal`.
- Tabel: No resep (`RX-YYMMDD-0001`), waktu, pasien, dokter, poli, jumlah item, penjamin, status.
- Tombol per baris: **Proses**.

**Detail Resep `/app/farmasi/resep?id=`**
- Header pasien + alergi.
- Daftar item: obat, dosis, aturan, qty diminta, stok tersedia, qty diberikan (editable), substitusi (pilih obat setara jika stok kosong).
- **Checklist telaah resep** (kelengkapan administratif, kesesuaian farmasetik, pertimbangan klinis: duplikasi, interaksi, alergi) dengan checkbox.
- Tombol berurutan sesuai status: **Telaah Selesai**, **Siapkan Obat**, **Cetak Etiket**, **Tandai Siap**, **Serahkan ke Pasien** (input nama penerima, konfirmasi edukasi diberikan), **Tolak/Konfirmasi ke Dokter** (modal catatan).
- Saat **Siapkan Obat**: stok berkurang (FEFO: batch dengan kedaluwarsa terdekat dipakai dulu), item obat masuk tagihan. Saat diserahkan: visit → `Kasir` (atau `Selesai` jika semua sudah lunas dan ditanggung penuh).

**Stok `/app/farmasi/stok`**
- Tabel: kode, nama obat, golongan (Generik, Paten, Narkotika/Psikotropika, OTC), bentuk sediaan, satuan, stok total, stok minimum, harga jual, kedaluwarsa terdekat, status (Aman / Menipis / Habis / Hampir ED).
- Filter golongan, status, bentuk. Search.
- Tombol: **Tambah Obat**, **Edit**, **Penyesuaian Stok** (modal: tambah/kurang + alasan), **Lihat Kartu Stok**.

**Kartu Stok `/app/farmasi/stok/detail?id=`**: info obat, daftar batch (no batch, ED, qty), mutasi (masuk/keluar/penyesuaian) dengan referensi (No resep, No penerimaan).

**Penerimaan `/app/farmasi/penerimaan`**: form penerimaan dari distributor (dummy PBF), tambah baris obat, batch, ED, qty, harga beli. Tombol **Simpan** menambah batch ke stok.

**Etiket `/app/farmasi/etiket?id=`**: label per item (nama pasien, obat, aturan pakai, tanggal, warna etiket putih untuk oral, biru untuk luar), cetak.

### 9.6 Modul Pembayaran (Kasir)

**Daftar Tagihan `/app/kasir`**
- Tabs: `Belum Dibayar`, `Sebagian`, `Lunas`, `Batal`.
- Tabel: No Invoice (`INV-YYMMDD-0001`), tanggal, pasien, penjamin, total, ditanggung penjamin, harus dibayar pasien, status.
- Search & filter. Tombol **Proses** per baris.

**Detail Tagihan `/app/kasir/tagihan?id=`**
- Rincian dikelompokkan: Administrasi, Jasa Dokter, Tindakan, Obat, Lain-lain. Setiap baris: nama, qty, harga, subtotal, sumber (link ke RM/resep).
- Ringkasan: Subtotal, Diskon (input nominal/persen dengan alasan, butuh "otorisasi" PIN dummy `1234`), Ditanggung Penjamin (BPJS: item ditanggung menjadi 0 bagi pasien; asuransi: persentase dummy), **Total Bayar Pasien**.
- Pembayaran (bisa split/multi metode): Tunai (input diterima, kembalian otomatis), Debit/Kredit (pilih bank, No referensi), QRIS (tampilkan QR dummy + tombol "Simulasikan Pembayaran Berhasil" setelah countdown), Transfer.
- Tombol: **Tambah Item Manual**, **Hapus Item** (konfirmasi, hanya item manual), **Proses Pembayaran**, **Batalkan Tagihan** (alasan + PIN), **Cetak Kwitansi**, **Cetak Rincian**.
- Setelah lunas: status invoice `Lunas`, visit → `Selesai`, toast, tombol cetak muncul.

**Kwitansi `/app/kasir/kwitansi?id=`**: kop RS, No kwitansi, tanggal, data pasien, rincian, total, terbilang (fungsi angka ke kata Bahasa Indonesia), metode bayar, kasir, cap "LUNAS". Cetak A5 dan opsi thermal 80 mm (CSS print variant via toggle).

**Rekap `/app/kasir/rekap`**: total per metode bayar per shift, jumlah transaksi, daftar transaksi. Tombol **Tutup Shift** (modal input uang fisik, tampilkan selisih), **Cetak Rekap**.

### 9.7 Laporan `/app/laporan`
- Filter rentang tanggal (preset: Hari ini, 7 hari, 30 hari).
- Kartu & grafik: Kunjungan per hari, kunjungan per poli, pasien baru vs lama, 10 diagnosa terbanyak, 10 obat terbanyak, pendapatan per hari & per penjamin.
- Tombol **Export CSV** per laporan, **Cetak**.
- Seed harus berisi data historis ±60 hari agar grafik terlihat hidup.

### 9.8 Master Data `/app/master`
Tabs: Dokter (nama, SIP, spesialis, poli, foto), Poli (kode, nama, prefix antrian), Jadwal Dokter (hari, jam, kuota), Penjamin (nama, tipe, coverage %), Pengguna (nama, role). Semua dengan Tambah/Edit/Nonaktifkan.

### 9.9 Pengaturan `/app/pengaturan`
Profil RS (nama, alamat, telepon, logo), preferensi format cetak, **Reset Data Demo**, **Isi Data Demo Tambahan** (generate 20 pasien acak), info versi.

### 9.10 Audit Log `/app/audit`
Setiap action mencatat: waktu, user/role, aksi, entitas, ID. Tabel dengan filter. Ini menambah kesan "trustworthy" dan sesuai kebutuhan jejak audit RME.

---

## 10. Alur End-to-End

### 10.1 Skenario Demo Utama (Happy Path)
1. Pengunjung membuka `/`, melihat hero 3D, klik **Buat Janji Temu**, memilih Poli Penyakit Dalam, dr. Anisa, slot besok 09.00, mengisi data, mendapat kode `BK-...`.
2. Presenter klik **Masuk Staf**, login sebagai **Admin Pendaftaran**.
3. Buka **Janji Temu**, klik **Check-in** pada booking tadi; sistem membuat pasien baru (No RM baru) dan registrasi, nomor antrian `A-013`.
4. Buka **Antrian**, klik **Panggil**; display di tab lain menampilkan nomor dan suara pemanggilan.
5. Ganti role ke **Perawat**, isi TTV.
6. Ganti role ke **Dokter**, isi SOAP (pakai template), tambah diagnosa `I10 Hipertensi esensial`, tindakan `Pemeriksaan EKG`, resep `Amlodipine 5 mg 1x1 30 hari`, klik **Selesaikan Pemeriksaan**.
7. Ganti role ke **Apoteker**, resep muncul di tab Baru, lakukan telaah, siapkan (stok Amlodipine berkurang), cetak etiket, serahkan.
8. Ganti role ke **Kasir**, tagihan berisi administrasi + konsultasi + EKG + obat, bayar QRIS (simulasi), cetak kwitansi.
9. Kembali ke **Dashboard** Super Admin: angka kunjungan, pendapatan, obat keluar ikut bertambah. **Audit Log** menunjukkan semua jejak.

Skenario alternatif yang wajib bisa didemokan:
- Pasien lama walk-in BPJS (Cek Kepesertaan, Buat SEP, tagihan pasien Rp0).
- Pasien IGD tanpa resep (langsung ke kasir).
- Resep dengan obat stok habis (substitusi).
- Pembatalan registrasi.
- Pembayaran split (tunai + debit).

### 10.2 State Machine Kunjungan

```
Terdaftar → Menunggu → Dipanggil → Diperiksa ─┬─(ada resep)→ Farmasi → Kasir → Selesai
                │                              └─(tanpa resep)──────→ Kasir → Selesai
                └──────────────→ Batal (dari status sebelum Diperiksa)
```
Tombol yang tidak valid untuk status saat ini disembunyikan atau disabled dengan tooltip penjelasan.

### 10.3 Efek Samping Otomatis (di `actions.ts`)

| Aksi | Efek |
|---|---|
| `registerVisit` | Buat visit, nomor antrian, invoice draft (admin + konsultasi), audit |
| `addProcedure` | Tambah item invoice kategori Tindakan |
| `submitPrescription` | Buat resep status Baru, badge farmasi +1 |
| `prepareRx` | Kurangi stok (FEFO), tambah item obat ke invoice |
| `completeExam` | Kunci RM, ubah status visit |
| `pay` | Buat payment, update status invoice, visit → Selesai jika lunas |
| `cancelVisit` | Batalkan invoice draft, kembalikan slot antrian |
| Setiap aksi | Tulis audit log, tampilkan toast |

---

## 11. Model Data (TypeScript)

```ts
type ID = string;
type Gender = 'L' | 'P';
type PayerType = 'UMUM' | 'BPJS' | 'ASURANSI';

interface Patient {
  id: ID; mrn: string; nik: string; name: string; gender: Gender;
  birthPlace?: string; birthDate: string; bloodType?: 'A'|'B'|'AB'|'O'|'-';
  religion?: string; maritalStatus?: string; occupation?: string;
  phone: string; email?: string;
  address: { street: string; rt?: string; rw?: string; village?: string; district?: string; city: string; province: string; postalCode?: string };
  payer: { type: PayerType; insurerId?: ID; memberNo?: string; class?: 1|2|3 };
  emergencyContact?: { name: string; relation: string; phone: string };
  allergies: string[]; medicalHistory?: string; notes?: string;
  createdAt: string; updatedAt: string;
}

interface Doctor { id: ID; name: string; specialty: string; sip: string; poliId: ID; photo?: string; active: boolean }
interface Poli { id: ID; code: string; name: string; queuePrefix: string; active: boolean }
interface Schedule { id: ID; doctorId: ID; day: 0|1|2|3|4|5|6; start: string; end: string; quota: number }

interface Appointment {
  id: ID; code: string; poliId: ID; doctorId: ID; date: string; time: string;
  name: string; nik: string; birthDate: string; phone: string; payerType: PayerType;
  status: 'BOOKED'|'CHECKED_IN'|'CANCELLED'; patientId?: ID; visitId?: ID; createdAt: string;
}

type VisitStatus = 'TERDAFTAR'|'MENUNGGU'|'DIPANGGIL'|'DIPERIKSA'|'FARMASI'|'KASIR'|'SELESAI'|'BATAL';
interface Visit {
  id: ID; regNo: string; patientId: ID; poliId: ID; doctorId: ID;
  type: 'RAJAL'|'IGD'; source: 'WALKIN'|'RUJUKAN'|'BOOKING';
  referral?: { number: string; origin: string };
  payer: Patient['payer']; sepNo?: string;
  queueNo: string; status: VisitStatus; cancelReason?: string;
  registeredAt: string; calledAt?: string; examStartedAt?: string; finishedAt?: string;
}

interface Vitals { sys?: number; dia?: number; pulse?: number; temp?: number; rr?: number; spo2?: number; weight?: number; height?: number; bmi?: number; pain?: number; chiefComplaint?: string; recordedBy: ID; recordedAt: string }

interface MedicalRecord {
  id: ID; visitId: ID; patientId: ID; doctorId: ID;
  vitals?: Vitals;
  soap: { s: string; o: string; a: string; p: string };
  diagnoses: { code: string; name: string; type: 'PRIMER'|'SEKUNDER' }[];
  procedures: ID[]; prescriptionId?: ID;
  followUp?: { type: 'KONTROL'|'RUJUK_INTERNAL'|'RUJUK_EKSTERNAL'|'RAWAT_INAP'|'PULANG'; date?: string; target?: string; note?: string };
  status: 'DRAFT'|'FINAL'; signedAt?: string;
  addenda: { text: string; by: ID; at: string }[];
}

interface ProcedureMaster { id: ID; code: string; name: string; category: 'KONSULTASI'|'MEDIS'|'LAB'|'RADIOLOGI'|'KEPERAWATAN'|'ADMIN'; priceUmum: number; priceBpjs: number; active: boolean }
interface ProcedureAction { id: ID; visitId: ID; procedureId: ID; qty: number; performerId: ID; note?: string; price: number; at: string }

interface Medicine {
  id: ID; code: string; name: string; genericName?: string;
  category: 'GENERIK'|'PATEN'|'NARKOTIKA'|'PSIKOTROPIKA'|'OTC';
  form: 'TABLET'|'KAPSUL'|'SIRUP'|'INJEKSI'|'SALEP'|'TETES'; unit: string;
  sellPrice: number; minStock: number; allergyTags: string[];
  batches: { batchNo: string; expiry: string; qty: number; buyPrice: number }[];
}
interface StockMovement { id: ID; medicineId: ID; batchNo: string; type: 'IN'|'OUT'|'ADJ'; qty: number; ref?: string; reason?: string; at: string; by: ID }

type RxStatus = 'BARU'|'DITELAAH'|'DISIAPKAN'|'SIAP'|'DISERAHKAN'|'BATAL';
interface Prescription {
  id: ID; rxNo: string; visitId: ID; patientId: ID; doctorId: ID;
  items: { medicineId: ID; dose: string; frequency: string; route: string; durationDays: number; qty: number; qtyGiven?: number; instruction: string; substituteId?: ID }[];
  review?: { admin: boolean; pharmaceutical: boolean; clinical: boolean; note?: string };
  status: RxStatus; receivedBy?: string; createdAt: string; updatedAt: string;
}

type InvoiceStatus = 'DRAFT'|'BELUM_BAYAR'|'SEBAGIAN'|'LUNAS'|'BATAL';
interface Invoice {
  id: ID; invoiceNo: string; visitId: ID; patientId: ID;
  items: { id: ID; category: 'ADMIN'|'DOKTER'|'TINDAKAN'|'OBAT'|'LAIN'; name: string; qty: number; price: number; coveredByPayer: number; refId?: ID; manual?: boolean }[];
  discount?: { amount: number; reason: string; approvedBy: ID };
  status: InvoiceStatus; createdAt: string;
}
interface Payment { id: ID; invoiceId: ID; receiptNo: string; methods: { type: 'TUNAI'|'DEBIT'|'KREDIT'|'QRIS'|'TRANSFER'; amount: number; ref?: string; bank?: string }[]; cashReceived?: number; change?: number; cashierId: ID; at: string }

interface Insurer { id: ID; name: string; type: PayerType; coveragePct: number }
interface User { id: ID; name: string; role: 'ADMIN'|'PERAWAT'|'DOKTER'|'APOTEKER'|'KASIR'|'SUPERADMIN'; doctorId?: ID }
interface AuditEntry { id: ID; at: string; userId: ID; role: string; action: string; entity: string; entityId: ID; detail?: string }
```

---

## 12. Data Dummy (Seed)

| Koleksi | Jumlah | Catatan |
|---|---|---|
| Pasien | 60 | Nama Indonesia/Sunda realistis, alamat Cimahi & sekitarnya (Cimahi Utara, Tengah, Selatan, Padalarang, Batujajar), NIK fiktif berawalan `3277`, campuran Umum/BPJS/Asuransi, beberapa dengan alergi |
| Dokter | 14 | Lintas spesialis, gelar lengkap, SIP fiktif |
| Poli | 10 | Dengan prefix antrian A sampai J |
| Jadwal | ±40 | Senin sampai Sabtu |
| Kunjungan historis | ±400 | Tersebar 60 hari terakhir, status Selesai |
| Kunjungan hari ini | 15 | Status bervariasi agar semua tab/worklist terisi |
| Booking online | 8 | Hari ini & besok |
| ICD-10 | ±100 | Diagnosa umum rawat jalan |
| Master tindakan | ±40 | Termasuk administrasi, konsultasi umum/spesialis, EKG, nebulizer, rawat luka, lab darah rutin, GDS, rontgen thorax |
| Obat | ±80 | Multi batch, beberapa stok menipis, 2 habis, 3 mendekati ED |
| Resep | Sesuai kunjungan | Beberapa status aktif hari ini |
| Invoice | Sesuai kunjungan | Beberapa belum bayar hari ini |
| Penjamin | 5 | Umum, BPJS Kesehatan, 3 asuransi fiktif |

Seed digenerate sekali dengan skrip `scripts/generate-seed.ts` (memakai `@faker-js/faker` locale `id_ID` + seed tetap agar deterministik), hasilnya di-commit sebagai JSON. Faker tidak ikut ke bundle klien.

Semua tanggal seed disimpan relatif (offset hari) lalu dikonversi ke tanggal absolut saat inisialisasi, agar demo selalu tampak "hari ini" kapan pun dibuka.

---

## 13. Kebutuhan Non-Fungsional

### 13.1 Performa Aplikasi Internal
- JS per halaman app ≤ 120 KB gzip (Preact + nanostores + island halaman).
- Interaksi tabel ≤ 1000 baris tetap mulus (pagination di klien).
- Transisi antar halaman memakai Astro View Transitions (`<ClientRouter />`) dengan persistensi sidebar (`transition:persist`).

### 13.2 Aksesibilitas
- Semua kontrol bisa diakses keyboard, fokus terlihat (ring merah 2px).
- Label form eksplisit, pesan error terhubung via `aria-describedby`.
- Modal menjebak fokus, `Esc` menutup.
- Status tidak hanya dibedakan warna (selalu ada teks/ikon).
- Shortcut: `Ctrl+K` search pasien, `Ctrl+S` simpan form pemeriksaan.

### 13.3 Responsif
- Landing: mobile first, 360px sampai 1920px.
- App: optimal ≥ 1280px, berfungsi di tablet 768px (sidebar drawer, tabel scroll horizontal), mobile cukup bisa dibuka.

### 13.4 Lokalisasi & Format
- Bahasa Indonesia penuh.
- Mata uang `Rp 150.000` (`Intl.NumberFormat('id-ID')`).
- Tanggal `Sabtu, 3 Oktober 2026`, jam `09.30` (WIB).
- Fungsi terbilang Rupiah untuk kwitansi.

### 13.5 Privasi (Simulasi)
- NIK & No BPJS ditampilkan tersamar di tabel, penuh hanya di detail.
- Disclaimer "Data fiktif untuk demo" di footer app dan setiap dokumen cetak (watermark tipis "DEMO").

### 13.6 Kualitas Kode
- TypeScript strict.
- `astro check` & ESLint tanpa error.
- Komponen UI terdokumentasi di halaman `/app/_ui` (tersembunyi) sebagai mini style guide.
- Unit test (Vitest) untuk `actions.ts`, `format.ts` (terbilang, rupiah), FEFO stok, kalkulasi tagihan.
- E2E (Playwright) untuk skenario 10.1.

### 13.7 SEO (Landing)
- Meta title/description per halaman, Open Graph image, `sitemap.xml` (`@astrojs/sitemap`), `robots.txt` (blokir `/app/*`).
- Structured data JSON-LD `Hospital` (nama, alamat, telepon, jam buka).

---

## 14. Daftar Periksa "Semua Tombol Berfungsi"

Setiap tombol harus menghasilkan salah satu: navigasi, mutasi state + toast, modal/drawer, print, download file, atau feedback simulasi (spinner lalu hasil). **Tidak boleh ada tombol mati atau `href="#"`.**

Untuk elemen yang memang di luar scope (misal "Lupa Password", "Integrasi SATUSEHAT"), tombol tetap ada dan membuka modal informatif "Fitur ini tersedia pada versi produksi" agar demo tidak terlihat rusak.

Checklist QA:
- [ ] Navbar landing: semua link & CTA
- [ ] Quick action bar: Cari dokter, Cek antrian, IGD
- [ ] Form janji temu: 3 langkah, validasi, sukses
- [ ] Login & ganti role
- [ ] Reset data demo
- [ ] Pasien: tambah, edit, detail, cek BPJS, cetak kartu, export, daftarkan
- [ ] Pendaftaran: wizard, SEP simulasi, cetak bukti, batal
- [ ] Antrian: panggil, ulang, lewati, kembalikan, display realtime antar tab
- [ ] Janji temu internal: check-in, reschedule, batal
- [ ] Rekam medis: TTV, SOAP template, ICD-10, tindakan, resep, alergi warning, simpan draft, selesai, addendum, resume
- [ ] Tindakan: tambah, master CRUD, export
- [ ] Farmasi: telaah, siapkan (stok berkurang FEFO), substitusi, etiket, serahkan, tolak; stok CRUD, penyesuaian, penerimaan, kartu stok
- [ ] Kasir: diskon dengan PIN, tunai + kembalian, debit, QRIS simulasi, split, batal, kwitansi A5/thermal, rekap & tutup shift
- [ ] Laporan: filter, grafik, export, cetak
- [ ] Master data CRUD
- [ ] Audit log terisi dari semua aksi

---

## 15. Kriteria Penerimaan (Definition of Done)

1. Skenario 10.1 dan seluruh skenario alternatif dapat dijalankan tanpa error console dan tanpa refresh manual.
2. Data hasil input bertahan saat refresh dan sinkron antar tab; tombol Reset mengembalikan kondisi awal.
3. Lighthouse landing (mobile) memenuhi target 7.3, diukur pada build produksi.
4. 3D hero berjalan ≥ 50 fps di laptop menengah, otomatis fallback ke poster di perangkat lemah dan `prefers-reduced-motion`.
5. Semua halaman pada Sitemap (bagian 6) tersedia dan bisa diakses dari navigasi (tidak ada halaman yatim).
6. Checklist bagian 14 lolos 100%.
7. Seluruh dokumen cetak (kartu pasien, bukti daftar, resume, etiket, kwitansi, rekap) rapi di print preview Chrome.
8. Tidak ada aset atau logo pihak ketiga yang dipakai tanpa izin; logo RS memakai aset resmi dari klien.

---

## 16. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| 3D merusak skor performa | Landing lambat, kesan buruk | Poster + `client:visible` + dynamic import + budget bundle, ukur sejak awal |
| Halaman detail statis tidak mengenali data baru | Pasien baru tidak bisa dibuka | Detail via query param, render di klien |
| Struktur localStorage berubah saat pengembangan | Demo error di laptop presenter | `SCHEMA_VERSION` + auto reset |
| Island terlalu banyak per halaman | JS membengkak | Satu island utama per halaman, komponen statis tetap `.astro` |
| Merah terlalu dominan | Kesan "darurat", bukan "tenang" | Aturan 80/15/5 (putih/abu netral/merah) |
| Demo gagal karena data kosong di tanggal tertentu | Dashboard kosong | Seed relatif terhadap hari ini |
| Nama/klaim medis disalahartikan sebagai nyata | Isu reputasi | Watermark & disclaimer "Data fiktif" |

---

## 17. Pengembangan Lanjutan (Di Luar MVP)

Backend nyata (misal Supabase/Postgres), autentikasi & RBAC sungguhan, integrasi BPJS V-Claim & SATUSEHAT (FHIR), modul rawat inap, laboratorium & radiologi lengkap, odontogram, tanda tangan elektronik tersertifikasi, notifikasi WhatsApp pengingat kontrol, aplikasi pasien (cek antrian, riwayat), dan dashboard manajemen.

---

## 18. Lampiran

### 18.1 Format Penomoran
| Entitas | Format | Contoh |
|---|---|---|
| No RM | `RM-######` | `RM-000123` |
| Registrasi | `REG-YYMMDD-####` | `REG-261003-0012` |
| Antrian | `{prefix}-###` | `A-013` |
| Booking | `BK-YYMMDD-###` | `BK-261004-007` |
| Resep | `RX-YYMMDD-####` | `RX-261003-0008` |
| Invoice | `INV-YYMMDD-####` | `INV-261003-0012` |
| Kwitansi | `KW-YYMMDD-####` | `KW-261003-0010` |
| SEP (dummy) | `0301R001` + 11 digit | `0301R00110260000123` |

### 18.2 Dependensi Inti
```
astro, @astrojs/preact, @astrojs/sitemap, @astrojs/check
tailwindcss, @tailwindcss/vite
preact, nanostores, @nanostores/preact, @nanostores/persistent
three
zod
astro-icon, @iconify-json/lucide
@fontsource-variable/inter, @fontsource-variable/plus-jakarta-sans
chart.js (atau uplot)
dev: typescript, vitest, @playwright/test, @faker-js/faker, eslint, prettier
```

### 18.3 Contoh Konfigurasi Island 3D
```astro
---
// components/landing/Hero.astro
import { Image } from 'astro:assets';
import poster from '../../assets/images/hero-poster.avif';
import Hero3D from './Hero3D';
---
<div class="relative aspect-square w-full max-w-[560px]">
  <Image src={poster} alt="" loading="eager" fetchpriority="high" class="absolute inset-0 h-full w-full object-contain" />
  <Hero3D client:visible />
</div>
```
```ts
// components/landing/Hero3D.tsx (inti logika)
useEffect(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !hasWebGL() || isLowEnd()) return;
  let dispose: () => void;
  import('./scene').then(({ mount }) => { dispose = mount(canvasRef.current!); });
  return () => dispose?.();
}, []);
```