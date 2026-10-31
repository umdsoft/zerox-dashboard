import { describe, it, expect, vi } from 'vitest';
import { effectScope } from 'vue';
import { useRequest, extractList, usePagedList } from '../src/composables/useRequest';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

describe('extractList', () => {
  it('handles a bare array', () => {
    expect(extractList({ data: [1, 2] })).toEqual({ rows: [1, 2], total: 2 });
  });
  it('handles {data: []} with total', () => {
    expect(extractList({ data: { data: [1], total: 9 } })).toEqual({ rows: [1], total: 9 });
  });
  it('handles items / results / data.items', () => {
    expect(extractList({ data: { items: [1, 2, 3] } }).rows).toEqual([1, 2, 3]);
    expect(extractList({ data: { results: [1] } }).rows).toEqual([1]);
    expect(extractList({ data: { data: { items: [5], total: 40 } } })).toEqual({ rows: [5], total: 40 });
  });
  it('reads total from pagination, header, or last_page*per_page', () => {
    expect(extractList({ data: { data: [1], pagination: { total: 33 } } }).total).toBe(33);
    expect(extractList({ data: [1], headers: { 'x-total-count': '77' } }).total).toBe(77);
    expect(extractList({ data: { data: [1], meta: { last_page: 4, per_page: 10 } } }).total).toBe(40);
  });
  it('falls back to rows.length and tolerates empty input', () => {
    expect(extractList({ data: { data: [1, 2, 3] } }).total).toBe(3);
    expect(extractList(undefined)).toEqual({ rows: [], total: 0 });
    expect(extractList(null)).toEqual({ rows: [], total: 0 });
  });
});

describe('useRequest', () => {
  it('sets loading and stores data on success', async () => {
    const onSuccess = vi.fn();
    const req = useRequest(async () => 'ok', { onSuccess });
    const p = req.run();
    expect(req.loading.value).toBe(true);
    await p;
    expect(req.loading.value).toBe(false);
    expect(req.data.value).toBe('ok');
    expect(req.loaded.value).toBe(true);
    expect(onSuccess).toHaveBeenCalledWith('ok');
  });

  it('ignores a stale response from an earlier run', async () => {
    const a = deferred();
    const b = deferred();
    const queue = [a, b];
    const req = useRequest(() => queue.shift().promise);
    const first = req.run();
    const second = req.run();
    b.resolve('new');
    await second;
    a.resolve('old');
    expect(await first).toBeUndefined();
    expect(req.data.value).toBe('new');
    expect(req.loading.value).toBe(false);
  });

  it('aborts the previous request signal when run again', () => {
    const signals = [];
    const req = useRequest(({ signal }) => { signals.push(signal); return new Promise(() => {}); });
    req.run();
    req.run();
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it('ignores a stale error and keeps the fresh result', async () => {
    const a = deferred();
    const b = deferred();
    const queue = [a, b];
    const req = useRequest(() => queue.shift().promise);
    const first = req.run();
    const second = req.run();
    b.resolve('fresh');
    await second;
    a.reject(new Error('late'));
    await first;
    expect(req.error.value).toBe('');
    expect(req.data.value).toBe('fresh');
  });

  it('does not report cancellation as an error', async () => {
    const req = useRequest(async () => { const e = new Error('c'); e.code = 'ERR_CANCELED'; throw e; });
    await req.run();
    expect(req.error.value).toBe('');
  });

  it('sets a default error message and clears it on retry', async () => {
    let fail = true;
    const req = useRequest(async () => { if (fail) throw { response: { status: 500 } }; return 'fine'; });
    await req.run();
    expect(req.error.value).toMatch(/Serverda xatolik/);
    fail = false;
    await req.retry();
    expect(req.error.value).toBe('');
    expect(req.data.value).toBe('fine');
  });

  it('uses mapError / onError when provided', async () => {
    const onError = vi.fn();
    const req = useRequest(async () => { throw { response: { status: 500 } }; }, { mapError: () => 'custom', onError });
    await req.run();
    expect(req.error.value).toBe('custom');
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('retry reuses the last arguments', async () => {
    const fetcher = vi.fn(async (_ctx, x) => x);
    const req = useRequest(fetcher);
    await req.run(5);
    await req.retry();
    expect(fetcher.mock.calls[1][1]).toBe(5);
  });

  it('scope disposal aborts the request and drops the pending result', async () => {
    const d = deferred();
    let sig;
    const scope = effectScope();
    const req = scope.run(() => useRequest(({ signal }) => { sig = signal; return d.promise; }));
    const p = req.run();
    scope.stop();
    expect(sig.aborted).toBe(true);
    expect(req.loading.value).toBe(false);
    d.resolve('late');
    expect(await p).toBeUndefined();
    expect(req.data.value).toBeNull();
  });
});

describe('usePagedList', () => {
  it('maps rows/total via extractList and resets page on setLimit', async () => {
    const fetchPage = vi.fn(async (_c, { page, limit }) => ({ data: { data: [page, limit], total: 50 } }));
    const list = usePagedList(fetchPage, { limit: 10 });
    await list.load();
    expect(list.rows.value).toEqual([1, 10]);
    expect(list.total.value).toBe(50);
    await list.setPage(3);
    await list.setLimit(20);
    expect(list.page.value).toBe(1);
    expect(fetchPage).toHaveBeenLastCalledWith(expect.anything(), { page: 1, limit: 20 });
  });
});
