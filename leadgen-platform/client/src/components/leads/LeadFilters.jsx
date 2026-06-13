import React, { useState } from 'react';
import PropTypes from 'prop-types';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'outreached', label: 'Outreached' },
  { value: 'responded', label: 'Responded' },
  { value: 'good_lead', label: 'Good Lead' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'processing', label: 'Processing' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'google_maps', label: 'Google Maps' },
  { value: 'justdial', label: 'JustDial' },
  { value: 'sulekha', label: 'Sulekha' },
  { value: 'indiamart', label: 'IndiaMart' },
  { value: 'manual', label: 'Manual' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'retail', label: 'Retail' },
  { value: 'services', label: 'Services' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'other', label: 'Other' },
];

const inputStyle = {
  height: '36px', padding: '0 12px', border: '1px solid #d1d5db',
  borderRadius: '8px', fontSize: '13px', color: '#374151',
  background: '#fff', outline: 'none', cursor: 'pointer',
};

function LeadFilters({ onFilter, initialFilters }) {
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    source: '',
    city: '',
    dateFrom: '',
    dateTo: '',
    ...initialFilters,
  });

  function handleChange(key, value) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onFilter(next);
  }

  function handleReset() {
    const blank = { status: '', category: '', source: '', city: '', dateFrom: '', dateTo: '' };
    setFilters(blank);
    onFilter(blank);
  }

  const hasFilters = Object.values(filters).some(v => v !== '');

  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px',
      padding: '16px 20px', display: 'flex', flexWrap: 'wrap',
      gap: '12px', alignItems: 'flex-end',
    }}>
      <div>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
          STATUS
        </label>
        <select
          value={filters.status}
          onChange={e => handleChange('status', e.target.value)}
          style={inputStyle}
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
          CATEGORY
        </label>
        <select
          value={filters.category}
          onChange={e => handleChange('category', e.target.value)}
          style={inputStyle}
        >
          {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
          SOURCE
        </label>
        <select
          value={filters.source}
          onChange={e => handleChange('source', e.target.value)}
          style={inputStyle}
        >
          {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
          CITY
        </label>
        <input
          type="text"
          placeholder="Filter by city..."
          value={filters.city}
          onChange={e => handleChange('city', e.target.value)}
          style={{ ...inputStyle, width: '140px' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
          FROM
        </label>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={e => handleChange('dateFrom', e.target.value)}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
          TO
        </label>
        <input
          type="date"
          value={filters.dateTo}
          onChange={e => handleChange('dateTo', e.target.value)}
          style={inputStyle}
        />
      </div>

      {hasFilters && (
        <button
          onClick={handleReset}
          style={{
            height: '36px', padding: '0 14px', background: '#fee2e2',
            color: '#dc2626', border: 'none', borderRadius: '8px',
            fontSize: '13px', fontWeight: '500', cursor: 'pointer',
          }}
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}

LeadFilters.propTypes = {
  onFilter: PropTypes.func.isRequired,
  initialFilters: PropTypes.object,
};

LeadFilters.defaultProps = {
  initialFilters: {},
};

export default LeadFilters;
