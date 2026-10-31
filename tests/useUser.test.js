import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/api/users', () => ({ getAdminUser: vi.fn() }));

import { getAdminUser } from '../src/api/users';
import { loadUser } from '../src/composables/useUser';

beforeEach(() => {
  getAdminUser.mockReset();
  getAdminUser.mockImplementation(async (id) => ({ data: { id } }));
});

describe('loadUser', () => {
  it('har chaqiruvda serverdan oladi (audit view_user_detail har ko‘rishda yozilsin)', async () => {
    await loadUser('U1');
    await loadUser('U1');
    expect(getAdminUser).toHaveBeenCalledTimes(2);
  });

  it('signal so‘rovga uzatiladi', async () => {
    const ac = new AbortController();
    await loadUser('U7', { signal: ac.signal });
    expect(getAdminUser).toHaveBeenCalledWith('U7', { signal: ac.signal });
  });

  it('xato chaqiruvchiga qaytadi', async () => {
    getAdminUser.mockRejectedValueOnce(new Error('boom'));
    await expect(loadUser('U1')).rejects.toThrow('boom');
  });
});
