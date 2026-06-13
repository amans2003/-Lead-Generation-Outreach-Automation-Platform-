import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import LeadStatusBadge from './LeadStatusBadge';
import { formatDistanceToNow, parseISO } from 'date-fns';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const STATUS_LIST = ['new', 'outreached', 'responded', 'good_lead', 'not_interested', 'processing'];

function SortIcon({ dir }) {
  if (!dir) return <span style={{ color: '#d1d5db', marginLeft: 4 }}>⇅</span>;
  return <span style={{ color: '#3b82f6', marginLeft: 4 }}>{dir === 'asc' ? '↑' : '↓'}</span>;
}

function timeAgo(d) {
  try { return formatDistanceToNow(parseISO(d), { addSuffix: true }); } catch { return d || '—'; }
}

function LeadTable({ leads, loading, onStatusChange, onDelete, onBulkDelete }) {
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState(new Set());

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }

  const sorted = useMemo(() => {
    const arr = [...(leads || [])];
    arr.sort((a, b) => {
      let va = a[sortKey] ?? '';
      let vb = b[sortKey] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [leads, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  function toggleAll() {
    if (selected.size === paged.length && paged.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paged.map(l => l._id || l.id)));
    }
  }

  function toggleOne(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  function handleBulkDelete() {
    if (selected.size === 0) return;
    if (window.confirm(`Delete ${selected.size} lead(s)?`)) {
      onBulkDelete([...selected]);
      setSelected(new Set());
    }
  }

  const thBase = {
    padding: '10px 14px', fontSize: '11px', fontWeight: '600', color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left',
    borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap', cursor: 'pointer',
    userSelect: 'none',
  };
  const tdBase = {
    padding: '12px 14px', fontSize: '13px', color: '#374151',
    borderBottom: '1px solid #f9fafb', verticalAlign: 'middle',
  };

  const COLS = [
    { key: 'businessName', label: 'Business' },
    { key: 'phone',        label: 'Phone' },
    { key: 'category',     label: 'Category' },
    { key: 'city',         label: 'City' },
    { key: 'source',       label: 'Source' },
    { key: 'status',       label: 'Status' },
    { key: 'createdAt',    label: 'Added' },
  ];

  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center',
        gap: '12px', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '13px', color: '#6b7280' }}>
          {sorted.length.toLocaleString()} lead{sorted.length !== 1 ? 's' : ''}
        </span>
        {selected.size > 0 && (
          <button
            onClick={handleBulkDelete}
            style={{
              padding: '6px 14px', background: '#fee2e2', color: '#dc2626',
              border: 'none', borderRadius: '8px', fontSize: '13px',
              fontWeight: '500', cursor: 'pointer',
            }}
          >
            Delete {selected.size} selected
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>Rows per page:</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            style={{
              padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '6px',
              fontSize: '13px', color: '#374151',
            }}
          >
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thBase, width: '40px' }}>
                <input
                  type="checkbox"
                  checked={paged.length > 0 && selected.size === paged.length}
                  onChange={toggleAll}
                />
              </th>
              {COLS.map(c => (
                <th key={c.key} style={thBase} onClick={() => toggleSort(c.key)}>
                  {c.label}
                  <SortIcon dir={sortKey === c.key ? sortDir : null} />
                </th>
              ))}
              <th style={thBase}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={COLS.length + 2} style={{ ...tdBase, textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && paged.length === 0 && (
              <tr>
                <td colSpan={COLS.length + 2} style={{ ...tdBase, textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  No leads found
                </td>
              </tr>
            )}
            {!loading && paged.map(lead => {
              const id = lead._id || lead.id;
              return (
                <tr key={id}
                  style={{ transition: 'background 0.1s', background: selected.has(id) ? '#eff6ff' : '' }}
                  onMouseEnter={e => { if (!selected.has(id)) e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={e => { if (!selected.has(id)) e.currentTarget.style.background = ''; }}
                >
                  <td style={tdBase}>
                    <input type="checkbox" checked={selected.has(id)} onChange={() => toggleOne(id)} />
                  </td>
                  <td style={{ ...tdBase, fontWeight: '500', color: '#111827', maxWidth: '200px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lead.businessName || '—'}
                    </div>
                  </td>
                  <td style={tdBase}>{lead.phone || '—'}</td>
                  <td style={tdBase}>{lead.category || '—'}</td>
                  <td style={tdBase}>{lead.city || '—'}</td>
                  <td style={tdBase}>{lead.source || '—'}</td>
                  <td style={tdBase}>
                    <select
                      value={lead.status || ''}
                      onChange={e => onStatusChange(id, e.target.value)}
                      style={{
                        border: '1px solid #d1d5db', borderRadius: '6px',
                        padding: '3px 6px', fontSize: '12px', cursor: 'pointer',
                        background: '#fff',
                      }}
                    >
                      {STATUS_LIST.map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ ...tdBase, color: '#9ca3af', fontSize: '12px' }}>
                    {timeAgo(lead.createdAt)}
                  </td>
                  <td style={tdBase}>
                    <button
                      onClick={() => onDelete(id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#ef4444', fontSize: '16px', padding: '4px',
                      }}
                      title="Delete lead"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', borderTop: '1px solid #f3f4f6', flexWrap: 'wrap', gap: '8px',
        }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            Page {page} of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setPage(1)} disabled={page === 1}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '12px' }}>
              «
            </button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '12px' }}>
              ‹
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p;
              if (totalPages <= 5) p = i + 1;
              else if (page <= 3) p = i + 1;
              else if (page >= totalPages - 2) p = totalPages - 4 + i;
              else p = page - 2 + i;
              return (
                <button key={p} onClick={() => setPage(p)}
                  style={{
                    padding: '6px 10px', borderRadius: '6px', fontSize: '12px',
                    border: '1px solid ' + (p === page ? '#3b82f6' : '#d1d5db'),
                    background: p === page ? '#3b82f6' : '#fff',
                    color: p === page ? '#fff' : '#374151',
                    cursor: 'pointer',
                  }}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '12px' }}>
              ›
            </button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '12px' }}>
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

LeadTable.propTypes = {
  leads:          PropTypes.array,
  loading:        PropTypes.bool,
  filters:        PropTypes.object,
  onStatusChange: PropTypes.func,
  onDelete:       PropTypes.func,
  onBulkDelete:   PropTypes.func,
};

LeadTable.defaultProps = {
  leads: [],
  loading: false,
  filters: {},
  onStatusChange: () => {},
  onDelete: () => {},
  onBulkDelete: () => {},
};

export default LeadTable;
