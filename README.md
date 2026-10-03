# SIMRS Lite Demo · Rumah Sakit Dustira Cimahi

Frontend-only demo (Astro 5 + Preact islands + nanostores + Tailwind v4 + Three.js) implementing `PRD.md`:
a public landing site with a 3D hero, and an internal hospital app covering the full patient flow
**Data Pasien → Pendaftaran → Rekam Medis → Tindakan → Farmasi → Kasir**. All data is fictional and stored in the browser.

## Run

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run preview    # serve the production build
```

Quality checks:

```bash
npm run check      # astro check (TypeScript strict)
npm run lint       # ESLint
npm test           # Vitest: formatting, terbilang, FEFO, billing, store actions
npm run e2e        # Playwright: PRD 10.1 scenario + alternatives + every-page smoke test (uses system Chrome)
npm run seed       # regenerate src/data/seed/*.json (deterministic)
```

## Demo script (PRD 10.1)

1. `/` → **Buat Janji Temu** → Penyakit Dalam, dr. Anisa, pick a slot, fill data → booking code `BK-…`.
2. **Masuk Staf** → role **Admin Pendaftaran** → **Janji Temu Online** → **Check-in** (creates patient + registration + queue number).
3. **Antrian** → **Panggil** (chime + Indonesian TTS). Open **Buka Layar TV** in another tab/monitor: it updates live.
4. Avatar menu → **Ganti Role** → Perawat: fill TTV. → Dokter: SOAP template, ICD-10, tindakan, e-resep, **Selesaikan Pemeriksaan** (e-signature lock, addendum afterwards).
5. Apoteker: telaah → siapkan (stock decreases FEFO) → etiket → serahkan.
6. Kasir: invoice already contains admin + konsultasi + tindakan + obat. Pay (cash / card / QRIS simulation / split), print receipt (A5 or 80 mm).
7. Super Admin: dashboard, laporan, audit log.

Useful details:

- **Reset Data Demo** is in the top banner, the avatar menu, and Pengaturan. Data persists across refreshes and syncs across tabs.
- Discount and invoice cancellation need the supervisor PIN `1234`.
- Seed dates are relative to today, so the demo always looks current.
- The 3D hero loads after idle on desktop, after the first interaction on phones, and falls back to a static poster on
  reduced-motion, low-end devices, or software WebGL. Add `?3d` to force it on.
- Hidden style guide: `/app/_ui`.

## Structure

```
src/
  components/ui/        design system (Modal, DataTable, Tabs, Combobox, Charts, ...)
  components/app/       Sidebar, Topbar, Overlays (toast, confirm, search Ctrl+K, role switch)
  components/modules/   one island per page (pasien, pendaftaran, antrian, rekam-medis, tindakan, farmasi, kasir, ...)
  components/landing/   Navbar, Hero3D + scene.ts, booking form, doctor directory
  stores/               db.ts (persistent atoms + seeding), actions.ts (all mutations + side effects + audit), selectors.ts
  lib/                  types, format (rupiah, terbilang), billing, stock (FEFO), validators (zod), barcode/QR
  data/seed/            generated JSON seed
scripts/                generate-seed.ts, process-logo.mjs
tests/                  unit (Vitest) and e2e (Playwright)
```
