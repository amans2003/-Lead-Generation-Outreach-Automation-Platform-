import React from 'react';
import PropTypes from 'prop-types';

const CHANNEL_CONFIG = {
  whatsapp: { label: 'WhatsApp',  icon: '💬', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  email:    { label: 'Email',     icon: '📧', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  sms:      { label: 'SMS',       icon: '📱', color: '#9333ea', bg: '#fdf4ff', border: '#e9d5ff' },
  linkedin: { label: 'LinkedIn',  icon: '🔗', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
};

function StatRow({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: '700', color: '#111827' }}>
          {(value || 0).toLocaleString()}
          {total > 0 && <span style={{ color: '#9ca3af', fontWeight: '400' }}> ({pct}%)</span>}
        </span>
      </div>
      {total > 0 && (
        <div style={{ height: '4px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: color, borderRadius: '99px',
            width: pct + '%', transition: 'width 0.4s',
          }} />
        </div>
      )}
    </div>
  );
}

StatRow.propTypes = { label: PropTypes.string, value: PropTypes.number, total: PropTypes.number, color: PropTypes.string };

function ChannelCard({ channel, stats }) {
  const cfg = CHANNEL_CONFIG[channel] || { label: channel, icon: '✉', color: '#374151', bg: '#f9fafb', border: '#e5e7eb' };
  const { sent = 0, delivered = 0, responded = 0, failed = 0 } = stats || {};

  return (
    <div style={{
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: '12px', padding: '16px 18px', flex: 1, minWidth: '200px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ fontSize: '20px' }}>{cfg.icon}</span>
        <span style={{ fontWeight: '700', fontSize: '14px', color: cfg.color }}>{cfg.label}</span>
      </div>
      <StatRow label="Sent"      value={sent}      total={sent}      color={cfg.color} />
      <StatRow label="Delivered" value={delivered} total={sent}      color={cfg.color} />
      <StatRow label="Responded" value={responded} total={delivered} color={cfg.color} />
      {failed > 0 && <StatRow label="Failed" value={failed} total={sent} color="#ef4444" />}
    </div>
  );
}

ChannelCard.propTypes = {
  channel: PropTypes.string.isRequired,
  stats: PropTypes.shape({
    sent:      PropTypes.number,
    delivered: PropTypes.number,
    responded: PropTypes.number,
    failed:    PropTypes.number,
  }),
};

function OutreachStats({ stats }) {
  const channels = Object.keys(CHANNEL_CONFIG);

  const totals = channels.reduce((acc, ch) => {
    const s = stats?.[ch] || {};
    acc.sent      += s.sent      || 0;
    acc.delivered += s.delivered || 0;
    acc.responded += s.responded || 0;
    return acc;
  }, { sent: 0, delivered: 0, responded: 0 });

  return (
    <div style={{
      background: '#fff', borderRadius: '12px', padding: '20px 24px',
      border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#111827' }}>
          Outreach Statistics
        </h3>
        <div style={{ display: 'flex', gap: '16px' }}>
          {[
            { label: 'Total Sent',      value: totals.sent,      color: '#3b82f6' },
            { label: 'Delivered',       value: totals.delivered, color: '#10b981' },
            { label: 'Responded',       value: totals.responded, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '800', color: s.color }}>
                {s.value.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {channels.map(ch => (
          <ChannelCard key={ch} channel={ch} stats={stats?.[ch]} />
        ))}
      </div>
    </div>
  );
}

OutreachStats.propTypes = {
  stats: PropTypes.shape({
    whatsapp: PropTypes.object,
    email:    PropTypes.object,
    sms:      PropTypes.object,
    linkedin: PropTypes.object,
  }),
};

OutreachStats.defaultProps = {
  stats: {},
};

export default OutreachStats;
