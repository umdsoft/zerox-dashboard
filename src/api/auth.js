// Admin autentifikatsiyasi + adminlar boshqaruvi + audit jurnali.
// Auth URLlari interceptor'dagi isAuthCall regex'i bilan mos bo'lishi shart — o'zgartirmang.
import api from '../lib/axios';

export const login = (payload) => api.post('/admin/auth/login', payload);
export const telegramResend = (challengeToken) => api.post('/admin/auth/telegram/resend', { challenge_token: challengeToken });
export const verify = (body) => api.post('/admin/auth/verify', body);
export const getMe = () => api.get('/admin/auth/me');
export const logout = (config) => api.post('/admin/auth/logout', null, config);

export const getAdmins = (config) => api.get('/dashboard/admins', config);
export const changeAdminRole = (id, body) => api.patch(`/dashboard/admins/${id}/role`, body);
export const getAuditLogs = (config) => api.get('/dashboard/audit-logs', config);
