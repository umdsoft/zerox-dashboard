import { describe, it, expect } from 'vitest';
import {
  normalizeRegionLabel, normalizeAgeLabel, parseGenders, parseOverview, parseQarzDaftari, parseStores, toEntries,
} from '../src/lib/dashboardStats';

describe('dashboardStats', () => {
  it('normalizes region and age labels', () => {
    expect(normalizeRegionLabel('Lug‘at topilmadi')).toBe('Aniqlanmagan hudud');
    expect(normalizeRegionLabel(' Xorazm ')).toBe('Xorazm');
    expect(normalizeAgeLabel('18 - 25')).toBe('18–25 yosh');
    expect(normalizeAgeLabel('under 18')).toBe('18 yoshgacha');
    expect(normalizeAgeLabel('Not Filled In (NULL)')).toBe('Tug‘ilgan sana kiritilmagan');
  });

  it('maps genders and tolerates both key styles', () => {
    expect(parseGenders({ byGender: [{ gender: 1, cnt: 5 }, { label: 'ayol', count: '7' }, { gender: 'x', total: 1 }] }))
      .toEqual({ labels: ['Erkaklar', 'Ayollar', 'Nomaʼlum'], values: [5, 7, 1] });
    expect(parseGenders({})).toEqual({ labels: [], values: [] });
  });

  it('reads overview in camelCase and snake_case', () => {
    const o = parseOverview({ stats: { usersRegistered: 3, users_active: '4', revenue_total: 9 } });
    expect(o.usersRegistered).toBe(3);
    expect(o.usersActive).toBe(4);
    expect(o.revenueTotal).toBe(9);
    expect(o.contractsTotal).toBe(0);
  });

  it('always yields UZS and USD blocks and a stores array', () => {
    expect(parseQarzDaftari({}).USD.qoldiq).toBe(0);
    expect(parseQarzDaftari({ qarzDaftari: { UZS: { soni: '2' } } }).UZS.soni).toBe(2);
    expect(parseStores({ qarzDaftariByStore: 'bad' })).toEqual([]);
  });

  it('toEntries drops zeros, sorts desc on request and assigns colors', () => {
    const e = toEntries({ labels: ['a', 'b', 'c'], values: [1, 0, 5] }, { sortDesc: true });
    expect(e.map((x) => x.label)).toEqual(['c', 'a']);
    expect(e[0].color).toMatch(/^#/);
  });
});
