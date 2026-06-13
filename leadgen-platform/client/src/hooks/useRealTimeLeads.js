import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from './useSocket';
import { LEADS_QUERY_KEY } from './useLeads';
import useScraperStore from '../store/scraperStore';

/**
 * Subscribes to real-time lead and scraper events via Socket.io.
 * Automatically updates the React Query cache when new leads arrive,
 * and syncs scraper progress/status into Zustand.
 */
export function useRealTimeLeads() {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();
  const { setProgress, setRunning, setJob } = useScraperStore();

  useEffect(() => {
    if (!socket || !isConnected) return;

    // New lead scraped — prepend to all leads query caches
    const handleNewLead = (lead) => {
      queryClient.setQueriesData({ queryKey: [LEADS_QUERY_KEY] }, (oldData) => {
        if (!oldData) return oldData;

        // Support both { leads: [] } and { data: [] } shapes
        const leadsKey = oldData.leads ? 'leads' : oldData.data ? 'data' : null;
        if (!leadsKey) return oldData;

        const existingIds = new Set(oldData[leadsKey].map((l) => l._id || l.id));
        if (existingIds.has(lead._id || lead.id)) return oldData;

        return {
          ...oldData,
          [leadsKey]: [lead, ...oldData[leadsKey]],
          total: (oldData.total || 0) + 1,
        };
      });

      // Also invalidate today's stats
      queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY, 'stats', 'today'] });
    };

    // Scraper progress update
    const handleScraperProgress = (progressData) => {
      setProgress(progressData);
    };

    // Scraper started
    const handleScraperStarted = (data) => {
      setRunning(true);
      if (data?.job) setJob(data.job);
    };

    // Scraper finished or stopped
    const handleScraperDone = (data) => {
      setRunning(false);
      if (data?.job) setJob(data.job);
      queryClient.invalidateQueries({ queryKey: ['scraper'] });
      queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] });
    };

    socket.on('lead:new', handleNewLead);
    socket.on('scraper:progress', handleScraperProgress);
    socket.on('scraper:started', handleScraperStarted);
    socket.on('scraper:completed', handleScraperDone);
    socket.on('scraper:stopped', handleScraperDone);
    socket.on('scraper:error', handleScraperDone);

    return () => {
      socket.off('lead:new', handleNewLead);
      socket.off('scraper:progress', handleScraperProgress);
      socket.off('scraper:started', handleScraperStarted);
      socket.off('scraper:completed', handleScraperDone);
      socket.off('scraper:stopped', handleScraperDone);
      socket.off('scraper:error', handleScraperDone);
    };
  }, [socket, isConnected, queryClient, setProgress, setRunning, setJob]);

  return { isConnected };
}

export default useRealTimeLeads;
