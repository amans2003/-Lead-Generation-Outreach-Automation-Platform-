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

function downloadCSV(leads) {
  const headers = ['Business Name', 'Phone', 'Email', 'Category', 'City', 'Source', 'Website', 'Address', 'Status', 'Created At'];
  const rows = leads.map(l => [
    l.businessName || '',
    l.phone        || '',
    l.email        || '',
    l.category     || '',
    l.city         || '',
    l.source       || '',
    l.website      || '',
    l.address      || '',
    l.status       || '',
    l.createdAt    || '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `good_leads_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function GoodLeadsPage() {
  const [leads,        setLeads]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [exporting,    setExporting]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/leads?status=good_lead&limit=1000');
      setLeads(data.leads || data.data || data);
    } catch (err) {
      setError('Failed to load good leads.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(id, newStatus) {
    try {
      await apiFetch(`/api/leads/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (newStatus !== 'good_lead') {
        setLeads(prev => prev.filter(l => (l._id || l.id) !== id));
      } else {
        setLeads(prev => prev.map(l => (l._id || l.id) === id ? { ...l, status: newStatus } : l));
      }
    } catch { setError('Failed to update status.'); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this lead?')) return;
    try {
      await apiFetch(`/api/leads/${id}`, { method: 'DELETE' });
      setLeads(prev => prev.filter(l => (l._id || l.id) !== id));
    } catch { setError('Delete failed.'); }
  }

  async function handleBulkDelete(ids) {
    try {
      await apiFetch('/api/leads/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
      setLeads(prev => prev.filter(l => !ids.includes(l._id || l.id)));
    } catch { setError('Bulk delete failed.'); }
  }

  async function handleExport() {
    setExporting(true);
    try {
      downloadCSV(leads);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '24px' }}>⭐</span>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#111827' }}>
              Good Leads
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            {leads.length.toLocaleString()} high-quality lead{leads.length !== 1 ? 's' : ''} ready for follow-up
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
          <button
            onClick={handleExport}
            disabled={exporting || leads.length === 0}
            style={{
              padding: '9px 18px',
              background: leads.length === 0 ? '#f3f4f6' : 'linear-gradient(135deg, #16a34a, #15803d)',
              color: leads.length === 0 ? '#9ca3af' : '#fff',
              border: 'none', borderRadius: '9px',
              fontSize: '13px', fontWeight: '700', cursor: leads.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: leads.length > 0 ? '0 4px 12px rgba(22,163,74,0.3)' : 'none',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {exporting ? 'Exporting…' : '⬇ Export CSV'}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div style={{
        background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px',
        padding: '14px 18px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#15803d',
      }}>
        <span>💡</span>
        <span>
          These leads have been marked as high-quality prospects. Export them or use WhatsApp/Email for direct outreach.
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
        filters={{ status: 'good_lead' }}
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

export default GoodLeadsPage;
