import React, { useState } from 'react';
import PropTypes from 'prop-types';

const DEFAULT_SOURCES = [
  { key: 'google_maps', label: 'Google Maps',  icon: '🗺' },
  { key: 'justdial',   label: 'JustDial',      icon: '📞' },
  { key: 'sulekha',    label: 'Sulekha',        icon: '🔍' },
  { key: 'indiamart',  label: 'IndiaMart',      icon: '🏭' },
  { key: 'tradeindia', label: 'TradeIndia',     icon: '📦' },
];

function Toggle({ on, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: '42px', height: '24px', borderRadius: '12px', cursor: 'pointer',
        background: on ? '#3b82f6' : '#d1d5db',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: '3px',
        left: on ? '21px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  );
}

Toggle.propTypes = { on: PropTypes.bool, onChange: PropTypes.func };

function SourceToggle({ initialSources, sources: propSources, onChange }) {
  const allSources = propSources || DEFAULT_SOURCES;

  const [enabled, setEnabled] = useState(() => {
    const init = {};
    allSources.forEach(s => {
      init[s.key] = initialSources?.[s.key] ?? true;
    });
    return init;
  });

  function toggleSource(key) {
    const next = { ...enabled, [key]: !enabled[key] };
    setEnabled(next);
    onChange(next);
  }

  const activeCount = Object.values(enabled).filter(Boolean).length;

  return (
    <div style={{
      background: '#fff', borderRadius: '12px', padding: '20px 24px',
      border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#111827' }}>
          Scraper Sources
        </h3>
        <span style={{
          background: '#eff6ff', color: '#2563eb', padding: '3px 10px',
          borderRadius: '99px', fontSize: '12px', fontWeight: '600',
        }}>
          {activeCount} / {allSources.length} active
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {allSources.map(source => (
          <div
            key={source.key}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderRadius: '10px', cursor: 'pointer',
              background: enabled[source.key] ? '#f0f9ff' : '#f9fafb',
              border: `1px solid ${enabled[source.key] ? '#bfdbfe' : '#f3f4f6'}`,
              transition: 'all 0.15s',
            }}
            onClick={() => toggleSource(source.key)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>{source.icon}</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                  {source.label}
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                  {enabled[source.key] ? 'Active — will scrape' : 'Disabled — will skip'}
                </div>
              </div>
            </div>
            <Toggle on={enabled[source.key]} onChange={() => toggleSource(source.key)} />
          </div>
        ))}
      </div>
    </div>
  );
}

SourceToggle.propTypes = {
  initialSources: PropTypes.object,
  sources:        PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string, label: PropTypes.string, icon: PropTypes.string })),
  onChange:       PropTypes.func,
};

SourceToggle.defaultProps = {
  initialSources: null,
  sources:        null,
  onChange:       () => {},
};

export default SourceToggle;
