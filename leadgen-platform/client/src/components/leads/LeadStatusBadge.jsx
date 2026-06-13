import React from 'react';
import PropTypes from 'prop-types';

const STATUS_MAP = {
  new:            { label: 'New',            bg: '#eff6ff', color: '#2563eb', dot: '#3b82f6' },
  outreached:     { label: 'Outreached',     bg: '#fef3c7', color: '#d97706', dot: '#f59e0b' },
  responded:      { label: 'Responded',      bg: '#d1fae5', color: '#059669', dot: '#10b981' },
  good_lead:      { label: 'Good Lead',      bg: '#dcfce7', color: '#16a34a', dot: '#22c55e' },
  not_interested: { label: 'Not Interested', bg: '#fee2e2', color: '#dc2626', dot: '#ef4444' },
  processing:     { label: 'Processing',     bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af' },
  pending:        { label: 'Pending',        bg: '#fefce8', color: '#ca8a04', dot: '#eab308' },
};

function LeadStatusBadge({ status, size }) {
  const s = STATUS_MAP[status] || { label: status || 'Unknown', bg: '#f3f4f6', color: '#374151', dot: '#9ca3af' };
  const isSmall = size === 'sm';

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: s.bg, color: s.color,
      padding: isSmall ? '2px 8px' : '4px 12px',
      borderRadius: '99px',
      fontSize: isSmall ? '11px' : '12px',
      fontWeight: '600',
      whiteSpace: 'nowrap',
      userSelect: 'none',
    }}>
      <span style={{
        width: isSmall ? '5px' : '6px',
        height: isSmall ? '5px' : '6px',
        borderRadius: '50%',
        background: s.dot,
        flexShrink: 0,
      }} />
      {s.label}
    </span>
  );
}

LeadStatusBadge.propTypes = {
  status: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md']),
};

LeadStatusBadge.defaultProps = {
  status: 'new',
  size: 'md',
};

export default LeadStatusBadge;
