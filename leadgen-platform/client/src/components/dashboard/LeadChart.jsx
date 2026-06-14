import React from 'react';
import PropTypes from 'prop-types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { format, parseISO } from 'date-fns';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: '#1f2937', color: '#f9fafb', padding: '10px 14px',
      borderRadius: '8px', fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <p style={{ margin: 0, fontWeight: '600' }}>{label}</p>
      <p style={{ margin: '4px 0 0', color: '#60a5fa' }}>
        {payload[0].value} leads
      </p>
    </div>
  );
}

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.string,
};

function LeadChart({ data = [] }) {
  const formatted = (data || []).map((d) => ({
    ...d,
    label: (() => {
      try { return format(parseISO(d.date), 'MMM d'); } catch { return d.date; }
    })(),
  }));

  return (
    <div style={{
      background: '#fff', borderRadius: '12px', padding: '20px 24px',
      border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: '600', color: '#111827' }}>
        Daily Leads — Last 30 Days
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={formatted} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={2.5}
            fill="url(#leadGradient)"
            dot={false}
            activeDot={{ r: 5, fill: '#2563eb' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

LeadChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
    })
  ),
};

export default LeadChart;
