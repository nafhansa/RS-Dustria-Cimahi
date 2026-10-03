import { expect, test } from '@playwright/test';

const SHOTS = process.env.SHOTS_DIR;

const publicPages = ['/', '/layanan', '/dokter', '/dokter?poli=penyakit-dalam&hari=1', '/janji-temu', '/janji-temu/sukses', '/tentang', '/kontak', '/halaman-tidak-ada'];

test('public pages render without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('404') && errors.push(`${page.url()}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
  for (const url of publicPages) {
    await page.goto(url);
    await expect(page.locator('h1').first()).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/public${url.replace(/[/?=&]/g, '_') || '_home'}.png`, fullPage: true });
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

test('every app page renders for Super Admin without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(`${page.url()}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
  await page.goto('/app/login');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/app_login.png`, fullPage: true });
  await page.getByRole('button', { name: 'Masuk sebagai Super Admin' }).click();
  await expect(page).toHaveURL(/\/app\/?$/);

  const ids = await page.evaluate(() => {
    const get = (k: string) => JSON.parse(localStorage.getItem(k) || '[]');
    const today = new Date();
    const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const visits = get('rsd:visits');
    const rx = get('rsd:rx').find((r: { status: string }) => r.status === 'DISERAHKAN');
    const inv = get('rsd:inv').find((i: { status: string }) => i.status === 'LUNAS');
    const exam = visits.find((v: { registeredAt: string; status: string }) => v.registeredAt.startsWith(t) && v.status === 'DIPERIKSA');
    return { patient: get('rsd:patients')[0].id, visit: visits.find((v: { status: string }) => v.status === 'SELESAI').id, exam: exam.id, rx: rx.id, rxVisit: rx.visitId, inv: inv.id, med: 'M004' };
  });

  const pages = [
    '/app',
    '/app/pasien',
    '/app/pasien/baru',
    `/app/pasien/detail?id=${ids.patient}`,
    `/app/pasien/edit?id=${ids.patient}`,
    `/app/pasien/kartu?id=${ids.patient}`,
    '/app/pendaftaran',
    '/app/pendaftaran/baru',
    `/app/pendaftaran/detail?id=${ids.visit}`,
    '/app/janji-temu',
    '/app/antrian',
    '/app/antrian/display',
    '/app/rekam-medis',
    `/app/rekam-medis/periksa?visit=${ids.exam}`,
    `/app/rekam-medis/riwayat?id=${ids.patient}`,
    `/app/rekam-medis/resume?visit=${ids.rxVisit}`,
    '/app/tindakan',
    '/app/tindakan/master',
    '/app/farmasi',
    `/app/farmasi/resep?id=${ids.rx}`,
    '/app/farmasi/stok',
    `/app/farmasi/stok/detail?id=${ids.med}`,
    '/app/farmasi/penerimaan',
    `/app/farmasi/etiket?id=${ids.rx}`,
    '/app/kasir',
    `/app/kasir/tagihan?id=${ids.inv}`,
    `/app/kasir/kwitansi?id=${ids.inv}`,
    `/app/kasir/kwitansi?id=${ids.inv}&mode=rincian`,
    '/app/kasir/rekap',
    '/app/laporan',
    '/app/master',
    '/app/pengaturan',
    '/app/audit',
    '/app/_ui',
  ];
  for (const url of pages) {
    await page.goto(url);
    await page.waitForTimeout(450);
    await expect(page.getByText(/tidak ditemukan/i)).toHaveCount(0);
    if (!url.endsWith('_ui')) await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/app${url.split('?')[0].replace(/\//g, '_')}${url.includes('mode=') ? '_rincian' : ''}.png`, fullPage: true });
  }

  // role restrictions: cashier cannot open master data
  await page.goto('/app');
  await page.evaluate(() => localStorage.setItem('rsd:session', JSON.stringify({ userId: 'U-KASIR', role: 'KASIR', loginAt: new Date().toISOString() })));
  await page.goto('/app/master');
  await expect(page.getByText('Akses dibatasi untuk role ini')).toBeVisible();

  expect(errors, errors.join('\n')).toEqual([]);
});

test('unauthenticated app access redirects to login', async ({ page }) => {
  await page.goto('/app/login');
  await page.evaluate(() => localStorage.removeItem('rsd:session'));
  await page.goto('/app/kasir');
  await expect(page).toHaveURL(/\/app\/login\?next=/);
});
