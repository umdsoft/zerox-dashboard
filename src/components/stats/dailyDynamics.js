// Kunlik dinamika uchun sof yordamchilar (DailyDynamics.vue).

// Yo'nalishlar: label + (obyekt) -> asosiy son
export const DIRECTIONS = [
  { key: 'registrations', label: 'Ro‘yxatdan o‘tganlar', pick: (m) => m.registrations },
  { key: 'contracts', label: 'Shartnomalar', pick: (m) => m.contracts },
  { key: 'qarz_daftari', label: 'Qarz daftari', pick: (m) => m.qarz_daftari?.new_debts },
  { key: 'personal_finance', label: 'Shaxsiy moliya', pick: (m) => m.personal_finance?.records },
  { key: 'personal_debt', label: 'Shaxsiy qarz', pick: (m) => m.personal_debt?.new_debts },
  { key: 'revenue', label: 'Daromad', pick: (m) => m.revenue?.total },
]

export function fmtDayLabel(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '')
  return m ? `${m[3]}.${m[2]}` : '—'
}

/** Oldingi kunga nisbatan o'zgarish: { dir: 'up'|'down'|'flat', text } */
export function dayDelta(curr, prev) {
  if (prev == null || curr == null) return null
  const diff = Number(curr) - Number(prev)
  if (diff > 0) return { dir: 'up', diff }
  if (diff < 0) return { dir: 'down', diff }
  return { dir: 'flat', diff: 0 }
}

/** Foiz o'zgarish; oldingi 0 bo'lsa null ('—'). */
export function pctChange(curr, prev) {
  const p = Number(prev || 0)
  if (!p) return null
  return Math.round(((Number(curr || 0) - p) / p) * 1000) / 10
}

// Minimal baza: oldingi davrda juda kichik son (masalan 1 -> 3 = +200%) "eng kuchli/zaif" belgisini
// ayta olmaydi. Soni bo'yicha yo'nalishlar uchun >= 5, daromad uchun >= 100 000 so'm.
export const MIN_BASE = { default: 5, revenue: 100000 }

/** Har yo'nalish uchun WoW %, eng kuchli / eng zaif (faqat % mavjud va baza yetarli bo'lganlar orasidan). */
export function bestWorst(totals, prevTotals) {
  if (!totals || !prevTotals) return { best: null, worst: null, rows: [] }
  const rows = DIRECTIONS.map((d) => {
    const prev = Number(d.pick(prevTotals) || 0)
    const base = MIN_BASE[d.key] ?? MIN_BASE.default
    return {
      key: d.key, label: d.label,
      pct: pctChange(d.pick(totals), prev),
      enough: prev >= base,
    }
  })
  const withPct = rows.filter((r) => r.pct !== null && r.enough)
  if (!withPct.length) return { best: null, worst: null, rows }
  const best = withPct.reduce((a, b) => (b.pct > a.pct ? b : a))
  const worst = withPct.reduce((a, b) => (b.pct < a.pct ? b : a))
  return { best: best.pct > 0 ? best : null, worst: worst.pct < 0 ? worst : null, rows }
}
