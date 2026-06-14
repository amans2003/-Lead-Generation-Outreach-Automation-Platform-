import React, { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';
import StatsCard from '../components/dashboard/StatsCard';
import LeadChart from '../components/dashboard/LeadChart';
import OutreachProgress from '../components/dashboard/OutreachProgress';
import RecentLeads from '../components/dashboard/RecentLeads';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

function LiveBar({ scraped, target, message }) {
  const pct = target > 0 ? Math.min(100, Math.round((scraped / target) * 100)) : 0;
  return (
    <div style={{
      background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px',
      padding: '14px 20px', marginBottom: '20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e',
            animation: 'pulse 1s infinite',
          }} />
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#2563eb' }}>
            Scraper Running — {message || 'Collecting leads…'}
          </span>
        </div>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#2563eb' }}>
          {scraped.toLocaleString()} / {target.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div style={{ height: '8px', background: '#dbeafe', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
          width: pct + '%', borderRadius: '99px', transition: 'width 0.5s',
        }} />
      </div>
    </div>
  );
}

function DashboardPage() {
  const [stats, setStats] = useState({
    totalLeads: 0, newToday: 0, goodLeads: 0, outreached: 0, responded: 0,
    trends: {},
  });
  const [chartData, setChartData] = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);
  const [funnelData, setFunnelData] = useState({});
  const [scraper, setScraper] = useState({ running: false, scraped: 0, target: 0, message: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setError('');
    try {
      const [statsRes, chartRes, leadsRes, funnelRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/chart', { params: { days: 30 } }),
        api.get('/leads', { params: { limit: 10, sortBy: 'createdAt', sortOrder: 'desc' } }),
        api.get('/dashboard/funnel'),
      ]);

      setStats(statsRes.data || {});
      setChartData(chartRes.data?.data || []);
      setRecentLeads(
        leadsRes.data?.data?.leads ||
        leadsRes.data?.leads ||
        []
      );
      setFunnelData(funnelRes.data || {});
    } catch (err) {
      // 401 is handled by the api interceptor (auto-refresh or redirect to login)
      if (err?.response?.status !== 401) {
        setError('Failed to load dashboard data. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Socket.io for live scraper progress
  useEffect(() => {
    let socket;
    try {
      socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

      socket.on('scraper:progress', (data) => {
        if (data) setScraper(prev => ({ ...prev, ...data }));
      });

      socket.on('scraper:started', () => {
        setScraper(prev => ({ ...prev, running: true }));
      });

      socket.on('scraper:completed', () => {
        setScraper(prev => ({ ...prev, running: false }));
        loadDashboard();
      });

      socket.on('scraper:stopped', () => {
        setScraper(prev => ({ ...prev, running: false }));
        loadDashboard();
      });

      socket.on('lead:new', () => {
        setStats(prev => ({
          ...prev,
          totalLeads: (prev.totalLeads || 0) + 1,
          newToday:   (prev.newToday   || 0) + 1,
        }));
      });
    } catch (_) {
      // socket.io connection failure is non-fatal — dashboard still works
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [loadDashboard]);

  const STATS_CARDS = [
    { title: 'Total Leads', value: stats.totalLeads ?? 0, icon: '📋', color: 'blue',   trend: stats.trends?.totalLeads },
    { title: 'New Today',   value: stats.newToday   ?? 0, icon: '✨', color: 'green',  trend: stats.trends?.newToday },
    { title: 'Good Leads',  value: stats.goodLeads  ?? 0, icon: '⭐', color: 'purple', trend: stats.trends?.goodLeads },
    { title: 'Outreached',  value: stats.outreached ?? 0, icon: '📤', color: 'orange', trend: stats.trends?.outreached },
    { title: 'Responded',   value: stats.responded  ?? 0, icon: '💬', color: 'indigo', trend: stats.trends?.responded },
  ];

  if (loading) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '14px', color: '#9ca3af',
      }}>
        Loading dashboard…
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '800', color: '#111827' }}>
          Dashboard
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
          Real-time overview of your lead generation pipeline
        </p>
      </div>

      {error && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '10px',
          padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#dc2626',
        }}>
          {error}
          <button onClick={loadDashboard} style={{
            marginLeft: '12px', background: 'none', border: 'none',
            color: '#dc2626', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px',
          }}>
            Retry
          </button>
        </div>
      )}

      {scraper.running && (
        <LiveBar scraped={scraper.scraped} target={scraper.target} message={scraper.message} />
      )}

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {STATS_CARDS.map(card => (
          <StatsCard key={card.title} {...card} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <LeadChart data={chartData} />
        <OutreachProgress
          scraped={funnelData.scraped ?? stats.totalLeads ?? 0}
          outreached={funnelData.outreached ?? stats.outreached ?? 0}
          responded={funnelData.responded ?? stats.responded ?? 0}
          goodLeads={funnelData.goodLeads ?? stats.goodLeads ?? 0}
        />
      </div>

      <RecentLeads leads={recentLeads} />
    </div>
  );
}

export default DashboardPage;
