import api from './api';

const OutreachService = {
  /**
   * Send a single WhatsApp/outreach message.
   * data: { leadId, phone, message, channel }
   */
  sendSingle: async (data) => {
    const response = await api.post('/outreach/send', data);
    return response.data;
  },

  /**
   * Create and dispatch a bulk outreach campaign.
   * data: { name, message, leadIds, channel, scheduledAt }
   */
  createCampaign: async (data) => {
    const response = await api.post('/outreach/campaigns', data);
    return response.data;
  },

  /**
   * Get outreach activity logs.
   */
  getLogs: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await api.get(`/outreach/logs${query ? `?${query}` : ''}`);
    return response.data;
  },

  /**
   * Get the WhatsApp QR code for scanning.
   * Returns { qrCode: <base64 string> }
   */
  getWhatsAppQR: async () => {
    const response = await api.get('/outreach/whatsapp/qr');
    return response.data;
  },

  /**
   * Get the current WhatsApp connection status.
   * Returns { status: 'disconnected' | 'connecting' | 'connected' }
   */
  getWhatsAppStatus: async () => {
    const response = await api.get('/outreach/whatsapp/status');
    return response.data;
  },
};

export default OutreachService;
