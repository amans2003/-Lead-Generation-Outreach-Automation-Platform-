import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ScraperService from '../services/scraper.service';
import useScraperStore from '../store/scraperStore';

export const SCRAPER_QUERY_KEY = 'scraper';

/**
 * Poll the scraper status every 5 seconds when a job might be running.
 */
export function useScraperStatus() {
  const { setRunning, setProgress, setJob, isRunning } = useScraperStore();

  return useQuery({
    queryKey: [SCRAPER_QUERY_KEY, 'status'],
    queryFn: async () => {
      const data = await ScraperService.getStatus();
      setRunning(data.isRunning ?? false);
      if (data.progress) setProgress(data.progress);
      if (data.job) setJob(data.job);
      return data;
    },
    refetchInterval: isRunning ? 5000 : false,
    refetchIntervalInBackground: false,
  });
}

/**
 * Mutation — start a scrape job.
 * payload: { sources, categories, city, limit }
 */
export function useStartScrape() {
  const queryClient = useQueryClient();
  const { setRunning, setJob, resetProgress } = useScraperStore();

  return useMutation({
    mutationFn: (payload) => ScraperService.startScrape(payload),
    onSuccess: (data) => {
      setRunning(true);
      resetProgress();
      if (data.job) setJob(data.job);
      queryClient.invalidateQueries({ queryKey: [SCRAPER_QUERY_KEY] });
    },
  });
}

/**
 * Mutation — stop the running scrape job.
 */
export function useStopScrape() {
  const queryClient = useQueryClient();
  const { setRunning } = useScraperStore();

  return useMutation({
    mutationFn: ScraperService.stopScrape,
    onSuccess: () => {
      setRunning(false);
      queryClient.invalidateQueries({ queryKey: [SCRAPER_QUERY_KEY] });
    },
  });
}

/**
 * Fetch scrape job history.
 */
export function useJobHistory(params = {}) {
  return useQuery({
    queryKey: [SCRAPER_QUERY_KEY, 'history', params],
    queryFn: () => ScraperService.getJobHistory(params),
  });
}

/**
 * Fetch deduplication stats.
 */
export function useDedupStats() {
  return useQuery({
    queryKey: [SCRAPER_QUERY_KEY, 'dedup-stats'],
    queryFn: ScraperService.getDedupStats,
    staleTime: 5 * 60 * 1000,
  });
}
