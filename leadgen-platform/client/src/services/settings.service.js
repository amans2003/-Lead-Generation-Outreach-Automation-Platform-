import api from './api';

const SettingsService = {
  getProfile: async () => {
    const res = await api.get('/settings/profile');
    return res.data;
  },
  updateProfile: async (payload) => {
    const res = await api.put('/settings/profile', payload);
    return res.data;
  },
  changePassword: async (payload) => {
    const res = await api.post('/settings/change-password', payload);
    return res.data;
  },
  getApiKeyStatus: async () => {
    const res = await api.get('/settings/api-keys');
    return res.data;
  },
  getRateLimits: async () => {
    const res = await api.get('/settings/rate-limits');
    return res.data;
  },
  updateRateLimits: async (payload) => {
    const res = await api.put('/settings/rate-limits', payload);
    return res.data;
  },
  getBlocklist: async () => {
    const res = await api.get('/settings/blocklist');
    return res.data;
  },
  addToBlocklist: async (entry) => {
    const res = await api.post('/settings/blocklist', { entry });
    return res.data;
  },
  removeFromBlocklist: async (id) => {
    const res = await api.delete(`/settings/blocklist/${id}`);
    return res.data;
  },
};

export default SettingsService;
