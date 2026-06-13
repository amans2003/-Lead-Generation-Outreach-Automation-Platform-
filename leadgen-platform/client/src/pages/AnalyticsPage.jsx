import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  ResponsiveContainer,
  FunnelChart, Funnel, LabelList, Tooltip as RTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar,
} from 'recharts';
import { TrendingUp, BarChart2, Filter, Clock, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import {
  useFunnelData,
  useDuplicateTrend,
  useSourcePerformance,
  useCategoryPerformance,
  useResponseTimeDistribution,
} from '../services/analytics.service';

// ─── Mock fallback data ────────────────────────────────────────────────────────
const MOCK_FUNNEL = [
  { name: 'Scraped',    value: 12400, fill: '#3b82f6' },
  { name: 'Outreached', value: 6200,  fill: '#6366f1' },
  { name: 'Responded',  value: 1480,  fill: '#8b5cf6' },
  { name: 'Good Leads', value: 620,   fill: '#10b981' },
];

const MOCK_DUPE_TREND = Array.from({ length: 14 }, (_, i) => ({
  date:  `Jun ${i + 1}`,
  rate:  Math.max(8, Math.round(35 - i * 1.5 + Math.random() * 6)),
}));

const MOCK_SOURCE_PERF = [
  { source: 'Google Maps', leads: 3400, response_rate: 12.4, quality_score: 78 },
  { source: 'JustDial',    leads: 2800, response_rate: 9.1,  quality_score: 65 },
  { source: 'Sulekha',     leads: 2100, response_rate: 11.2, quality_score: 70 },
  { source: 'IndiaMart',   leads: 1800, response_rate: 14.7, quality_score: 82 },
  { source: 'TradeIndia',  leads: 1200, response_rate: 8.9,  quality_score: 62 },
  { source: 'YP India',    leads: 700,  response_rate: 7.3,  quality_score: 55 },
  { source: 'LinkedIn',    leads: 400,  response_rate: 22.1, quality_score: 91 },
];

const MOCK_CATEGORY_PERF = [
  { category: 'Restaurant',   leads: 2100, responded: 310, quality: 74 },
  { category: 'Hotel',        leads: 980,  responded: 180, quality: 82 },
  { category: 'Gym',          leads: 760,  responded: 124, quality: 71 },
  { category: 'Real Estate',  leads: 1340, responded: 290, quality: 88 },
  { category: 'IT Services',  leads: 890,  responded: 210, quality: 90 },
  { category: 'Salon',        leads: 620,  responded: 78,  quality: 63 },
  { category: 'Clinic',       leads: 710,  responded: 140, quality: 77 },
];

const MOCK_RESPONSE_DIST = [
  { bucket: '<1h',   count: 120 },
  { bucket: '1-3h',  count: 245 },
  { bucket: '3-6h',  count: 310 },
  { bucket: '6-12h', count: 280 },
  { bucket: '12-24h',count: 190 },
  { bucket: '>24h',  count: 335 },
];

// ─── Shared helpers ────────────────────────────────────────────────────────────
const CHART_COLORS = {
  primary:   '#3b82f6',
  secondary: '#6366f1',
  success:   '#10b981',
  warning:   '#f59e0b',
  purple:    '#8b5cf6',
  pink:      '#ec4899',
  slate:     '#64748b',
};

function ChartCard({ title, subtitle, icon, children, loading, error, onRefresh }) {
  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h3 className="section-title">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {onRefresh && (
          <button className="btn btn-ghost p-1.5" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>
      <div className="card-body">
        {loading ? (
          <div className="flex items-center justify-center h-56 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-56 text-gray-400 gap-2">
            <AlertCircle className="w-6 h-6 text-orange-400" />
            <p className="text-sm text-gray-500">Using sample data (API unavailable)</p>
          </div>
        ) : children}
      </div>
    </div>
  );
}
ChartCard.propTypes = {
  title:     PropTypes.string.isRequired,
  subtitle:  PropTypes.string,
  icon:      PropTypes.node,
  children:  PropTypes.node,
  loading:   PropTypes.bool,
  error:     PropTypes.any,
  onRefresh: PropTypes.func,
};
ChartCard.defaultProps = { subtitle: null, icon: null, children: null, loading: false, error: null, onRefresh: null };

// Custom Tooltip for consistent style
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-semibold text-gray-700 mb-1">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <strong>{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}</strong>
        </p>
      ))}
    </div>
  );
}
CustomTooltip.propTypes = {
  active:  PropTypes.bool,
  payload: PropTypes.array,
  label:   PropTypes.any,
};
CustomTooltip.defaultProps = { active: false, payload: [], label: null };

