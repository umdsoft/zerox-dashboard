// /dashboard/statistic javobini ko'rinishga tayyorlovchi sof funksiyalar (Dashboard/Index.vue'dan ko'chirilgan).
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// "Луғат топилмади" / "lug'at topilmadi" kabi aniqlanmagan hududlarni tushunarli qilib ko'rsatamiz.
export function normalizeRegionLabel(label) {
  const s = String(label ?? '').trim();
  if (!s || /топилмади|topilmadi|lug.?at/i.test(s)) return 'Aniqlanmagan hudud';
  return s;
}

// Yosh oralig'ini tushunarli ko'rinishga keltiramiz ("18 - 25" -> "18–25 yosh").
export function normalizeAgeLabel(label) {
  const s = String(label ?? '').trim();
  // Tug'ilgan sanasi kiritilmagan foydalanuvchilar (backend "Not Filled In (NULL)" qaytaradi)
  if (/not\s*filled|null|nan/i.test(s)) return 'Tug‘ilgan sana kiritilmagan';
  if (/^under\s*\d+/i.test(s)) return s.replace(/^under\s*(\d+)/i, '$1 yoshgacha');
  if (/^over\s*\d+/i.test(s)) return s.replace(/^over\s*(\d+)/i, '$1 yoshdan yuqori');
  const m = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if (m) return `${m[1]}–${m[2]} yosh`;
  return s || 'Nomaʼlum';
}

export const EMPTY_RAW = () => ({ labels: [], values: [] });

export function parseRegions(s) {
  const rs = Array.isArray(s.byRegion) ? s.byRegion : [];
  return {
    labels: rs.map((r) => normalizeRegionLabel(r.region ?? r.region_name ?? r.name)),
    values: rs.map((r) => num(r.cnt ?? r.count ?? r.total)),
  };
}

export function parseAges(s) {
  const as = Array.isArray(s.byAge) ? s.byAge : [];
  return {
    labels: as.map((a) => normalizeAgeLabel(a.age_range ?? a.label)),
    values: as.map((a) => num(a.count ?? a.cnt ?? a.total)),
  };
}

export function parseGenders(s) {
  const gs = Array.isArray(s.byGender) ? s.byGender : [];
  const labels = [];
  const values = [];
  gs.forEach((g) => {
    const raw = String(g.gender ?? g.label ?? '').toLowerCase();
    let label = 'Nomaʼlum';
    if (raw === '1' || raw === 'male' || raw === 'erkak') label = 'Erkaklar';
    if (raw === '2' || raw === 'female' || raw === 'ayol') label = 'Ayollar';
    labels.push(label);
    values.push(num(g.cnt ?? g.count ?? g.total));
  });
  return { labels, values };
}

// 4 ta karta uchun 8 ta ko'rsatkich
export function parseOverview(s) {
  const ov = s.stats ?? {};
  return {
    usersRegistered: num(ov.usersRegistered ?? ov.users_registered),
    usersRegisteredThisMonth: num(ov.usersRegisteredThisMonth ?? ov.users_registered_this_month),
    usersActive: num(ov.usersActive ?? ov.users_active),
    usersActiveThisMonth: num(ov.usersActiveThisMonth ?? ov.users_active_this_month),
    contractsTotal: num(ov.contractsTotal ?? ov.contracts_total),
    contractsThisMonth: num(ov.contractsThisMonth ?? ov.contracts_this_month),
    revenueTotal: num(ov.revenueTotal ?? ov.revenue_total),
    revenueThisMonth: num(ov.revenueThisMonth ?? ov.revenue_this_month),
  };
}

export function parseQarzDaftari(s) {
  const qd = s.qarzDaftari ?? {};
  const pick = (c) => ({
    soni: num(c?.soni), berilgan: num(c?.berilgan),
    qaytarilgan: num(c?.qaytarilgan), voz_kechilgan: num(c?.voz_kechilgan),
    qoldiq: num(c?.qoldiq),
  });
  return { UZS: pick(qd.UZS), USD: pick(qd.USD) };
}

export const parseStores = (s) => (Array.isArray(s.qarzDaftariByStore) ? s.qarzDaftariByStore : []);

const palette = ['#0ea5e9', '#22d3ee', '#6366f1', '#a855f7', '#f472b6', '#f97316', '#facc15', '#34d399', '#14b8a6', '#fb7185'];
const colorsFor = (n) => Array.from({ length: n }, (_, i) => palette[i % palette.length]);

// Faqat >0 qiymatlar; ixtiyoriy kamayish tartibida; har biriga rang.
export function toEntries(dataset, { sortDesc = false } = {}) {
  const labels = dataset.labels || [];
  const values = (dataset.values || []).map(num);
  let entries = labels.map((label, i) => ({ label, value: values[i] || 0 })).filter((e) => e.value > 0);
  if (sortDesc) entries = entries.slice().sort((a, b) => b.value - a.value);
  const cols = colorsFor(entries.length);
  return entries.map((e, i) => ({ ...e, color: cols[i] }));
}
