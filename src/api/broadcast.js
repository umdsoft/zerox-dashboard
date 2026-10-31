import api from '../lib/axios';

export const getAudience = (config) => api.get('/dashboard/broadcasts/audience', config);
export const getBroadcasts = (config) => api.get('/dashboard/broadcasts', config);
export const sendBroadcast = (body, config) => api.post('/dashboard/broadcasts', body, config);
export const stopBroadcast = (config) => api.post('/dashboard/broadcasts/stop', undefined, config);
