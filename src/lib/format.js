// Umumiy formatlash yordamchilari — barcha sahifalar shu yerdan foydalanadi.
// Vaqt zonasi: Asia/Tashkent. Sana ko'rinishi: DD.MM.YYYY.
export const TZ = 'Asia/Tashkent';

const dtParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23',
});
const intFmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const usdFmt = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function toNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

// Vaqt belgisini Toshkent vaqtidagi qismlarga ajratadi.
function partsOf(val) {
  const d = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  const o = {};
  for (const p of dtParts.formatToParts(d)) o[p.type] = p.value;
  return o;
}

const RE_DMY = /^\d{2}\.\d{2}\.\d{4}$/;
const RE_YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** DD.MM.YYYY. Faqat-sana qatorlari (YYYY-MM-DD) vaqt zonasi siljishisiz ajratiladi. */
export function fmtDate(val, { empty = '', yearWord = false } = {}) {
  if (!val) return empty;
  const s = String(val);
  let out;
  if (RE_DMY.test(s)) out = s;
  else {
    const m = s.match(RE_YMD);
    if (m) out = `${m[3]}.${m[2]}.${m[1]}`;
    else {
      const p = partsOf(val);
      if (!p) return empty;
      out = `${p.day}.${p.month}.${p.year}`;
    }
  }
  return yearWord ? `${out} yil` : out;
}

/** HH:MM:SS (Toshkent). Tayyor "HH:MM" qatori o'zgarishsiz qaytariladi. */
export function fmtTime(val, { empty = '', seconds = true } = {}) {
  if (!val) return empty;
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(String(val))) return String(val);
  const p = partsOf(val);
  if (!p) return empty;
  return seconds ? `${p.hour}:${p.minute}:${p.second}` : `${p.hour}:${p.minute}`;
}

/** DD.MM.YYYY HH:MM (Toshkent). */
export function fmtDateTime(val, { empty = '', seconds = false } = {}) {
  if (!val) return empty;
  const p = partsOf(val);
  if (!p) return empty;
  const t = seconds ? `${p.hour}:${p.minute}:${p.second}` : `${p.hour}:${p.minute}`;
  return `${p.day}.${p.month}.${p.year} ${t}`;
}

/** Butun son: 1 234 567 */
export function fmtNum(v) {
  return intFmt.format(toNumber(v));
}

/** 1 234 567 UZS */
export function fmtUZS(v, { suffix = true } = {}) {
  const s = intFmt.format(toNumber(v));
  return suffix ? `${s} UZS` : s;
}

/** 1 234,50 USD — doim 2 xonali kasr */
export function fmtUSD(v, { suffix = true } = {}) {
  const s = usdFmt.format(toNumber(v));
  return suffix ? `${s} USD` : s;
}

/** Valyutaga qarab: USD → fmtUSD, aks holda fmtUZS */
export function fmtMoney(v, currency = 'UZS', opts) {
  return String(currency || 'UZS').toUpperCase() === 'USD' ? fmtUSD(v, opts) : fmtUZS(v, opts);
}

/** Ixcham: 1,2 mlrd / 3,4 mln / 5 ming */
export function fmtCompact(v) {
  const n = toNumber(v);
  const a = Math.abs(n);
  const f = (x) => String(Math.round(x * 10) / 10).replace('.', ',');
  if (a >= 1e9) return `${f(n / 1e9)} mlrd`;
  if (a >= 1e6) return `${f(n / 1e6)} mln`;
  if (a >= 1e3) return `${f(n / 1e3)} ming`;
  return intFmt.format(n);
}

/** Xato obyektidan foydalanuvchiga ko'rsatiladigan o'zbekcha matn. */
export function errMessage(e, fallback = 'Xatolik yuz berdi. Qayta urinib ko‘ring.') {
  const status = e?.response?.status;
  if (!e?.response && (e?.code === 'ERR_NETWORK' || e?.message === 'Network Error')) {
    return 'Tarmoq xatosi: server bilan aloqa yo‘q.';
  }
  if (status === 403) return 'Bu amal uchun sizda ruxsat yo‘q.';
  if (status === 429) return 'Juda ko‘p so‘rov. Birozdan so‘ng urinib ko‘ring.';
  if (status >= 500) return 'Serverda xatolik. Keyinroq urinib ko‘ring.';
  const m = e?.response?.data?.message;
  // Backend ba'zan kod (masalan "invalid-credentials") qaytaradi — kodni ko'rsatmaymiz.
  if (typeof m === 'string' && m && !/^[a-z0-9_-]+$/i.test(m)) return m;
  return fallback;
}
