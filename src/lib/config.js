// Tashqi xizmat manzillari — .env orqali boshqariladi (VITE_APP_BASE, VITE_PDF_BASE).
// Avval bu domenlar sahifalar bo'ylab hardcode qilingan edi.
// Fallback — TEST muhit (tb.zerox.uz). Prod uchun .env'da app.zerox.uz qo'ying.
export const APP_BASE = import.meta.env.VITE_APP_BASE || 'https://tb.zerox.uz';
export const PDF_BASE = import.meta.env.VITE_PDF_BASE || 'https://pdf.zerox.uz';

const stripTrailingSlash = (s) => String(s || '').replace(/\/+$/, '');

// Foydalanuvchi rasmi / fayl uchun to'liq URL hosil qiladi.
export function assetUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${stripTrailingSlash(APP_BASE)}/${String(path).replace(/^\/+/, '')}`;
}

// Shartnoma/oferta PDF havolasini hosil qiladi.
export function pdfUrl(id, { file = 'index.php', lang, download = 1 } = {}) {
  if (id == null || id === '') return '#';
  const params = new URLSearchParams();
  params.set('id', id);
  if (lang) params.set('lang', lang);
  if (download != null) params.set('download', String(download));
  return `${stripTrailingSlash(PDF_BASE)}/${file}?${params.toString()}`;
}
