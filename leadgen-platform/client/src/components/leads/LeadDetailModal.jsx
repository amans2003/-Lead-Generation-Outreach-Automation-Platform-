import React, { useState } from 'react';
import PropTypes from 'prop-types';
import LeadStatusBadge from './LeadStatusBadge';
import { formatDistanceToNow, parseISO, format } from 'date-fns';

const STATUS_LIST = ['new', 'outreached', 'responded', 'good_lead', 'not_interested', 'processing'];

function timeAgo(d) {
  try { return formatDistanceToNow(parseISO(d), { addSuffix: true }); } catch { return d || '—'; }
}
function fmtDate(d) {
  try { return format(parseISO(d), 'MMM d, yyyy h:mm a'); } catch { return d || '—'; }
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h4 style={{
        margin: '0 0 10px', fontSize: '12px', fontWeight: '700',
        color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em',
        borderBottom: '1px solid #f3f4f6', paddingBottom: '6px',
      }}>
        {title}
      </h4>
      {children}
    </div>
  );
}

function Field({ label, value, href }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '8px', fontSize: '13px' }}>
      <span style={{ color: '#9ca3af' }}>{label}</span>
      {href
        ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', wordBreak: 'break-all' }}>{value}</a>
        : <span style={{ color: '#111827', fontWeight: '500', wordBreak: 'break-word' }}>{value || '—'}</span>
      }
    </div>
  );
}

function LeadDetailModal({ lead, open, onClose, onStatusChange }) {
  const [status, setStatus] = useState(lead?.status || 'new');
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');

  if (!open || !lead) return null;

  async function handleStatusSave() {
    setSaving(true);
    try {
      await onStatusChange(lead._id || lead.id, status);
    } finally {
      setSaving(false);
    }
  }

  const history = lead.outreachHistory || [];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 1000, backdropFilter: 'blur(2px)',
        }}
      />
      {/* Dialog */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#fff', borderRadius: '16px',
        width: 'min(640px, 95vw)', maxHeight: '88vh',
        overflowY: 'auto', zIndex: 1001,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        padding: '28px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '700', color: '#111827' }}>
              {lead.businessName || 'Lead Details'}
            </h2>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>Added {timeAgo(lead.createdAt)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LeadStatusBadge status={lead.status} />
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', fontSize: '20px',
                cursor: 'pointer', color: '#9ca3af', padding: '4px',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Contact Info */}
        <Section title="Contact Information">
          <Field label="Business"  value={lead.businessName} />
          <Field label="Phone"     value={lead.phone} />
          <Field label="Email"     value={lead.email} />
          <Field label="Website"   value={lead.website} href={lead.website} />
          <Field label="Address"   value={lead.address} />
          <Field label="City"      value={lead.city} />
          <Field label="Category"  value={lead.category} />
          <Field label="Source"    value={lead.source} />
        </Section>

        {/* Status Override */}
        <Section title="Status Management">
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              style={{
                padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
                fontSize: '13px', color: '#374151', flex: 1,
              }}
            >
              {STATUS_LIST.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <button
              onClick={handleStatusSave}
              disabled={saving || status === lead.status}
              style={{
                padding: '8px 18px', background: '#3b82f6', color: '#fff',
                border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                cursor: saving || status === lead.status ? 'not-allowed' : 'pointer',
                opacity: saving || status === lead.status ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Update'}
            </button>
          </div>
        </Section>

        {/* Outreach History */}
        {history.length > 0 && (
          <Section title={`Outreach History (${history.length})`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {history.map((h, i) => (
                <div key={i} style={{
                  background: '#f9fafb', borderRadius: '8px', padding: '12px',
                  fontSize: '13px', borderLeft: '3px solid #3b82f6',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '600', color: '#374151' }}>
                      {h.channel || 'Unknown channel'}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>{fmtDate(h.sentAt)}</span>
                  </div>
                  {h.message && (
                    <p style={{ margin: 0, color: '#6b7280', lineHeight: 1.5 }}>{h.message}</p>
                  )}
                  {h.response && (
                    <div style={{
                      marginTop: '8px', padding: '8px', background: '#dcfce7',
                      borderRadius: '6px', color: '#15803d',
                    }}>
                      Response: {h.response}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Notes */}
        {lead.notes && (
          <Section title="Notes">
            <div style={{
              background: '#fefce8', padding: '12px', borderRadius: '8px',
              fontSize: '13px', color: '#713f12', lineHeight: 1.6,
            }}>
              {lead.notes}
            </div>
          </Section>
        )}

        {/* Meta */}
        <Section title="Metadata">
          <Field label="Lead ID"  value={lead._id || lead.id} />
          <Field label="Created"  value={fmtDate(lead.createdAt)} />
          <Field label="Updated"  value={fmtDate(lead.updatedAt)} />
        </Section>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
          {lead.phone && (
            <a
              href={`https://wa.me/${(lead.phone || '').replace(/\D/g, '')}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                padding: '9px 18px', background: '#dcfce7', color: '#16a34a',
                borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                textDecoration: 'none',
              }}
            >
              WhatsApp
            </a>
          )}
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              style={{
                padding: '9px 18px', background: '#eff6ff', color: '#2563eb',
                borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                textDecoration: 'none',
              }}
            >
              Send Email
            </a>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px', background: '#f3f4f6', color: '#374151',
              border: 'none', borderRadius: '8px', fontSize: '13px',
              fontWeight: '600', cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}

LeadDetailModal.propTypes = {
  lead:           PropTypes.object,
  open:           PropTypes.bool.isRequired,
  onClose:        PropTypes.func.isRequired,
  onStatusChange: PropTypes.func,
};

LeadDetailModal.defaultProps = {
  lead:           null,
  onStatusChange: () => {},
};

export default LeadDetailModal;
