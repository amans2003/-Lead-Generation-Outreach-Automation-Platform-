import React from 'react';
import PropTypes from 'prop-types';
import { formatDistanceToNow, parseISO } from 'date-fns';

const STATUS_COLORS = {
  new:            { bg: '#eff6ff', color: '#2563eb' },
  outreached:     { bg: '#fef3c7', color: '#d97706' },
  responded:      { bg: '#d1fae5', color: '#059669' },
  good_lead:      { bg: '#dcfce7', color: '#16a34a' },
  not_interested: { bg: '#fee2e2', color: '#dc2626' },
  processing:     { bg: '#f3f4f6', color: '#6b7280' },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 10px', borderRadius: '99px',
      fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap',
    }}>
      {status?.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
}

StatusBadge.propTypes = { status: PropTypes.string };

function timeAgo(dateStr) {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr || '—';
  }
}

function RecentLeads({ leads }) {
  const rows = (leads || []).slice(0, 10);

  const thStyle = {
    padding: '10px 14px', fontSize: '11px', fontWeight: '600',
    color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em',
    textAlign: 'left', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap',
  };

  const tdStyle = {
    padding: '12px 14px', fontSize: '13px', color: '#374151',
    borderBottom: '1px solid #f9fafb',
  };

  return (
    <div style={{
      background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#111827' }}>
          Recent Leads
        </h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Business', 'Phone', 'Category', 'Source', 'Status', 'Added'].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>
                  No recent leads
                </td>
              </tr>
            )}
            {rows.map((lead) => (
              <tr key={lead._id || lead.id} style={{ transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <td style={{ ...tdStyle, fontWeight: '500', color: '#111827', maxWidth: '180px' }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lead.businessName || '—'}
                  </div>
                </td>
                <td style={tdStyle}>{lead.phone || '—'}</td>
                <td style={tdStyle}>{lead.category || '—'}</td>
                <td style={tdStyle}>{lead.source || '—'}</td>
                <td style={tdStyle}><StatusBadge status={lead.status} /></td>
                <td style={{ ...tdStyle, color: '#9ca3af', fontSize: '12px' }}>
                  {timeAgo(lead.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

RecentLeads.propTypes = {
  leads: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      businessName: PropTypes.string,
      phone: PropTypes.string,
      category: PropTypes.string,
      source: PropTypes.string,
      status: PropTypes.string,
      createdAt: PropTypes.string,
    })
  ),
};

RecentLeads.defaultProps = {
  leads: [],
};

export default RecentLeads;
