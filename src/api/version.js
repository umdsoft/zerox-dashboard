import api from '../lib/axios';

export const getVersions = (config) => api.get('/version/for-admin', config);
export const createVersion = (payload) => api.post('/version/create', payload);
export const updateVersion = (id, payload) => api.put(`/version/${id}`, payload);
export const deleteVersion = (id) => api.delete(`/version/${id}`);
