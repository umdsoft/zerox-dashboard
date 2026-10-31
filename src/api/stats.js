import api from '../lib/axios';

export const getStatistic = (config) => api.get('/dashboard/statistic', config);
export const getMobileBalance = (config) => api.get('/dashboard/stats/mobile-balance', config);
export const getDailyActivity = (config) => api.get('/dashboard/stats/daily-activity', config);
export const getPersonalDebt = (config) => api.get('/dashboard/stats/personal-debt', config);
export const getPersonalFinance = (config) => api.get('/dashboard/stats/personal-finance', config);
export const getRevenueContributors = (config) => api.get('/dashboard/stats/revenue-contributors', config);

export const getQarzDaftari = (config) => api.get('/dashboard/stats/qarz-daftari', config);
export const getShopsByRegion = (config) => api.get('/dashboard/stats/shops-by-region', config);
export const getQarzShops = (config) => api.get('/dashboard/stats/qarz-daftari/shops', config);
export const getShopDebtors = (shopId, config) => api.get(`/dashboard/stats/qarz-daftari/shops/${shopId}/debtors`, config);
export const getDebtorSms = (shopId, debtorId, config) =>
  api.get(`/dashboard/stats/qarz-daftari/shops/${shopId}/debtors/${debtorId}/sms`, config);

export const getStore = (id, config) => api.get(`/dashboard/store/${id}`, config);
