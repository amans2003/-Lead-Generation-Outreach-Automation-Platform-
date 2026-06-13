import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { formatDistanceToNow, parseISO } from 'date-fns';

const STATUS_CONFIG = {
  active:    { label: 'Active',    bg: '#dcfce7', color: '#16a34a', dot: '#22c55e' },
  paused:    { label: 'Paused',    bg: '#fef3c7', color: '#d97706', dot: '#f59e0b' },
  completed: { label: 'Completed', bg: '#eff6ff', color: '#2563eb', dot: '#3b82f6' },
  draft:     { label: 'Draft',     bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af' },
  failed:    { label: 'Failed',    bg: '#fee2e2', color: '#dc2626', dot: '#ef4444' },
};

function CampaignCard({ campaign, onPause, onResume, onDelete, onViewDetails }) {
  const [hover, setHover] = useState(false);
  const s = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
  const { sent = 0, delivered = 0, responded = 0, target = 0 } = campaign.stats || {};
  const progress = target > 0 ? Math.min(100, Math.round((sent / target) * 100)) : 0;

  function timeAgo(d) {
    try { return formatDistanceToNow(parseISO(d), { addSuffix: true }); } catch { return d || '—'; }
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: '#fff', borderRadius: '14px', padding: '20px',
        border: `1px solid ${hover ? '#bfdbfe' : '#e5e7eb'}`,
        boxShadow: hover ? '0 4px 16px rgba(59,130,246,0.1)' : '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'all 0.15s',
        display: 'flex', flexDirection: 'column', gap: '14px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{
            margin: '0 0 4px', fontSize: '15px', fontWeight: '700', color: '#111827',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {campaign.name || 'Unnamed Campaign'}
          </h4>
          <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
            {timeAgo(campaign.createdAt)}
          </p>
        </div>
        <span style={{
          background: s.bg, color: s.color, padding: '3px 10px',
          borderRadius: '99px', fontSize: '12px', fontWeight: '600',
          display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0,
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot }} />
          {s.label}
        </span>
      </div>

      {/* Channels */}
      {campaign.channels && campaign.channels.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {campaign.channels.map(ch => (
            <span key={ch} style={{
              padding: '2px 8px', borderRadius: '99px',
              background: '#f3f4f6', color: '#374151', fontSize: '12px',
            }}>
              {ch}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {[
          { label: 'Sent',      value: sent,      color: '#3b82f6' },
          { label: 'Delivered', value: delivered, color: '#10b981' },
          { label: 'Responded', value: responded, color: '#f59e0b' },
        ].map(item => (
          <div key={item.label} style={{
            background: '#f9fafb', borderRadius: '8px', padding: '10px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '18px', fontWeight: '800', color: item.color }}>
              {item.value.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {target > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Sent {sent} of {target}</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#3b82f6' }}>{progress}%</span>
          </div>
          <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
              width: progress + '%', borderRadius: '99px', transition: 'width 0.4s',
            }} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', paddingTop: '4px', borderTop: '1px solid #f3f4f6' }}>
        <button
          onClick={() => onViewDetails(campaign)}
          style={{
            flex: 2, padding: '8px', background: '#eff6ff', color: '#2563eb',
            border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
          }}
        >
          View Details
        </button>
        {campaign.status === 'active' ? (
          <button
            onClick={() => onPause(campaign._id || campaign.id)}
            style={{
              flex: 1, padding: '8px', background: '#fef3c7', color: '#d97706',
              border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
            }}
          >
            Pause
          </button>
        ) : campaign.status === 'paused' ? (
          <button
            onClick={() => onResume(campaign._id || campaign.id)}
            style={{
              flex: 1, padding: '8px', background: '#dcfce7', color: '#16a34a',
              border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
            }}
          >
            Resume
          </button>
        ) : null}
        <button
          onClick={() => onDelete(campaign._id || campaign.id)}
          style={{
            padding: '8px 12px', background: '#fee2e2', color: '#dc2626',
            border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
          }}
        >
          🗑
        </button>
      </div>
    </div>
  );
}

CampaignCard.propTypes = {
  campaign: PropTypes.shape({
    _id:      PropTypes.string,
    id:       PropTypes.string,
    name:     PropTypes.string,
    status:   PropTypes.string,
    channels: PropTypes.arrayOf(PropTypes.string),
    stats:    PropTypes.shape({
      sent:      PropTypes.number,
      delivered: PropTypes.number,
      responded: PropTypes.number,
      target:    PropTypes.number,
    }),
    createdAt: PropTypes.string,
  }).isRequired,
  onPause:       PropTypes.func,
  onResume:      PropTypes.func,
  onDelete:      PropTypes.func,
  onViewDetails: PropTypes.func,
};

CampaignCard.defaultProps = {
  onPause:       () => {},
  onResume:      () => {},
  onDelete:      () => {},
  onViewDetails: () => {},
};

export default CampaignCard;
