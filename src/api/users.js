// Foydalanuvchi endpointlari. Barcha funksiyalar xom axios javobini qaytaradi
// (sahifalar o'z javob shaklini o'zlari ajratadi); config — { signal, params, ... }.
import api from '../lib/axios';

// Foydalanuvchilar ro'yxati endpointidagi "2" — backendning ro'yxat turi (avvalgidek).
export const USERS_LIST_TYPE = 2;

// DIQQAT: bu ikki URLda boshida "/" yo'q (avvalgidek saqlangan). axios 1.12 combineURLs
// baseURL'ni va nisbiy yo'lni "/" bilan o'zi qo'shadi, shuning uchun "/" bilan ham natija bir xil;
// baribir baytma-bayt o'zgartirmaymiz.
export const getUsers = (config) => api.get(`dashboard/users/${USERS_LIST_TYPE}`, config);
export const exportUsers = (body, config) => api.post('dashboard/users/export', body, config);

export const getAdminUser = (id, config) => api.get(`/user/admin/user/${id}`, config);
export const getUserSummary = (key, config) => api.get(`/dashboard/user/${key}/summary`, config);
export const revealUserField = (id, body) => api.post(`/dashboard/users/${id}/reveal`, body);
export const getLoginArchive = (id, config) => api.get(`/user/archive/${id}`, config);
