import { create } from 'zustand';

const useOutreachStore = create((set) => ({
  whatsappStatus: 'disconnected', // 'disconnected' | 'connecting' | 'connected' | 'qr_ready'
  qrCode: null,

  setWhatsAppStatus: (status) => set({ whatsappStatus: status }),

  setQRCode: (qrCode) => set({ qrCode }),

  clearQRCode: () => set({ qrCode: null }),
}));

export default useOutreachStore;
