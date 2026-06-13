import React from 'react';
import PropTypes from 'prop-types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';

const STAGES = [
  { key: 'scraped',    label: 'Scraped',    color: '#6366f1' },
  { key: 'outreached', label: 'Outreached', color: '#3b82f6' },
  { key: 'responded',  label: 'Responded',  color: '#10b981' },
  { key: 'good_leads', label: 'Good Leads', color: '#f59e0b' },
];

function OutreachProgress({ scraped, outreached, responded, goodLeads }) {
  const data = [
    { label: 'Scraped',    value: scraped    || 0, color: '#6366f1' },
    { label: 'Outreached', value: outreached || 0, color: '#3b82f6' },
    { label: 'Responded',  value: responded  || 0, color: '#10b981' },
    { label: 'Good Leads', value: goodLeads  || 0, color: '#f59e0b' },
  ];

  const max = Math.max(...data.map(d => d.value), 1);

  function convRate(a, b) {
    if (!b) return '0%';
    return ((a / b) * 100).toFixed(1) + '%';
  }

  return (
    <div style={{
      background: '#fff', borderRadius: '12px', padding: '20px 24px',
      border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '600', color: '#111827' }}>
        Outreach Funnel
      </h3>
      <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#9ca3af' }}>
        Conversion: {convRate(outreached, scraped)} scraped → outreached &nbsp;|&nbsp;
        {convRate(responded, outreached)} outreached → responded &nbsp;|&nbsp;
        {convRate(goodLeads, responded)} responded → good
      </p>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(v) => [v.toLocaleString(), 'Count']}
            contentStyle={{
              background: '#1f2937', color: '#f9fafb', border: 'none',
              borderRadius: '8px', fontSize: '13px',
            }}
            labelStyle={{ color: '#d1d5db' }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              style={{ fontSize: '12px', fontWeight: '600', fill: '#374151' }}
              formatter={(v) => v.toLocaleString()}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div style={{
        display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap',
      }}>
        {data.map((d) => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '10px', height: '10px', borderRadius: '2px', background: d.color,
            }} />
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              {d.label}: <strong style={{ color: '#111827' }}>{d.value.toLocaleString()}</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

OutreachProgress.propTypes = {
  scraped:    PropTypes.number,
  outreached: PropTypes.number,
  responded:  PropTypes.number,
  goodLeads:  PropTypes.number,
};

OutreachProgress.defaultProps = {
  scraped: 0, outreached: 0, responded: 0, goodLeads: 0,
};

export default OutreachProgress;
