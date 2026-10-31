import api from '../lib/axios';

export const getContracts = (config) => api.get('/dashboard/contracts', config);
export const getContract = (id, config) => api.get(`/contract/admin/contract/${id}`, config);
export const getContractReport = (endpoint, id, config) => api.get(`/dashboard/con/${endpoint}/${id}`, config);

// To'lovlar bo'limi (tab -> endpoint). "trasfer" — backenddagi asl yozuv.
export const TRANSFER_ENDPOINTS = {
  income: '/dashboard/trasfer/pay',
  withdraw: '/dashboard/trasfer/paid',
  p2p: '/dashboard/trasfer/money-transfer',
};
export const getTransfers = (tab, config) => api.get(TRANSFER_ENDPOINTS[tab], config);
export const cancelClickAtm = (id, body) => api.post(`/dashboard/transfer/click-atm/${id}`, body);
