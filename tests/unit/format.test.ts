import { describe, expect, it } from 'vitest';
import { age, maskId, rupiah, terbilang, terbilangRupiah, timeHM } from '../../src/lib/format';
import { hydrateDates, yymmdd } from '../../src/lib/date';
import { nextDailyNo, nextMrn, nextQueueNo } from '../../src/lib/id';

describe('rupiah', () => {
  it('formats with thousands separator', () => {
    expect(rupiah(150000)).toBe('Rp 150.000');
    expect(rupiah(0)).toBe('Rp 0');
    expect(rupiah(1250500)).toBe('Rp 1.250.500');
    expect(rupiah(-25000)).toBe('-Rp 25.000');
  });
});

describe('terbilang', () => {
  it.each([
    [0, 'nol'],
    [1, 'satu'],
    [11, 'sebelas'],
    [12, 'dua belas'],
    [20, 'dua puluh'],
    [100, 'seratus'],
    [115, 'seratus lima belas'],
    [1000, 'seribu'],
    [1001, 'seribu satu'],
    [2500, 'dua ribu lima ratus'],
    [150000, 'seratus lima puluh ribu'],
    [1250500, 'satu juta dua ratus lima puluh ribu lima ratus'],
    [1000000000, 'satu miliar'],
  ])('%i -> %s', (n, words) => {
    expect(terbilang(n)).toBe(words);
  });
  it('capitalises and appends rupiah', () => {
    expect(terbilangRupiah(75000)).toBe('Tujuh puluh lima ribu rupiah');
  });
});

describe('misc formatting', () => {
  it('masks identifiers', () => {
    expect(maskId('3277014509880012')).toBe('3277********0012');
  });
  it('computes age', () => {
    expect(age('2000-10-04', new Date('2026-10-03T10:00:00'))).toBe(25);
    expect(age('2000-10-03', new Date('2026-10-03T10:00:00'))).toBe(26);
  });
  it('formats time with a dot', () => {
    expect(timeHM('2026-10-03T09:05:00')).toBe('09.05');
  });
});

describe('relative seed dates', () => {
  const base = new Date('2026-10-03T08:00:00');
  it('resolves date, datetime, and inline tokens', () => {
    const out = hydrateDates({ a: '@0', b: '@-1T09:30', c: 'REG-{@-1}-0001', d: ['@2'], e: 'plain' }, base);
    expect(out).toEqual({ a: '2026-10-03', b: '2026-10-02T09:30:00', c: 'REG-261002-0001', d: ['2026-10-05'], e: 'plain' });
  });
  it('builds yymmdd', () => {
    expect(yymmdd(base)).toBe('261003');
  });
});

describe('numbering', () => {
  const day = new Date('2026-10-03T08:00:00');
  it('increments daily numbers per day', () => {
    expect(nextDailyNo('REG', ['REG-261003-0011', 'REG-261002-0050'], 4, day)).toBe('REG-261003-0012');
    expect(nextDailyNo('INV', [], 4, day)).toBe('INV-261003-0001');
  });
  it('increments MRN and queue numbers', () => {
    expect(nextMrn(['RM-000160', 'RM-000123'])).toBe('RM-000161');
    expect(nextQueueNo('A', ['A-012', 'A-003', 'B-020'])).toBe('A-013');
  });
});
