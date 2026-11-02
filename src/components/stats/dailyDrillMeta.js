// Kunlik dinamika drill-down uchun sof yordamchilar (DailyDynamics.vue, pages/Stats/DailyDrill.vue).
// Kalitlar backend bilan bir xil (services/dashboard/dailyDrill.service.js METRIC_VIEWS).

export const DRILL_VIEWS = {
  registrations: ['records'],
  contracts: ['records'],
  qarz_daftari: ['records', 'users'],
  personal_finance: ['records', 'users'],
  personal_debt: ['records', 'users'],
  revenue: ['records'],
}

export const DRILL_TITLES = {
  registrations: { records: 'Ro‘yxatdan o‘tganlar' },
  contracts: { records: 'Shartnomalar' },
  qarz_daftari: { records: 'Qarz daftari — yangi qarzlar', users: 'Qarz daftari — faol userlar' },
  personal_finance: { records: 'Shaxsiy moliya — yozuvlar', users: 'Shaxsiy moliya — faol userlar' },
  personal_debt: { records: 'Shaxsiy qarz — yangi qarzlar', users: 'Shaxsiy qarz — faol userlar' },
  revenue: { records: 'Daromad — to‘lovlar' },
}

// Individual moliyaviy yozuvlar: backend faqat super-admin'ga beradi.
export const SUPER_ONLY_METRICS = ['personal_finance', 'personal_debt']
export const isSuperOnlyMetric = (m) => SUPER_ONLY_METRICS.includes(m)

const YMD = /^\d{4}-\d{2}-\d{2}$/

export const isDrillMetric = (m) => Object.prototype.hasOwnProperty.call(DRILL_VIEWS, m)

/** Noto'g'ri view bo'lsa 'records'. */
export function normalizeView(metric, view) {
  return isDrillMetric(metric) && DRILL_VIEWS[metric].includes(view) ? view : 'records'
}

/** Jadval katagi uchun router manzili; 0 (yoki noto'g'ri) qiymat uchun null (bosilmaydi). */
export function drillLocation(metric, view, date, value) {
  if (!isDrillMetric(metric) || !YMD.test(date || '')) return null
  if (!(Number(value) > 0)) return null
  return { name: 'stats-daily', params: { metric, date }, query: { view: normalizeView(metric, view) } }
}

/** 'YYYY-MM-DD' -> 'DD.MM.YYYY' */
export function fmtYmd(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '')
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '—'
}

export const PAY_SOURCE_LABELS = { payme: 'Payme', click: 'Click', other: 'Boshqa' }
