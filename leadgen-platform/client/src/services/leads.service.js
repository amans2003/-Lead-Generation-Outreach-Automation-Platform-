import api from './api';

const LeadsService = {
  /**
   * Get paginated leads with optional filters.
   * filters: { page, limit, status, source, category, search, dateFrom, dateTo }
   */
  getLeads: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    const response = await api.get(`/leads?${params.toString()}`);
    return response.data;
  },

  /**
   * Get a single lead by ID.
   */
  getLeadById: async (id) => {
    const response = await api.get(`/leads/${id}`);
    return response.data;
  },

  /**
   * Update a lead's status.
   * status: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected'
   */
  updateLeadStatus: async (id, status) => {
    const response = await api.patch(`/leads/${id}/status`, { status });
    return response.data;
  },

  /**
   * Delete a single lead.
   */
  deleteLead: async (id) => {
    const response = await api.delete(`/leads/${id}`);
    return response.data;
  },

  /**
   * Bulk delete leads by array of IDs.
   */
  bulkDelete: async (ids) => {
    const response = await api.post('/leads/bulk-delete', { ids });
    return response.data;
  },

  /**
   * Export leads as CSV, respecting current filters.
   * Returns a Blob for download.
   */
  exportCSV: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    const response = await api.get(`/leads/export/csv?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get today's lead acquisition stats.
   */
  getTodayStats: async () => {
    const response = await api.get('/leads/stats/today');
    return response.data;
  },
};

export default LeadsService;
