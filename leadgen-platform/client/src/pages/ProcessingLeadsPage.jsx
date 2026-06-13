import React, { useState, useEffect, useCallback } from 'react';
import LeadTable from '../components/leads/LeadTable';
import LeadDetailModal from '../components/leads/LeadDetailModal';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const token = () => localStorage.getItem('token');

async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + token(),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error('API error ' + res.status);
  return res.json();
}

function ProcessingLeadsPage() {
  const [leads,        setLeads]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [modalOpen,    setModalOpen]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/v1/leads?status=processing&limit=500');
      setLeads(data.data?.leads || data.leads || []);
    } catch (err) {
      setError('Failed to load processing leads: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(id, newStatus) {
    try {
      await apiFetch(`/api/v1/leads/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (newStatus !== 'processing') {
        setLeads(prev => prev.filter(l => (l._id || l.id) !== id));
      } else {
        setLeads(prev => prev.map(l => (l._id || l.id) === id ? { ...l, status: newStatus } : l));
      }
    } catch { setError('Failed to update status.'); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this lead?')) return;
    try {
      await apiFetch(`/api/v1/leads/${id}`, { method: 'DELETE' });
      setLeads(prev => prev.filter(l => (l._id || l.id) !== id));
    } catch { setError('Delete failed.'); }
  }

  async function handleBulkDelete(ids) {
    try {
      await apiFetch('/api/v1/leads/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
      setLeads(prev => prev.filter(l => !ids.includes(l._id || l.id)));
    } catch { setError('Bulk delete failed.'); }
  }

  async function retryOutreach(id) {
    try {
      await apiFetch(`/api/v1/outreach/send-single`, {
        method: 'POST',
        body: JSON.stringify({ leadId: id, channels: ['sms'] }),
      });
      setLeads(prev => prev.map(l =>
        (l._id || l.id) === id
          ? { ...l, outreachAttempts: (l.outreachAttempts || 0) + 1 }
          : l
      ));
    } catch { setError('Failed to retry outreach.'); }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '24px' }}>⏳</span>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#111827' }}>
              Processing Leads
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            {leads.length.toLocaleString()} lead{leads.length !== 1 ? 's' : ''} awaiting response
          </p>
        </div>
        <button
          onClick={load}
          style={{
            padding: '9px 16px', background: '#f3f4f6', color: '#374151',
            border: '1px solid #e5e7eb', borderRadius: '9px',
            fontSize: '13px', fontWeight: '600', cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      {/* Info banner */}
      <div style={{
        background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '12px',
        padding: '14px 18px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#92400e',
      }}>
        <span>📬</span>
        <span>
          These leads have been contacted and are waiting for a response.
          Leads with no reply after 96 hours stay here for manual review.
          Use the retry button to send a follow-up.
        </span>
      </div>

      {error && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '10px',
          padding: '10px 16px', marginBottom: '16px', fontSize: '13px', color: '#dc2626',
        }}>
          {error}
        </div>
      )}

      <LeadTable
        leads={leads}
        loading={loading}
        filters={{ status: 'processing' }}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        extraActions={(lead) => (
          <button
            onClick={() => retryOutreach(lead._id || lead.id)}
            style={{
              padding: '5px 10px', background: '#dbeafe', color: '#1e40af',
              border: '1px solid #93c5fd', borderRadius: '6px',
              fontSize: '12px', fontWeight: '600', cursor: 'pointer',
            }}
          >
            Retry
          </button>
        )}
      />

      <LeadDetailModal
        lead={selectedLead}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedLead(null); }}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}

export default ProcessingLeadsPage;
