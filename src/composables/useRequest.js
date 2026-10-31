import { ref, shallowRef, onScopeDispose, getCurrentScope } from 'vue';
import axios from 'axios';
import { errMessage } from '../lib/format';

/**
 * Umumiy so'rov composable'i: loading / error / retry + eski javob himoyasi (stale guard)
 * + AbortController. fetcher({ signal }, ...args) chaqiriladi va natijani qaytaradi.
 *
 *   const { data, loading, error, run, retry } = useRequest(({ signal }) => api.get(url, { signal }))
 *
 * Yangi run() oldingi so'rovni bekor qiladi; eski javob holatni bosib keta olmaydi.
 */
export function useRequest(fetcher, { immediate = false, initial = null, onSuccess } = {}) {
  const data = shallowRef(initial);
  const loading = ref(false);
  const error = ref('');
  const loaded = ref(false);
  let seq = 0;
  let controller = null;
  let lastArgs = [];

  async function run(...args) {
    lastArgs = args;
    const my = ++seq;
    if (controller) controller.abort();
    controller = new AbortController();
    loading.value = true;
    error.value = '';
    try {
      const res = await fetcher({ signal: controller.signal }, ...args);
      if (my !== seq) return undefined;
      data.value = res;
      loaded.value = true;
      if (onSuccess) onSuccess(res);
      return res;
    } catch (e) {
      if (my !== seq || axios.isCancel(e) || e?.code === 'ERR_CANCELED') return undefined;
      error.value = errMessage(e, 'Ma’lumotni yuklashda xatolik');
      return undefined;
    } finally {
      if (my === seq) loading.value = false;
    }
  }

  const retry = () => run(...lastArgs);

  function cancel() {
    seq++;
    if (controller) controller.abort();
    loading.value = false;
  }

  if (getCurrentScope()) onScopeDispose(cancel);
  if (immediate) run();

  return { data, loading, error, loaded, run, retry, cancel };
}

// Backend javobidan massiv va jami sonni ajratib oladi (turli shakllar bilan ishlaydi).
export function extractList(res) {
  const raw = res?.data ?? res ?? {};
  const rows = Array.isArray(raw) ? raw
    : Array.isArray(raw.data) ? raw.data
    : Array.isArray(raw.items) ? raw.items
    : Array.isArray(raw.results) ? raw.results
    : Array.isArray(raw.data?.items) ? raw.data.items
    : [];
  const pg = raw.pagination || raw.meta || raw.data?.pagination || {};
  const hdr = Number(res?.headers?.['x-total-count']) || 0;
  let total =
    Number(raw.total) || Number(raw.count) || Number(raw.total_count) ||
    Number(pg.total) || Number(pg.count) || Number(raw.data?.total) || Number(raw.data?.count) ||
    hdr || 0;
  if (!total) {
    const last = Number(pg.last_page) || Number(pg.totalPages) || Number(pg.pages) || 0;
    const per = Number(pg.per_page) || Number(pg.limit) || 0;
    if (last && per) total = last * per;
  }
  if (!total) total = rows.length;
  return { rows, total };
}

/**
 * Sahifalangan ro'yxat: page/limit/total + useRequest.
 * fetchPage({signal}, {page, limit}) → axios javobi.
 */
export function usePagedList(fetchPage, { limit: initialLimit = 10, map } = {}) {
  const page = ref(1);
  const limit = ref(initialLimit);
  const total = ref(0);
  const rows = ref([]);

  const req = useRequest(
    ({ signal }) => fetchPage({ signal }, { page: page.value, limit: limit.value }),
    {
      onSuccess(res) {
        const { rows: list, total: t } = extractList(res);
        rows.value = map ? list.map(map) : list;
        total.value = t;
      },
    },
  );

  const load = () => req.run();
  function setPage(p) { page.value = p; return load(); }
  function setLimit(l) { limit.value = l; page.value = 1; return load(); }
  function reset() { page.value = 1; return load(); }

  return {
    page, limit, total, rows,
    loading: req.loading, error: req.error, loaded: req.loaded,
    load, retry: req.retry, setPage, setLimit, reset,
  };
}
