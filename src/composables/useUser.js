import { getAdminUser } from '../api/users';
import { useRequest } from './useRequest';

// Foydalanuvchi kartasi (/user/admin/user/:id) — Detail va Contracts sahifalari uchun yagona yuklash.
// KESH YO'Q (ataylab): backend har ko'rishni audit jurnaliga yozadi (view_user_detail) va balans
// boshqa admin amallaridan keyin darhol yangilanishi kerak. Har sahifa javobni o'z normalizatsiyasi bilan oladi.

/** Xom axios javobi. */
export function loadUser(id, { signal } = {}) {
  return getAdminUser(id, { signal });
}

/** useRequest o'rami: run({ id }) — natija xom axios javobi. */
export function useUser(options = {}) {
  return useRequest(({ signal }, { id } = {}) => loadUser(id, { signal }), options);
}
