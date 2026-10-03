import { expect, test, type Page } from '@playwright/test';

const errors: string[] = [];
function watch(page: Page) {
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
}
async function loginAs(page: Page, role: string) {
  await page.goto('/app/login');
  await page.getByRole('button', { name: new RegExp(`^${role}`) }).first().click();
  await page.getByRole('button', { name: `Masuk sebagai ${role}` }).click();
  await expect(page).toHaveURL(/\/app\/?$/);
}
async function resetData(page: Page) {
  await page.goto('/app/login');
  await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('rsd:')).forEach((k) => localStorage.removeItem(k)));
}

test.beforeEach(async ({ page }) => {
  errors.length = 0;
  watch(page);
  await resetData(page);
});
test.afterEach(() => expect(errors, errors.join('\n')).toEqual([]));

test('BPJS walk-in: new patient, cek kepesertaan, SEP, bill Rp0', async ({ page }) => {
  await loginAs(page, 'Super Admin');
  await page.goto('/app/pasien/baru');
  await page.getByLabel(/Nama lengkap/).fill('Siti Aminah Demo');
  await page.getByLabel(/^NIK/).fill('3277024512850003');
  await page.getByLabel(/Tanggal lahir/).fill('1985-12-05');
  await page.getByText('Perempuan', { exact: true }).click();
  await page.getByLabel(/^No HP/).first().fill('081298765432');
  await page.getByText('BPJS Kesehatan', { exact: true }).click();
  await page.getByLabel(/No kartu BPJS/).fill('0001234567890');
  await page.getByRole('button', { name: 'Cek Kepesertaan' }).click();
  await expect(page.getByText('Aktif', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Simpan & Daftarkan Kunjungan' }).click();
  await expect(page).toHaveURL(/pendaftaran\/baru\?patient=/);
  await expect(page.getByText('Siti Aminah Demo').first()).toBeVisible();
  await page.getByRole('button', { name: /Lanjut/ }).click();
  await page.getByLabel(/Poli tujuan/).selectOption('POL-A');
  await page.getByLabel('Tampilkan dokter di luar jadwal').check();
  await page.getByRole('radio', { name: /dr. Hendra Gunawan/ }).click();
  await page.getByRole('button', { name: /Lanjut/ }).click();
  await page.getByRole('button', { name: 'Buat SEP (simulasi)' }).click();
  await expect(page.getByText(/SEP berhasil dibuat/)).toBeVisible();
  await page.getByRole('button', { name: /Lanjut/ }).click();
  await page.getByRole('button', { name: 'Daftarkan' }).click();
  await expect(page.getByRole('heading', { name: 'Pendaftaran Berhasil' })).toBeVisible();
  await page.getByRole('link', { name: 'Cetak Bukti Pendaftaran' }).click();
  await expect(page).toHaveURL(/pendaftaran\/detail/);
  await page.locator('[data-page]').getByRole('link', { name: 'Rekam Medis' }).click();
  await page.getByRole('tab', { name: 'SOAP' }).click();
  await page.getByLabel('Template teks cepat').selectOption('DM tipe 2 kontrol');
  await page.getByRole('button', { name: 'Selesaikan Pemeriksaan' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Selesaikan & Tandatangani' }).click();
  await expect(page.getByText(/ditanggung penuh penjamin/i).first()).toBeVisible();
  await page.goto('/app/kasir');
  await page.getByRole('tab', { name: /Lunas/ }).click();
  await page.getByRole('row', { name: /Siti Aminah Demo/ }).getByRole('link').click();
  await expect(page.getByText('Total Bayar Pasien').locator('..')).toContainText('Rp 0');
});

test('IGD without prescription goes straight to cashier; split payment cash + debit', async ({ page }) => {
  await loginAs(page, 'Super Admin');
  await page.goto('/app/pendaftaran/baru');
  await page.getByLabel(/Cari pasien lama/).fill('RM-000101');
  await page.getByRole('option').first().click();
  await page.getByRole('button', { name: /Lanjut/ }).click();
  await page.getByText('IGD (Gawat Darurat)').click();
  await page.getByLabel('Tampilkan dokter di luar jadwal').check();
  await page.getByRole('radio', { name: /dr. Fikri Ramadhan/ }).click();
  await page.getByRole('button', { name: /Lanjut/ }).click();
  await page.getByText('Umum', { exact: true }).click();
  await page.getByRole('button', { name: /Lanjut/ }).click();
  await page.getByRole('button', { name: 'Daftarkan' }).click();
  await expect(page.getByText(/^Z-\d{3}$/)).toBeVisible();
  await page.getByRole('link', { name: 'Ke Antrian' }).click();
  await page.locator('li', { hasText: /Z-\d{3}/ }).getByRole('button', { name: 'Periksa' }).first().click();
  await expect(page).toHaveURL(/periksa/);
  await page.getByRole('tab', { name: 'SOAP' }).click();
  await page.getByLabel(/S · Subjective/).fill('Luka robek jari');
  await page.getByLabel(/A · Assessment/).fill('Luka terbuka');
  await page.getByLabel(/P · Plan/).fill('Hecting, rawat luka');
  await page.getByRole('tab', { name: /Diagnosa/ }).click();
  await page.getByPlaceholder('Contoh: I10, hipertensi, J06.9').fill('S61');
  await page.getByRole('option').first().click();
  await page.getByRole('button', { name: 'Selesaikan Pemeriksaan' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Selesaikan & Tandatangani' }).click();
  await expect(page.getByText(/diarahkan ke Kasir/)).toBeVisible();
  await page.goto('/app/kasir');
  const row = page.getByRole('row').filter({ hasText: 'Belum Dibayar' }).first();
  await row.getByRole('link', { name: /Proses/ }).click();
  const remainingText = await page.getByText('Sisa', { exact: true }).locator('..').locator('dd').textContent();
  const remaining = Number(remainingText!.replace(/\D/g, ''));
  await page.getByLabel('Nominal').first().fill('50000');
  await page.getByRole('button', { name: /Tambah metode/ }).click();
  await page.getByLabel(/^Metode 2/).selectOption('DEBIT');
  await page.getByLabel('Nominal').nth(1).fill(String(remaining - 50000));
  await page.getByLabel('Bank').selectOption('BCA');
  await page.getByLabel(/No referensi/).fill('778899');
  await page.getByLabel('Uang diterima').fill('100000');
  await expect(page.getByText('Rp 50.000').last()).toBeVisible();
  await page.getByRole('button', { name: 'Proses Pembayaran' }).click();
  await expect(page.getByText('Pembayaran lunas')).toBeVisible();
});

test('cancel registration and discount with PIN', async ({ page }) => {
  await loginAs(page, 'Super Admin');
  await page.goto('/app/pendaftaran');
  const row = page.getByRole('row').filter({ hasText: 'Menunggu' }).first();
  const reg = (await row.locator('td').first().textContent())!.trim();
  await row.getByRole('button', { name: /Batalkan/ }).click();
  await page.getByRole('dialog').getByLabel('Alasan pembatalan').fill('Pasien pulang sebelum dipanggil');
  await page.getByRole('dialog').getByRole('button', { name: 'Batalkan Registrasi' }).click();
  await expect(page.getByRole('row', { name: new RegExp(reg) })).toContainText('Batal');

  await page.goto('/app/kasir');
  await page.getByRole('row').filter({ hasText: 'Belum Dibayar' }).first().getByRole('link', { name: /Proses/ }).click();
  await page.getByRole('button', { name: /Beri diskon/ }).click();
  await page.getByRole('dialog').getByRole('spinbutton', { name: 'Nominal' }).fill('5000');
  await page.getByRole('dialog').getByLabel('Alasan').selectOption('Karyawan RS');
  await page.getByRole('dialog').getByLabel('PIN otorisasi').fill('9999');
  await page.getByRole('dialog').getByRole('button', { name: 'Terapkan Diskon' }).click();
  await expect(page.getByRole('dialog').getByText('PIN otorisasi salah')).toBeVisible();
  await page.getByRole('dialog').getByLabel('PIN otorisasi').fill('1234');
  await page.getByRole('dialog').getByRole('button', { name: 'Terapkan Diskon' }).click();
  await expect(page.getByText('Diskon diterapkan')).toBeVisible();
});

test('pharmacy substitution for out-of-stock drug', async ({ page }) => {
  await loginAs(page, 'Super Admin');
  // doctor prescribes Amoxicillin 500 mg (stock 0) for a waiting patient
  await page.goto('/app/rekam-medis');
  await page.getByRole('row').filter({ hasText: 'Menunggu' }).first().getByRole('button', { name: 'Periksa' }).click();
  const patientName = (await page.locator('aside a[href^="/app/pasien/detail"]').first().textContent())!.trim();
  await page.getByRole('tab', { name: /Resep/ }).click();
  await page.getByPlaceholder('Contoh: amlodipine, paracetamol').fill('Amoxicillin 500');
  await page.getByRole('option', { name: /^Amoxicillin 500 mg/ }).click();
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible().catch(() => false)) await dialog.getByRole('button', { name: 'Tetap tambahkan' }).click();
  await page.getByRole('button', { name: 'Kirim ke Farmasi' }).click();
  await page.goto('/app/farmasi');
  await page.getByRole('tab', { name: /Baru/ }).click();
  await page.getByRole('row', { name: new RegExp(patientName) }).getByRole('link', { name: /Proses/ }).click();
  await page.getByLabel(/Substitusi Amoxicillin/).selectOption('M003');
  for (const label of ['Kelengkapan administratif', 'Kesesuaian farmasetik', 'Pertimbangan klinis']) await page.getByText(label).click();
  await page.getByRole('button', { name: 'Telaah Selesai' }).click();
  await page.getByRole('button', { name: 'Siapkan Obat' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Siapkan Obat' }).click();
  await expect(page.getByText('Substitusi').first()).toBeVisible();
  await expect(page.getByText('Amoxa-D 500 mg').first()).toBeVisible();
});
