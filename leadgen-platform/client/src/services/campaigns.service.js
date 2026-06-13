import api from './api';

const CampaignsService = {
  list: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const res = await api.get(`/campaigns${q ? `?${q}` : ''}`);
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/campaigns/${id}`);
    return res.data;
  },
  create: async (payload) => {
    const res = await api.post('/campaigns', payload);
    return res.data;
  },
  update: async (id, payload) => {
    const res = await api.put(`/campaigns/${id}`, payload);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/campaigns/${id}`);
    return res.data;
  },
  pause: async (id) => {
    const res = await api.post(`/campaigns/${id}/pause`);
    return res.data;
  },
  resume: async (id) => {
    const res = await api.post(`/campaigns/${id}/resume`);
    return res.data;
  },
  getStats: async () => {
    const res = await api.get('/campaigns/stats/summary');
    return res.data;
  },
};

export default CampaignsService;
