import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import OutreachService from '../services/outreach.service';
import useOutreachStore from '../store/outreachStore';

export const OUTREACH_QUERY_KEY = 'outreach';

/**
 * Mutation — send a single outreach message.
 * data: { leadId, phone, message, channel }
 */
export function useSendSingle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => OutreachService.sendSingle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [OUTREACH_QUERY_KEY, 'logs'] });
    },
  });
}

/**
 * Mutation — create a bulk outreach campaign.
 * data: { name, message, leadIds, channel, scheduledAt }
 */
export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => OutreachService.createCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [OUTREACH_QUERY_KEY, 'logs'] });
    },
  });
}

/**
 * Fetch outreach activity logs.
 */
export function useOutreachLogs(params = {}) {
  return useQuery({
    queryKey: [OUTREACH_QUERY_KEY, 'logs', params],
    queryFn: () => OutreachService.getLogs(params),
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch (or poll for) a WhatsApp QR code.
 * Only active when status is 'qr_ready' or 'connecting'.
 */
export function useWhatsAppQR() {
  const { whatsappStatus, setQRCode } = useOutreachStore();
  const shouldFetch = ['qr_ready', 'connecting'].includes(whatsappStatus);

  return useQuery({
    queryKey: [OUTREACH_QUERY_KEY, 'whatsapp', 'qr'],
    queryFn: async () => {
      const data = await OutreachService.getWhatsAppQR();
      if (data.qrCode) setQRCode(data.qrCode);
      return data;
    },
    enabled: shouldFetch,
    refetchInterval: shouldFetch ? 10000 : false,
  });
}

/**
 * Poll WhatsApp connection status every 5 seconds.
 */
export function useWhatsAppStatus() {
  const { setWhatsAppStatus, whatsappStatus } = useOutreachStore();
  const isPolling = whatsappStatus !== 'connected';

  return useQuery({
    queryKey: [OUTREACH_QUERY_KEY, 'whatsapp', 'status'],
    queryFn: async () => {
      const data = await OutreachService.getWhatsAppStatus();
      if (data.status) setWhatsAppStatus(data.status);
      return data;
    },
    refetchInterval: isPolling ? 5000 : 30000,
  });
}
