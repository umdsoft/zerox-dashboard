import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// config.js env'ni modul yuklanganda o'qiydi — har holat uchun modulni qayta yuklaymiz.
// Vitest `test` rejimida .env.test'ni yuklaydi, shuning uchun hamma qiymat aniq beriladi.
async function loadConfig(env = {}) {
  vi.resetModules();
  vi.stubEnv('VITE_APP_BASE', env.app ?? '');
  vi.stubEnv('VITE_PDF_BASE', env.pdf ?? '');
  vi.stubEnv('VITE_PDF_SCRIPT_SUFFIX', env.suffix ?? '');
  return import('../src/lib/config.js');
}

beforeEach(() => vi.unstubAllEnvs());
afterEach(() => vi.unstubAllEnvs());

describe('assetUrl', () => {
  it('returns null for empty path', async () => {
    const { assetUrl } = await loadConfig();
    expect(assetUrl('')).toBeNull();
    expect(assetUrl(undefined)).toBeNull();
  });
  it('keeps absolute URLs', async () => {
    const { assetUrl } = await loadConfig();
    expect(assetUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
  });
  it('joins APP_BASE and path without double slashes', async () => {
    const { assetUrl } = await loadConfig({ app: 'https://app.zerox.uz///' });
    expect(assetUrl('/uploads/a.png')).toBe('https://app.zerox.uz/uploads/a.png');
  });
  it('falls back to the test backend when VITE_APP_BASE is empty', async () => {
    const { assetUrl } = await loadConfig();
    expect(assetUrl('x.png')).toBe('https://tb.zerox.uz/x.png');
  });
});

describe('pdfUrl', () => {
  it('returns # for empty id (but not 0)', async () => {
    const { pdfUrl } = await loadConfig();
    expect(pdfUrl(null)).toBe('#');
    expect(pdfUrl('')).toBe('#');
    expect(pdfUrl(0)).toContain('id=0');
  });
  it('builds default index.php URL without suffix (prod)', async () => {
    const { pdfUrl } = await loadConfig({ pdf: 'https://pdf.zerox.uz/' });
    expect(pdfUrl(42)).toBe('https://pdf.zerox.uz/index.php?id=42&download=1');
  });
  it('adds lang and honours download=null', async () => {
    const { pdfUrl } = await loadConfig();
    expect(pdfUrl(7, { lang: 'uz', download: null })).toBe('https://pdf.zerox.uz/index.php?id=7&lang=uz');
  });
});

describe('withSuffix (through pdfUrl)', () => {
  it('inserts the _test suffix before .php', async () => {
    const { pdfUrl } = await loadConfig({ suffix: '_test' });
    expect(pdfUrl(1)).toBe('https://pdf.zerox.uz/index_test.php?id=1&download=1');
    expect(pdfUrl(1, { file: 'oferta.php' })).toBe('https://pdf.zerox.uz/oferta_test.php?id=1&download=1');
  });
  it('does not touch the name without a suffix', async () => {
    const { pdfUrl } = await loadConfig({ suffix: '' });
    expect(pdfUrl(1, { file: 'act.php' })).toBe('https://pdf.zerox.uz/act.php?id=1&download=1');
  });
});
