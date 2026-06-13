import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || '';

function StatBox({ label, value, color }) {
  return (
    <div style={{
      flex: 1, background: '#f9fafb', borderRadius: '10px', padding: '14px 16px',
      textAlign: 'center', border: '1px solid #f3f4f6',
    }}>
      <div style={{ fontSize: '24px', fontWeight: '800', color: color || '#111827' }}>
        {(value || 0).toLocaleString()}
      </div>
      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
    </div>
  );
}

StatBox.propTypes = { label: PropTypes.string, value: PropTypes.number, color: PropTypes.string };

function ScraperStatus({ initialStats, socketEnabled }) {
  const [stats, setStats] = useState({
    scraped:    initialStats?.scraped    || 0,
    newLeads:   initialStats?.newLeads   || 0,
    duplicates: initialStats?.duplicates || 0,
    pctComplete: initialStats?.pctComplete || 0,
    running:    initialStats?.running    || false,
    lastUpdated: null,
  });
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!socketEnabled) return;
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('scraper:stats', (data) => {
      setStats(prev => ({ ...prev, ...data, lastUpdated: new Date() }));
    });

    socket.on('scraper:progress', (data) => {
      setStats(prev => ({
        ...prev,
        scraped:     data.scraped     ?? prev.scraped,
        newLeads:    data.newLeads    ?? prev.newLeads,
        duplicates:  data.duplicates  ?? prev.duplicates,
        pctComplete: data.pctComplete ?? prev.pctComplete,
        running:     data.running     ?? prev.running,
        lastUpdated: new Date(),
      }));
    });

    return () => socket.disconnect();
  }, [socketEnabled]);

  return (
    <div style={{
      background: '#fff', borderRadius: '12px', padding: '20px 24px',
      border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#111827' }}>
          Live Scraper Stats
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {socketEnabled && (
            <>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: connected ? '#22c55e' : '#d1d5db',
              }} />
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                {connected ? 'Live' : 'Offline'}
              </span>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <StatBox label="Total Scraped" value={stats.scraped}    color="#3b82f6" />
        <StatBox label="New Leads"     value={stats.newLeads}   color="#16a34a" />
        <StatBox label="Duplicates"    value={stats.duplicates} color="#f59e0b" />
      </div>

      <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', color: '#6b7280' }}>Daily progress</span>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#3b82f6' }}>
          {stats.pctComplete}%
        </span>
      </div>
      <div style={{ height: '8px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: '99px',
          background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
          width: stats.pctComplete + '%',
          transition: 'width 0.4s ease',
        }} />
      </div>

      {stats.lastUpdated && (
        <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#d1d5db', textAlign: 'right' }}>
          Updated {stats.lastUpdated.toLocaleTimeString()}
        </p>
      )}

      {stats.running && (
        <div style={{
          marginTop: '12px', padding: '8px 14px', background: '#f0fdf4',
          border: '1px solid #bbf7d0', borderRadius: '8px',
          fontSize: '13px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙</span>
          Scraper is actively running…
        </div>
      )}
    </div>
  );
}

ScraperStatus.propTypes = {
  initialStats: PropTypes.shape({
    scraped:     PropTypes.number,
    newLeads:    PropTypes.number,
    duplicates:  PropTypes.number,
    pctComplete: PropTypes.number,
    running:     PropTypes.bool,
  }),
  socketEnabled: PropTypes.bool,
};

ScraperStatus.defaultProps = {
  initialStats:  null,
  socketEnabled: true,
};

export default ScraperStatus;
