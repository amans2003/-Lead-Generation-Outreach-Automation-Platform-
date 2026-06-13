import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import LeadsService from '../services/leads.service';

export const LEADS_QUERY_KEY = 'leads';

/**
 * Fetch a paginated, filtered list of leads.
 * filters: { page, limit, status, source, category, search, dateFrom, dateTo }
 */
export function useLeads(filters = {}) {
  return useQuery({
    queryKey: [LEADS_QUERY_KEY, filters],
    queryFn: () => LeadsService.getLeads(filters),
    keepPreviousData: true,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch a single lead by ID.
 */
export function useLeadById(id) {
  return useQuery({
    queryKey: [LEADS_QUERY_KEY, id],
    queryFn: () => LeadsService.getLeadById(id),
    enabled: !!id,
  });
}

/**
 * Mutation — update the status of a lead.
 */
export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }) => LeadsService.updateLeadStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] });
    },
  });
}

/**
 * Mutation — delete a single lead.
 */
export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => LeadsService.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] });
    },
  });
}

/**
 * Mutation — bulk delete leads.
 */
export function useBulkDeleteLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids) => LeadsService.bulkDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] });
    },
  });
}

/**
 * Mutation — export leads as CSV blob.
 */
export function useExportCSV() {
  return useMutation({
    mutationFn: (filters) => LeadsService.exportCSV(filters),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  });
}

/**
 * Fetch today's lead stats.
 */
export function useTodayStats() {
  return useQuery({
    queryKey: [LEADS_QUERY_KEY, 'stats', 'today'],
    queryFn: LeadsService.getTodayStats,
    refetchInterval: 60 * 1000, // refetch every 60s
  });
}