// ─── KPI bar ──────────────────────────────────────────────────────────────────
function KPIBar({ funnel }) {
  const data = funnel && funnel.length > 0 ? funnel : MOCK_FUNNEL;
  const scraped = data[0]?.value || 1;
  const kpis = [
    { label: 'Conversion Rate',   value: `${((data[3]?.value / scraped) * 100).toFixed(2)}%`, color: 'text-green-700', bg: 'bg-green-50' },
    { label: 'Outreach Rate',     value: `${((data[1]?.value / scraped) * 100).toFixed(1)}%`,  color: 'text-blue-700',  bg: 'bg-blue-50'  },
    { label: 'Response Rate',     value: `${((data[2]?.value / (data[1]?.value || 1)) * 100).toFixed(1)}%`, color: 'text-purple-700', bg: 'bg-purple-50' },
    { label: 'Lead Quality Rate', value: `${((data[3]?.value / (data[2]?.value || 1)) * 100).toFixed(1)}%`, color: 'text-teal-700', bg: 'bg-teal-50' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((k) => (
        <div key={k.label} className={`card p-4 ${k.bg}`}>
          <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
        </div>
      ))}
    </div>
  );
}
KPIBar.propTypes = { funnel: PropTypes.array };
KPIBar.defaultProps = { funnel: null };

// ─── Funnel Chart ──────────────────────────────────────────────────────────────
function ConversionFunnelChart({ funnelData }) {
  const data = funnelData && funnelData.length > 0 ? funnelData : MOCK_FUNNEL;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <FunnelChart>
        <RTooltip content={<CustomTooltip />} />
        <Funnel dataKey="value" data={data} isAnimationActive>
          <LabelList
            position="right"
            fill="#374151"
            stroke="none"
            fontSize={12}
            fontWeight={600}
            formatter={(v) => v?.toLocaleString()}
          />
          <LabelList
            dataKey="name"
            position="left"
            fill="#6b7280"
            stroke="none"
            fontSize={11}
          />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );
}
ConversionFunnelChart.propTypes = { funnelData: PropTypes.array };
ConversionFunnelChart.defaultProps = { funnelData: null };

