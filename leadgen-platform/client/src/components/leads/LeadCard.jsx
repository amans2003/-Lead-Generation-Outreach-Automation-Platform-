import React, { useState } from 'react';
import PropTypes from 'prop-types';
import LeadStatusBadge from './LeadStatusBadge';
import { formatDistanceToNow, parseISO } from 'date-fns';

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
      <span style={{ color: '#9ca3af', minWidth: '90px', flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#111827', fontWeight: '500', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

Field.propTypes = { label: PropTypes.string, value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };

function LeadCard({ lead, onStatusChange, onDelete, onViewDetail }) {
  const [hover, setHover] = useState(false);

  function timeAgo(d) {
    try { return formatDistanceToNow(parseISO(d), { addSuffix: true }); } catch { return d || ''; }
  }

  const btnBase = {
    flex: 1, padding: '8px 0', borderRadius: '8px', border: 'none',
    fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'opacity 0.1s',
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: '#fff',
        border: '1px solid ' + (hover ? '#bfdbfe' : '#e5e7eb'),
        borderRadius: '12px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: hover ? '0 4px 16px rgba(59,130,246,0.1)' : '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'all 0.15s',
        cursor: 'pointer',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
            {lead.businessName || 'Unnamed Business'}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{timeAgo(lead.createdAt)}</div>
        </div>
        <LeadStatusBadge status={lead.status} />
      </div>

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Field label="Phone"    value={lead.phone} />
        <Field label="Email"    value={lead.email} />
        <Field label="Category" value={lead.category} />
        <Field label="City"     value={lead.city} />
        <Field label="Source"   value={lead.source} />
        {lead.website && (
          <div style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
            <span style={{ color: '#9ca3af', minWidth: '90px' }}>Website</span>
            <a href={lead.website} target="_blank" rel="noopener noreferrer"
              style={{ color: '#3b82f6', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lead.website}
            </a>
          </div>
        )}
        {lead.address && <Field label="Address" value={lead.address} />}
        {lead.notes && (
          <div style={{ fontSize: '13px', color: '#6b7280', background: '#f9fafb', padding: '8px', borderRadius: '6px', marginTop: '4px' }}>
            {lead.notes}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', paddingTop: '4px', borderTop: '1px solid #f3f4f6' }}>
        <button
          onClick={() => onViewDetail(lead)}
          style={{ ...btnBase, background: '#eff6ff', color: '#2563eb' }}
        >
          View Details
        </button>
        {lead.phone && (
          <button
            onClick={() => window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`)}
            style={{ ...btnBase, background: '#dcfce7', color: '#16a34a' }}
          >
            WhatsApp
          </button>
        )}
        <button
          onClick={() => onDelete(lead._id || lead.id)}
          style={{ ...btnBase, background: '#fee2e2', color: '#dc2626', flex: '0 0 40px', padding: '8px' }}
        >
          🗑
        </button>
      </div>
    </div>
  );
}

LeadCard.propTypes = {
  lead: PropTypes.shape({
    _id:          PropTypes.string,
    id:           PropTypes.string,
    businessName: PropTypes.string,
    phone:        PropTypes.string,
    email:        PropTypes.string,
    category:     PropTypes.string,
    city:         PropTypes.string,
    source:       PropTypes.string,
    website:      PropTypes.string,
    address:      PropTypes.string,
    notes:        PropTypes.string,
    status:       PropTypes.string,
    createdAt:    PropTypes.string,
  }).isRequired,
  onStatusChange: PropTypes.func,
  onDelete:       PropTypes.func,
  onViewDetail:   PropTypes.func,
};

LeadCard.defaultProps = {
  onStatusChange: () => {},
  onDelete:       () => {},
  onViewDetail:   () => {},
};

export default LeadCard;
