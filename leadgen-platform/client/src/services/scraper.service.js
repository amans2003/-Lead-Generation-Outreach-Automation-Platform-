import api from './api';

const ScraperService = {
  /**
   * Start a new scrape job.
   * payload: { sources, categories, city, limit }
   */
  startScrape: async (payload = {}) => {
    const response = await api.post('/scraper/start', payload);
    return response.data;
  },

  /**
   * Stop the currently running scrape job.
   */
  stopScrape: async () => {
    const response = await api.post('/scraper/stop');
    return response.data;
  },

  /**
   * Get the current scraper status and progress.
   */
  getStatus: async () => {
    const response = await api.get('/scraper/status');
    return response.data;
  },

  /**
   * Get history of past scrape jobs.
   */
  getJobHistory: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await api.get(`/scraper/history${query ? `?${query}` : ''}`);
    return response.data;
  },

  /**
   * Get deduplication statistics.
   */
  getDedupStats: async () => {
    const response = await api.get('/scraper/dedup-stats');
    return response.data;
  },
};

export default ScraperService;