// ─── Duplicate Rate Trend ──────────────────────────────────────────────────────
function DuplicateRateTrendChart({ trendData }) {
  const data = trendData && trendData.length > 0 ? trendData : MOCK_DUPE_TREND;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis unit="%" tick={{ fontSize: 11 }} domain={[0, 60]} />
        <RTooltip content={<CustomTooltip />} formatter={(v) => [`${v}%`, 'Dupe Rate']} />
        <Line
          type="monotone"
          dataKey="rate"
          name="Dupe Rate"
          stroke={CHART_COLORS.warning}
          strokeWidth={2.5}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        {/* Reference line at 20% — target */}
        <Line
          type="monotone"
          dataKey={() => 20}
          name="Target (20%)"
          stroke="#10b981"
          strokeWidth={1}
          strokeDasharray="5 4"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
DuplicateRateTrendChart.propTypes = { trendData: PropTypes.array };
DuplicateRateTrendChart.defaultProps = { trendData: null };

// ─── Source Performance Bar ────────────────────────────────────────────────────
function SourcePerformanceChart({ sourceData }) {
  const data = sourceData && sourceData.length > 0 ? sourceData : MOCK_SOURCE_PERF;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="source" tick={{ fontSize: 10 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="right" orientation="right" unit="%" tick={{ fontSize: 11 }} />
        <RTooltip content={<CustomTooltip />} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
        <Bar yAxisId="left"  dataKey="leads"         name="Total Leads"     fill={CHART_COLORS.primary}   radius={[3, 3, 0, 0]} />
        <Bar yAxisId="right" dataKey="response_rate" name="Response Rate %" fill={CHART_COLORS.success}   radius={[3, 3, 0, 0]} />
        <Bar yAxisId="right" dataKey="quality_score" name="Quality Score"   fill={CHART_COLORS.secondary} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
SourcePerformanceChart.propTypes = { sourceData: PropTypes.array };
SourcePerformanceChart.defaultProps = { sourceData: null };

// ─── Category Performance Bar ──────────────────────────────────────────────────
function CategoryPerformanceChart({ categoryData }) {
  const data = categoryData && categoryData.length > 0 ? categoryData : MOCK_CATEGORY_PERF;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} width={80} />
        <RTooltip content={<CustomTooltip />} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
        <Bar dataKey="leads"     name="Total Leads"  fill={CHART_COLORS.primary}  radius={[0, 3, 3, 0]} />
        <Bar dataKey="responded" name="Responded"    fill={CHART_COLORS.success}  radius={[0, 3, 3, 0]} />
        <Bar dataKey="quality"   name="Quality Score" fill={CHART_COLORS.purple} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
CategoryPerformanceChart.propTypes = { categoryData: PropTypes.array };
CategoryPerformanceChart.defaultProps = { categoryData: null };

// ─── Response Time Distribution ────────────────────────────────────────────────
function ResponseTimeChart({ distData }) {
  const data = distData && distData.length > 0 ? distData : MOCK_RESPONSE_DIST;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <RTooltip content={<CustomTooltip />} />
        <Bar dataKey="count" name="Responses" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
ResponseTimeChart.propTypes = { distData: PropTypes.array };
ResponseTimeChart.defaultProps = { distData: null };

// ─── Range Selector ────────────────────────────────────────────────────────────
function RangeSelector({ value, onChange }) {
  const options = [7, 14, 30, 90];
  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
      {options.map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors
            ${value === d ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}
RangeSelector.propTypes = {
  value:    PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [dupeDays, setDupeDays] = useState(14);

  const { data: funnelData,    isLoading: funnelLoading,   error: funnelError }   = useFunnelData();
  const { data: trendData,     isLoading: trendLoading,    error: trendError }    = useDuplicateTrend(dupeDays);
  const { data: sourceData,    isLoading: sourceLoading,   error: sourceError }   = useSourcePerformance();
  const { data: categoryData,  isLoading: categoryLoading, error: categoryError } = useCategoryPerformance();
  const { data: responseData,  isLoading: responseLoading, error: responseError } = useResponseTimeDistribution();

  const funnel = funnelData?.data || funnelData;

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Deep insights into your lead generation pipeline</p>
      </div>

      {/* KPI bar */}
      <KPIBar funnel={funnel} />

      {/* Conversion Funnel */}
      <ChartCard
        title="Conversion Funnel"
        subtitle="Scraped → Outreached → Responded → Good Leads"
        icon={<TrendingUp className="w-4 h-4 text-blue-600" />}
        loading={funnelLoading}
        error={funnelError}
      >
        <ConversionFunnelChart funnelData={funnel} />
      </ChartCard>

      {/* Duplicate Rate Trend */}
      <ChartCard
        title="Duplicate Rate Trend"
        subtitle="Lower is better — target <20%"
        icon={<Filter className="w-4 h-4 text-orange-500" />}
        loading={trendLoading}
        error={trendError}
      >
        <div className="flex justify-end mb-3">
          <RangeSelector value={dupeDays} onChange={setDupeDays} />
        </div>
        <DuplicateRateTrendChart trendData={trendData?.data || trendData} />
      </ChartCard>

      {/* Source & Category charts side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard
          title="Source Performance"
          subtitle="Leads, response rate, and quality by source"
          icon={<BarChart2 className="w-4 h-4 text-indigo-600" />}
          loading={sourceLoading}
          error={sourceError}
        >
          <SourcePerformanceChart sourceData={sourceData?.data || sourceData} />
        </ChartCard>

        <ChartCard
          title="Category Performance"
          subtitle="Lead volume and quality by business category"
          icon={<BarChart2 className="w-4 h-4 text-teal-600" />}
          loading={categoryLoading}
          error={categoryError}
        >
          <CategoryPerformanceChart categoryData={categoryData?.data || categoryData} />
        </ChartCard>
      </div>

      {/* Response Time Distribution */}
      <ChartCard
        title="Response Time Distribution"
        subtitle="How quickly leads respond to outreach messages"
        icon={<Clock className="w-4 h-4 text-purple-600" />}
        loading={responseLoading}
        error={responseError}
      >
        <ResponseTimeChart distData={responseData?.data || responseData} />
      </ChartCard>
    </div>
  );
}
