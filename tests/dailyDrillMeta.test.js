import { describe, it, expect } from 'vitest';
import { drillLocation, normalizeView, fmtYmd, isDrillMetric, isSuperOnlyMetric, DRILL_VIEWS, DRILL_TITLES } from '../src/components/stats/dailyDrillMeta';

describe('dailyDrillMeta', () => {
  it('builds a location only for positive values and valid input', () => {
    expect(drillLocation('qarz_daftari', 'users', '2026-10-20', 3)).toEqual({
      name: 'stats-daily', params: { metric: 'qarz_daftari', date: '2026-10-20' }, query: { view: 'users' },
    });
    expect(drillLocation('qarz_daftari', 'records', '2026-10-20', 0)).toBeNull();
    expect(drillLocation('nope', 'records', '2026-10-20', 5)).toBeNull();
    expect(drillLocation('revenue', 'records', '20.10.2026', 5)).toBeNull();
  });
  it('falls back to records for unsupported view', () => {
    expect(normalizeView('revenue', 'users')).toBe('records');
    expect(normalizeView('personal_debt', 'users')).toBe('users');
  });
  it('whitelists metrics and has a title for every view', () => {
    expect(isDrillMetric('__proto__')).toBe(false);
    expect(isDrillMetric('toString')).toBe(false);
    Object.entries(DRILL_VIEWS).forEach(([m, views]) => views.forEach((v) => expect(DRILL_TITLES[m][v]).toBeTruthy()));
  });
  it('marks personal finance/debt as super-admin only', () => {
    expect(['personal_finance', 'personal_debt'].every(isSuperOnlyMetric)).toBe(true);
    expect(['registrations', 'contracts', 'qarz_daftari', 'revenue'].some(isSuperOnlyMetric)).toBe(false);
  });
  it('formats dates', () => {
    expect(fmtYmd('2026-10-20')).toBe('20.10.2026');
    expect(fmtYmd('bad')).toBe('—');
  });
});
