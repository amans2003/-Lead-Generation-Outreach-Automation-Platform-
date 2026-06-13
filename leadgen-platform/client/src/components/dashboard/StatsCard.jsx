import React from 'react';
import PropTypes from 'prop-types';

function StatsCard({ title, value, icon, color, trend }) {
  const isPositive = trend >= 0;

  const colorMap = {
    blue:   { bg: '#eff6ff', border: '#bfdbfe' },
    green:  { bg: '#f0fdf4', border: '#bbf7d0' },
    purple: { bg: '#faf5ff', border: '#e9d5ff' },
    orange: { bg: '#fff7ed', border: '#fed7aa' },
    red:    { bg: '#fef2f2', border: '#fecaca' },
    indigo: { bg: '#eef2ff', border: '#c7d2fe' },
  };

  const palette = colorMap[color] || colorMap.blue;

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${palette.border}`,
      borderRadius: '12px',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      flex: '1',
      minWidth: '180px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: '13px', fontWeight: '500', color: '#6b7280',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>{title}</span>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: palette.bg, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '20px',
        }}>
          {icon}
        </div>
      </div>

      <div style={{ fontSize: '32px', fontWeight: '700', color: '#111827', lineHeight: '1' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>

      {trend !== undefined && trend !== null && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          fontSize: '12px', fontWeight: '500',
          color: isPositive ? '#16a34a' : '#dc2626',
          background: isPositive ? '#f0fdf4' : '#fef2f2',
          padding: '2px 8px', borderRadius: '99px', width: 'fit-content',
        }}>
          {isPositive ? '▲' : '▼'} {Math.abs(trend)}%
          <span style={{ fontWeight: 400, color: '#6b7280' }}> vs last 30d</span>
        </span>
      )}
    </div>
  );
}

StatsCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  icon: PropTypes.string,
  color: PropTypes.oneOf(['blue', 'green', 'purple', 'orange', 'red', 'indigo']),
  trend: PropTypes.number,
};

StatsCard.defaultProps = {
  icon: '📊',
  color: 'blue',
  trend: null,
};

export default StatsCard;
