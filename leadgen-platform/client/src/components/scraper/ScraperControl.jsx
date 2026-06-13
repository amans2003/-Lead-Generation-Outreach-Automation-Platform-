import React, { useState } from 'react';
import PropTypes from 'prop-types';

function ScraperControl({ running, progress, scraped, target, onStart, onStop, onTargetChange }) {
  const [localTarget, setLocalTarget] = useState(target || 500);

  const pct = target > 0 ? Math.min(100, Math.round((scraped / target) * 100)) : 0;

  function handleStart() {
    onStart({ dailyTarget: localTarget });
  }

  return (
    <div style={{
      background: '#fff', borderRadius: '14px', padding: '24px',
      border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#111827' }}>
            Scraper Control
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ca3af' }}>
            {running ? 'Scraper is running…' : 'Scraper is idle'}
          </p>
        </div>
        <div style={{
          width: '12px', height: '12px', borderRadius: '50%',
          background: running ? '#22c55e' : '#d1d5db',
          boxShadow: running ? '0 0 0 4px rgba(34,197,94,0.2)' : 'none',
          animation: running ? 'pulse 1.5s infinite' : 'none',
        }} />
      </div>

      {/* Daily target */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block', fontSize: '12px', fontWeight: '600',
          color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          Daily Target
        </label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="number"
            value={localTarget}
            min={10}
            max={10000}
            disabled={running}
            onChange={e => {
              setLocalTarget(Number(e.target.value));
              onTargetChange(Number(e.target.value));
            }}
            style={{
              width: '120px', padding: '10px 14px', border: '1px solid #d1d5db',
              borderRadius: '8px', fontSize: '15px', fontWeight: '600', color: '#111827',
              background: running ? '#f9fafb' : '#fff',
            }}
          />
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>leads per day</span>
        </div>
      </div>

      {/* Progress */}
      {(running || scraped > 0) && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              {scraped.toLocaleString()} / {target.toLocaleString()} leads
            </span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#3b82f6' }}>{pct}%</span>
          </div>
          <div style={{ height: '10px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '99px',
              background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
              width: pct + '%',
              transition: 'width 0.5s ease',
            }} />
          </div>
          {progress?.message && (
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#9ca3af' }}>
              {progress.message}
            </p>
          )}
        </div>
      )}

      {/* Start / Stop button */}
      <button
        onClick={running ? onStop : handleStart}
        style={{
          width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
          fontSize: '15px', fontWeight: '700', cursor: 'pointer',
          background: running
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: '#fff',
          boxShadow: running
            ? '0 4px 12px rgba(220,38,38,0.3)'
            : '0 4px 12px rgba(59,130,246,0.3)',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseLeave={e => e.currentTarget.style.transform = ''}
      >
        {running ? '⬛  Stop Scraper' : '▶  Start Scraper'}
      </button>
    </div>
  );
}

ScraperControl.propTypes = {
  running:        PropTypes.bool,
  progress:       PropTypes.shape({ message: PropTypes.string }),
  scraped:        PropTypes.number,
  target:         PropTypes.number,
  onStart:        PropTypes.func,
  onStop:         PropTypes.func,
  onTargetChange: PropTypes.func,
};

ScraperControl.defaultProps = {
  running:        false,
  progress:       null,
  scraped:        0,
  target:         500,
  onStart:        () => {},
  onStop:         () => {},
  onTargetChange: () => {},
};

export default ScraperControl;
