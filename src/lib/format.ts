const rupiahFmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

/** "Rp 150.000" (negative: "-Rp 150.000"). */
export function rupiah(n: number | undefined | null): string {
  const v = Math.round(Number(n) || 0);
  return `${v < 0 ? '-' : ''}Rp ${rupiahFmt.format(Math.abs(v))}`;
}

export const num = (n: number) => rupiahFmt.format(n);

const parse = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);

/** "Sabtu, 3 Oktober 2026" */
export function dateLong(iso?: string): string {
  if (!iso) return '-';
  return parse(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** "3 Okt 2026" */
export function dateShort(iso?: string): string {
  if (!iso) return '-';
  return parse(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "09.30" */
export function timeHM(iso?: string): string {
  if (!iso) return '-';
  const d = parse(iso);
  return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "3 Okt 2026, 09.30" */
export function dateTime(iso?: string): string {
  if (!iso) return '-';
  return `${dateShort(iso)}, ${timeHM(iso)}`;
}

export function age(birthDate: string, at: Date = new Date()): number {
  const b = parse(birthDate);
  let a = at.getFullYear() - b.getFullYear();
  const m = at.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < b.getDate())) a--;
  return Math.max(a, 0);
}

/** "45 th" or "8 bln" for infants. */
export function ageLabel(birthDate: string): string {
  const a = age(birthDate);
  if (a > 0) return `${a} th`;
  const b = parse(birthDate);
  const now = new Date();
  const months = (now.getFullYear() - b.getFullYear()) * 12 + now.getMonth() - b.getMonth();
  return `${Math.max(months, 0)} bln`;
}

/** "3277********0012" */
export function maskId(value?: string, keepStart = 4, keepEnd = 4): string {
  if (!value) return '-';
  if (value.length <= keepStart + keepEnd) return value;
  return value.slice(0, keepStart) + '*'.repeat(value.length - keepStart - keepEnd) + value.slice(-keepEnd);
}

export const genderLabel = (g: string) => (g === 'L' ? 'Laki-laki' : 'Perempuan');

export function initials(name: string): string {
  const clean = name.replace(/^(dr|drg|apt|Ns|Hj|H)\.\s*/i, '').split(',')[0];
  const parts = clean.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

function terbilangRaw(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${terbilangRaw(n - 10)} belas`;
  if (n < 100) return `${terbilangRaw(Math.floor(n / 10))} puluh ${terbilangRaw(n % 10)}`;
  if (n < 200) return `seratus ${terbilangRaw(n - 100)}`;
  if (n < 1000) return `${terbilangRaw(Math.floor(n / 100))} ratus ${terbilangRaw(n % 100)}`;
  if (n < 2000) return `seribu ${terbilangRaw(n - 1000)}`;
  if (n < 1e6) return `${terbilangRaw(Math.floor(n / 1000))} ribu ${terbilangRaw(n % 1000)}`;
  if (n < 1e9) return `${terbilangRaw(Math.floor(n / 1e6))} juta ${terbilangRaw(n % 1e6)}`;
  if (n < 1e12) return `${terbilangRaw(Math.floor(n / 1e9))} miliar ${terbilangRaw(n % 1e9)}`;
  return `${terbilangRaw(Math.floor(n / 1e12))} triliun ${terbilangRaw(n % 1e12)}`;
}

/** Indonesian number words: 150000 -> "seratus lima puluh ribu". */
export function terbilang(n: number): string {
  const v = Math.floor(Math.abs(n));
  if (v === 0) return 'nol';
  return terbilangRaw(v).replace(/\s+/g, ' ').trim();
}

/** "Seratus lima puluh ribu rupiah" */
export function terbilangRupiah(n: number): string {
  const t = terbilang(n);
  return `${t.charAt(0).toUpperCase()}${t.slice(1)} rupiah`;
}
