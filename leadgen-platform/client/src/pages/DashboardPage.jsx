import React, { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import StatsCard from '../components/dashboard/StatsCard';
import LeadChart from '../components/dashboard/LeadChart';
import OutreachProgress from '../components/dashboard/OutreachProgress';
import RecentLeads from '../components/dashboard/RecentLeads';

const API = import.meta.env.VITE_API_URL || '';
const token = () => localStorage.getItem('token');

async function apiFetch(path) {
  const res = await fetch(API + path, {
    headers: { Authorization: 'Bearer ' + token() },
  });
  if (!res.ok) throw new Error('API error');
  return res.json();
}

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
    try {
      const [statsData, chartRes, recentRes, funnelRes] = await Promise.all([
        apiFetch('/api/v1/dashboard/stats'),
        apiFetch('/api/v1/dashboard/chart?days=30'),
        apiFetch('/api/v1/leads?limit=10&sort=-createdAt'),
        apiFetch('/api/v1/dashboard/funnel'),
      ]);
      setStats(statsData);
      setChartData(chartRes.data || []);
      setRecentLeads(recentRes.data?.leads || recentRes.leads || []);
      setFunnelData(funnelRes);
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Socket.io for live scraper progress
  useEffect(() => {
    const socket = io(API, { transports: ['websocket', 'polling'] });

    socket.on('scraper:progress', (data) => {
      setScraper(prev => ({ ...prev, ...data }));
    });

    socket.on('scraper:started', () => {
      setScraper(prev => ({ ...prev, running: true }));
    });

    socket.on('scraper:stopped', () => {
      setScraper(prev => ({ ...prev, running: false }));
      loadDashboard(); // Refresh stats when scraper stops
    });

    socket.on('lead:new', () => {
      // Increment new today counter
      setStats(prev => ({
        ...prev,
        totalLeads: prev.totalLeads + 1,
        newToday: prev.newToday + 1,
      }));
    });

    return () => socket.disconnect();
  }, [loadDashboard]);

  const STATS_CARDS = [
    { title: 'Total Leads',  value: stats.totalLeads, icon: '📋', color: 'blue',   trend: stats.trends?.totalLeads },
    { title: 'New Today',    value: stats.newToday,   icon: '✨', color: 'green',  trend: stats.trends?.newToday },
    { title: 'Good Leads',   value: stats.goodLeads,  icon: '⭐', color: 'purple', trend: stats.trends?.goodLeads },
    { title: 'Outreached',   value: stats.outreached, icon: '📤', color: 'orange', trend: stats.trends?.outreached },
    { title: 'Responded',    value: stats.responded,  icon: '💬', color: 'indigo', trend: stats.trends?.responded },
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
      {/* Page header */}
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

      {/* Live scraper progress bar */}
      {scraper.running && (
        <LiveBar scraped={scraper.scraped} target={scraper.target} message={scraper.message} />
      )}

      {/* Stats cards */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {STATS_CARDS.map(card => (
          <StatsCard key={card.title} {...card} />
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <LeadChart data={chartData} />
        <OutreachProgress
          scraped={funnelData.scraped || stats.totalLeads}
          outreached={funnelData.outreached || stats.outreached}
          responded={funnelData.responded || stats.responded}
          goodLeads={funnelData.goodLeads || stats.goodLeads}
        />
      </div>

      {/* Recent leads */}
      <RecentLeads leads={recentLeads} />
    </div>
  );
}

export default DashboardPage;
