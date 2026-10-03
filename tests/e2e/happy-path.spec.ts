import { expect, test, type Page } from '@playwright/test';

/** PRD 10.1: booking online -> check-in -> antrian -> TTV -> SOAP/diagnosa/tindakan/resep -> farmasi -> kasir QRIS -> kwitansi -> dashboard/audit. */

const errors: string[] = [];

function watchConsole(page: Page) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
}

async function switchRole(page: Page, label: string) {
  await page.getByRole('button', { name: /Admin Sistem|Rina|Dimas|Anisa|Fajar|Sari/ }).first().click();
  await page.getByRole('menuitem', { name: 'Ganti Role' }).click();
  await page.getByRole('dialog').getByRole('button', { name: new RegExp(label) }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test('main demo scenario end-to-end', async ({ page, context }) => {
  watchConsole(page);
  await page.addInitScript(() => {
    window.speechSynthesis?.cancel();
  });

  // 1. Public booking
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pelayanan yang Bisa Anda');
  await page.getByRole('link', { name: 'Buat Janji Temu' }).first().click();
  await expect(page).toHaveURL(/janji-temu/);
  await page.getByRole('radio', { name: 'Penyakit Dalam' }).click();
  await page.getByRole('radio', { name: /dr. Anisa Rahmawati/ }).click();
  await page.getByRole('button', { name: 'Lanjut →' }).click();
  // pick the first available date that is not today (tomorrow or later), then the first slot
  const dateButtons = page.getByRole('radiogroup', { name: 'Tanggal' }).getByRole('radio');
  const count = await dateButtons.count();
  await dateButtons.nth(count > 1 ? 1 : 0).click();
  await page.getByRole('radiogroup', { name: 'Jam' }).getByRole('radio', { disabled: false }).first().click();
  await page.getByRole('button', { name: 'Lanjut →' }).click();
  await page.locator('input[name="name"]').fill('Budi Santoso Demo');
  await page.locator('input[name="nik"]').fill('3277021505900007');
  await page.locator('input[name="birthDate"]').fill('1990-05-15');
  await page.getByText('Laki-laki', { exact: true }).click();
  await page.locator('input[name="phone"]').fill('081234567890');
  await page.locator('input[name="agree"]').check();
  await page.getByRole('button', { name: 'Konfirmasi Booking' }).click();
  await expect(page).toHaveURL(/janji-temu\/sukses\?kode=BK-/);
  const code = (await page.locator('p.font-heading.text-3xl, p.tabular.font-heading').first().textContent())!.trim();
  expect(code).toMatch(/^BK-\d{6}-\d{3}$/);

  // 2. Staff login as Admin Pendaftaran
  await page.goto('/app/login');
  await page.getByRole('button', { name: /Admin Pendaftaran/ }).click();
  await page.getByRole('button', { name: 'Masuk sebagai Admin Pendaftaran' }).click();
  await expect(page).toHaveURL(/\/app\/?$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Rina');

  // 3. Check-in booking
  await page.goto('/app/janji-temu');
  const row = page.getByRole('row', { name: new RegExp(code) });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Check-in' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Check-in & Daftarkan' }).click();
  await expect(page).toHaveURL(/pendaftaran\/detail/);
  const queueNo = (await page.locator('dd span.text-lg.font-bold.text-primary').first().textContent())!.trim();
  expect(queueNo).toMatch(/^A-\d{3}$/);

  // 4. Queue: call, while the TV display listens in another tab
  const display = await context.newPage();
  await display.goto('/app/antrian/display');
  await page.goto('/app/antrian');
  const qRow = page.locator('li', { hasText: queueNo }).filter({ hasText: 'Budi Santoso Demo' }).first();
  await qRow.getByRole('button', { name: 'Panggil' }).click();
  await expect(display.locator('section[aria-live="assertive"]')).toContainText(queueNo, { timeout: 10_000 });
  await display.close();

  // 5. Nurse: vitals
  await switchRole(page, 'Perawat');
  await page.goto('/app/rekam-medis');
  await page.getByRole('row', { name: /Budi Santoso Demo/ }).getByRole('button', { name: 'Periksa' }).click();
  await expect(page).toHaveURL(/rekam-medis\/periksa/);
  await page.getByRole('tab', { name: 'Triase & TTV' }).click();
  await page.getByLabel('Sistol').fill('152');
  await page.getByLabel('Diastol').fill('96');
  await page.getByLabel('Nadi').fill('84');
  await page.getByLabel('Suhu').fill('36.7');
  await page.getByLabel('Respirasi (RR)').fill('18');
  await page.getByLabel('SpO2').fill('98');
  await page.getByLabel('Berat badan').fill('72');
  await page.getByLabel('Tinggi badan').fill('168');
  await page.getByLabel('Keluhan utama').fill('Pusing dan tengkuk berat');
  await page.getByRole('button', { name: 'Simpan TTV' }).click();
  await expect(page.getByText('Tanda vital tersimpan')).toBeVisible();

  // 6. Doctor: SOAP template, ICD-10, procedure, e-prescription, complete
  await switchRole(page, 'Dokter');
  await page.getByRole('tab', { name: 'SOAP' }).click();
  await page.getByLabel('Template teks cepat').selectOption('Hipertensi kontrol');
  await page.getByRole('tab', { name: /Diagnosa/ }).click();
  await expect(page.getByText('Hipertensi esensial (primer)')).toBeVisible();
  await page.getByRole('tab', { name: /Tindakan/ }).click();
  await page.getByPlaceholder('Contoh: EKG, nebulizer, 89.52').fill('EKG');
  await page.getByRole('option', { name: /Pemeriksaan EKG/ }).click();
  await expect(page.getByRole('cell', { name: 'Pemeriksaan EKG', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Resep/ }).click();
  await page.getByPlaceholder('Contoh: amlodipine, paracetamol').fill('Amlodipine 5');
  await page.getByRole('option', { name: /Amlodipine 5 mg/ }).click();
  await page.getByLabel('Dosis').fill('5 mg');
  await page.getByLabel('Frekuensi').selectOption('1x1');
  await page.getByLabel('Durasi (hari)').fill('30');
  await expect(page.getByLabel(/Jumlah/)).toHaveValue('30');
  await page.getByRole('button', { name: 'Kirim ke Farmasi' }).click();
  await expect(page.getByText(/dikirim ke farmasi/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Selesaikan Pemeriksaan' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Selesaikan & Tandatangani' }).click();
  await expect(page.getByText('Ditandatangani secara elektronik')).toBeVisible();

  // 7. Pharmacist: review, prepare (stock decreases), label, hand over
  await switchRole(page, 'Apoteker');
  await page.goto('/app/farmasi/stok?status=');
  await page.getByPlaceholder('Cari nama, generik, kode...').fill('Amlodipine 5');
  const stockBefore = Number(await page.getByRole('row', { name: /Amlodipine 5 mg/ }).locator('td').nth(4).textContent());
  await page.goto('/app/farmasi');
  await page.getByRole('row', { name: /Budi Santoso Demo/ }).getByRole('link', { name: /Proses/ }).click();
  for (const label of ['Kelengkapan administratif', 'Kesesuaian farmasetik', 'Pertimbangan klinis']) await page.getByText(label).click();
  await page.getByRole('button', { name: 'Telaah Selesai' }).click();
  await page.getByRole('button', { name: 'Siapkan Obat' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Siapkan Obat' }).click();
  await expect(page.getByRole('link', { name: 'Cetak Etiket' })).toBeVisible();
  await page.getByRole('button', { name: 'Tandai Siap' }).click();
  await page.getByRole('button', { name: 'Serahkan ke Pasien' }).click();
  await page.getByRole('dialog').getByRole('checkbox').check();
  await page.getByRole('dialog').getByRole('button', { name: 'Serahkan' }).click();
  await expect(page.getByText(/Diserahkan kepada/)).toBeVisible();
  await page.goto('/app/farmasi/stok');
  await page.getByPlaceholder('Cari nama, generik, kode...').fill('Amlodipine 5');
  const stockAfter = Number(await page.getByRole('row', { name: /Amlodipine 5 mg/ }).locator('td').nth(4).textContent());
  expect(stockAfter).toBe(stockBefore - 30);

  // 8. Cashier: invoice has admin + consultation + EKG + drug, pay QRIS
  await switchRole(page, 'Kasir');
  await page.goto('/app/kasir');
  await page.getByRole('row', { name: /Budi Santoso Demo/ }).getByRole('link', { name: /Proses/ }).click();
  for (const item of ['Administrasi Rawat Jalan', 'Pemeriksaan EKG', 'Amlodipine 5 mg']) await expect(page.getByRole('cell', { name: item, exact: true })).toBeVisible();
  await page.getByLabel(/^Metode/).selectOption('QRIS');
  await page.getByRole('button', { name: 'Simulasikan Pembayaran Berhasil' }).click({ timeout: 15_000 });
  await expect(page.getByText('Pembayaran diterima')).toBeVisible();
  await page.getByRole('button', { name: 'Proses Pembayaran' }).click();
  await expect(page.getByText('Pembayaran lunas')).toBeVisible();
  await page.getByRole('link', { name: 'Cetak Kwitansi', exact: true }).click();
  await expect(page.getByText('LUNAS', { exact: true })).toBeVisible();
  await expect(page.getByText(/Terbilang:/)).toBeVisible();

  // 9. Super admin: dashboard & audit
  await page.goto('/app');
  await switchRole(page, 'Super Admin');
  await page.goto('/app/audit');
  for (const action of ['Check-in booking online', 'Memanggil antrian', 'Mengisi tanda vital', 'Menyelesaikan & menandatangani rekam medis', 'Menyiapkan obat (stok berkurang FEFO)', 'Pembayaran lunas']) {
    await expect(page.getByRole('cell', { name: action }).first()).toBeVisible();
  }

  expect(errors, errors.join('\n')).toEqual([]);
});
