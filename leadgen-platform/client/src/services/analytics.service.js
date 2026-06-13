import api from './api';

const AnalyticsService = {
  getFunnelData: async () => {
    const res = await api.get('/analytics/funnel');
    return res.data;
  },
  getDuplicateTrend: async (days = 30) => {
    const res = await api.get(`/analytics/duplicate-trend?days=${days}`);
    return res.data;
  },
  getSourcePerformance: async () => {
    const res = await api.get('/analytics/source-performance');
    return res.data;
  },
  getCategoryPerformance: async () => {
    const res = await api.get('/analytics/category-performance');
    return res.data;
  },
  getResponseTimeDistribution: async () => {
    const res = await api.get('/analytics/response-time');
    return res.data;
  },
  getOverview: async () => {
    const res = await api.get('/analytics/overview');
    return res.data;
  },
};

export default AnalyticsService;

// Named react-query hooks (useQuery wrappers)
import { useQuery } from '@tanstack/react-query';

export function useFunnelData() {
  return useQuery({
    queryKey: ['analytics', 'funnel'],
    queryFn: AnalyticsService.getFunnelData,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDuplicateTrend(days) {
  return useQuery({
    queryKey: ['analytics', 'duplicate-trend', days],
    queryFn: () => AnalyticsService.getDuplicateTrend(days),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSourcePerformance() {
  return useQuery({
    queryKey: ['analytics', 'source-performance'],
    queryFn: AnalyticsService.getSourcePerformance,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategoryPerformance() {
  return useQuery({
    queryKey: ['analytics', 'category-performance'],
    queryFn: AnalyticsService.getCategoryPerformance,
    staleTime: 5 * 60 * 1000,
  });
}

export function useResponseTimeDistribution() {
  return useQuery({
    queryKey: ['analytics', 'response-time'],
    queryFn: AnalyticsService.getResponseTimeDistribution,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: AnalyticsService.getOverview,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
