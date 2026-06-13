import React, { useState, useEffect, useCallback } from 'react';
import LeadFilters from '../components/leads/LeadFilters';
import LeadTable from '../components/leads/LeadTable';
import LeadDetailModal from '../components/leads/LeadDetailModal';

const API = import.meta.env.VITE_API_URL || '';
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
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.message || 'Request failed');
  }
  return res.json();
}

function buildQuery(filters) {
  const params = new URLSearchParams();
  if (filters.status)   params.set('status',   filters.status);
  if (filters.category) params.set('category', filters.category);
  if (filters.source)   params.set('source',   filters.source);
  if (filters.city)     params.set('city',      filters.city);
  if (filters.dateFrom) params.set('dateFrom',  filters.dateFrom);
  if (filters.dateTo)   params.set('dateTo',    filters.dateTo);
  return params.toString() ? '?' + params.toString() : '';
}

function LeadsPage() {
  const [leads,         setLeads]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filters,       setFilters]       = useState({});
  const [selectedLead,  setSelectedLead]  = useState(null);
  const [modalOpen,     setModalOpen]     = useState(false);
  const [error,         setError]         = useState('');
  const [notification,  setNotification]  = useState('');

  const loadLeads = useCallback(async (f = filters) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/v1/leads' + buildQuery(f));
      setLeads(data.data?.leads || data.leads || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLeads({}); }, []);

  function handleFilter(newFilters) {
    setFilters(newFilters);
    loadLeads(newFilters);
  }

  async function handleStatusChange(id, newStatus) {
    try {
      await apiFetch(`/api/v1/leads/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setLeads(prev => prev.map(l => (l._id || l.id) === id ? { ...l, status: newStatus } : l));
      notify('Status updated');
    } catch (err) {
      setError('Failed to update status: ' + err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this lead?')) return;
    try {
      await apiFetch(`/api/v1/leads/${id}`, { method: 'DELETE' });
      setLeads(prev => prev.filter(l => (l._id || l.id) !== id));
      notify('Lead deleted');
    } catch (err) {
      setError('Failed to delete: ' + err.message);
    }
  }

  async function handleBulkDelete(ids) {
    try {
      await apiFetch('/api/v1/leads/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
      setLeads(prev => prev.filter(l => !ids.includes(l._id || l.id)));
      notify(`${ids.length} leads deleted`);
    } catch (err) {
      setError('Bulk delete failed: ' + err.message);
    }
  }

  function handleViewDetail(lead) {
    setSelectedLead(lead);
    setModalOpen(true);
  }

  function notify(msg) {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '800', color: '#111827' }}>
            All Leads
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            {leads.length.toLocaleString()} lead{leads.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <button
          onClick={() => loadLeads(filters)}
          style={{
            padding: '9px 18px', background: '#eff6ff', color: '#2563eb',
            border: '1px solid #bfdbfe', borderRadius: '9px',
            fontSize: '13px', fontWeight: '600', cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px',
          padding: '10px 16px', marginBottom: '16px', fontSize: '13px', color: '#16a34a',
        }}>
          {notification}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '10px',
          padding: '10px 16px', marginBottom: '16px', fontSize: '13px', color: '#dc2626',
        }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div style={{ marginBottom: '16px' }}>
        <LeadFilters onFilter={handleFilter} />
      </div>

      {/* Table */}
      <LeadTable
        leads={leads}
        loading={loading}
        filters={filters}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
      />

      {/* Detail Modal */}
      <LeadDetailModal
        lead={selectedLead}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedLead(null); }}
        onStatusChange={async (id, status) => {
          await handleStatusChange(id, status);
          setSelectedLead(prev => prev ? { ...prev, status } : prev);
        }}
      />
    </div>
  );
}

export default LeadsPage;
