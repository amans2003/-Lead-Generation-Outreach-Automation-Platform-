import React, { useState, useEffect, useCallback } from 'react';
import LeadTable from '../components/leads/LeadTable';
import LeadDetailModal from '../components/leads/LeadDetailModal';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';
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
  if (!res.ok) throw new Error('API error');
  return res.json();
}

function NotInterestedPage() {
  const [leads,        setLeads]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [notification, setNotification] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/leads?status=not_interested&limit=1000');
      setLeads(data.leads || data.data || data);
    } catch (err) {
      setError('Failed to load leads.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function notify(msg) {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  }

  async function handleStatusChange(id, newStatus) {
    try {
      await apiFetch(`/api/leads/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (newStatus !== 'not_interested') {
        setLeads(prev => prev.filter(l => (l._id || l.id) !== id));
        notify('Lead moved to ' + newStatus.replace(/_/g, ' '));
      } else {
        setLeads(prev => prev.map(l => (l._id || l.id) === id ? { ...l, status: newStatus } : l));
      }
    } catch { setError('Status update failed.'); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Permanently delete this lead?')) return;
    try {
      await apiFetch(`/api/leads/${id}`, { method: 'DELETE' });
      setLeads(prev => prev.filter(l => (l._id || l.id) !== id));
      notify('Lead deleted');
    } catch { setError('Delete failed.'); }
  }

  async function handleBulkDelete(ids) {
    try {
      await apiFetch('/api/leads/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
      setLeads(prev => prev.filter(l => !ids.includes(l._id || l.id)));
      notify(`${ids.length} leads deleted`);
    } catch { setError('Bulk delete failed.'); }
  }

  async function handleBulkReactivate() {
    const confirm = window.confirm(
      `Move all ${leads.length} not-interested leads back to "new"? This will re-queue them.`
    );
    if (!confirm) return;
    try {
      await apiFetch('/api/leads/bulk-status', {
        method: 'POST',
        body: JSON.stringify({ status: 'not_interested', newStatus: 'new' }),
      });
      setLeads([]);
      notify('All leads re-queued as new');
    } catch { setError('Bulk reactivate failed.'); }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '24px' }}>🚫</span>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#111827' }}>
              Not Interested
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            {leads.length.toLocaleString()} lead{leads.length !== 1 ? 's' : ''} marked as not interested
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
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
          {leads.length > 0 && (
            <button
              onClick={handleBulkReactivate}
              style={{
                padding: '9px 16px', background: '#fef3c7', color: '#d97706',
                border: '1px solid #fde68a', borderRadius: '9px',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              }}
            >
              Re-queue All as New
            </button>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div style={{
        background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px',
        padding: '14px 18px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#b91c1c',
      }}>
        <span>ℹ</span>
        <span>
          These businesses have explicitly declined or been marked as not interested.
          You can re-queue them or permanently delete to keep your list clean.
        </span>
      </div>

      {notification && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px',
          padding: '10px 16px', marginBottom: '16px', fontSize: '13px', color: '#16a34a',
        }}>
          {notification}
        </div>
      )}

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
        filters={{ status: 'not_interested' }}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
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

export default NotInterestedPage;
