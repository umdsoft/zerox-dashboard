import { describe, it, expect } from 'vitest';
import { fmtDate, fmtTime, fmtDateTime, fmtNum, fmtUZS, fmtUSD, fmtMoney, fmtCompact, errMessage } from '../src/lib/format';

// ru-RU raqam guruhlari qat'iy bo'shliq (U+00A0) bilan ajratiladi.
const NB = ' ';

describe('fmtDate', () => {
  it('returns empty fallback for falsy values', () => {
    expect(fmtDate(null)).toBe('');
    expect(fmtDate('', { empty: '—' })).toBe('—');
  });
  it('converts date-only YYYY-MM-DD without timezone shift', () => {
    expect(fmtDate('2026-10-31')).toBe('31.10.2026');
  });
  it('keeps DD.MM.YYYY unchanged and appends yearWord', () => {
    expect(fmtDate('31.10.2026')).toBe('31.10.2026');
    expect(fmtDate('2026-01-05', { yearWord: true })).toBe('05.01.2026 yil');
  });
  it('uses Asia/Tashkent for timestamps (UTC+5)', () => {
    expect(fmtDate('2026-10-30T20:00:00Z')).toBe('31.10.2026');
  });
  it('returns empty for invalid dates', () => {
    expect(fmtDate('not-a-date', { empty: '?' })).toBe('?');
  });
});

describe('fmtTime / fmtDateTime', () => {
  it('formats Tashkent time', () => {
    expect(fmtTime('2026-10-30T20:15:30Z')).toBe('01:15:30');
    expect(fmtTime('2026-10-30T20:15:30Z', { seconds: false })).toBe('01:15');
  });
  it('passes ready HH:MM strings through', () => {
    expect(fmtTime('09:30')).toBe('09:30');
  });
  it('formats date and time together', () => {
    expect(fmtDateTime('2026-10-30T20:15:30Z')).toBe('31.10.2026 01:15');
    expect(fmtDateTime('2026-10-30T20:15:30Z', { seconds: true })).toBe('31.10.2026 01:15:30');
    expect(fmtDateTime(null, { empty: '-' })).toBe('-');
  });
});

describe('number formatters', () => {
  it('fmtNum groups digits and tolerates junk', () => {
    expect(fmtNum(1234567)).toBe(`1${NB}234${NB}567`);
    expect(fmtNum('1 234')).toBe(`1${NB}234`);
    expect(fmtNum(undefined)).toBe('0');
    expect(fmtNum(NaN)).toBe('0');
  });
  it('fmtUZS / fmtUSD / fmtMoney', () => {
    expect(fmtUZS(1500)).toBe(`1${NB}500 UZS`);
    expect(fmtUZS(1500, { suffix: false })).toBe(`1${NB}500`);
    expect(fmtUSD(12.5)).toBe('12,50 USD');
    expect(fmtMoney(1000, 'usd')).toBe(`1${NB}000,00 USD`);
    expect(fmtMoney(1000)).toBe(`1${NB}000 UZS`);
  });
  it('fmtCompact picks mlrd / mln / ming', () => {
    expect(fmtCompact(1_200_000_000)).toBe('1,2 mlrd');
    expect(fmtCompact(3_400_000)).toBe('3,4 mln');
    expect(fmtCompact(164_600)).toBe('164,6 ming');
    expect(fmtCompact(999)).toBe('999');
  });
});

describe('errMessage', () => {
  it('maps status codes and network errors', () => {
    expect(errMessage({ response: { status: 403 } })).toMatch(/ruxsat/);
    expect(errMessage({ response: { status: 429 } })).toMatch(/Juda ko/);
    expect(errMessage({ response: { status: 502 } })).toMatch(/Serverda xatolik/);
    expect(errMessage({ code: 'ERR_NETWORK' })).toMatch(/Tarmoq/);
  });
  it('shows backend message but hides machine codes', () => {
    expect(errMessage({ response: { status: 400, data: { message: 'Telefon noto‘g‘ri' } } })).toBe('Telefon noto‘g‘ri');
    expect(errMessage({ response: { status: 400, data: { message: 'invalid-credentials' } } }, 'fb')).toBe('fb');
  });
});
