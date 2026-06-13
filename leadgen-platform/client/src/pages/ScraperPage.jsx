import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Play, Square, Wifi, WifiOff, RefreshCw, Database,
  Filter, Clock, Activity, ChevronRight, AlertCircle,
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import useRealTimeLeads from '../hooks/useRealTimeLeads';
import ScraperService from '../services/scraper.service';

dayjs.extend(relativeTime);

// ─── Constants ────────────────────────────────────────────────────────────────
const ALL_SOURCES = [
  { id: 'google_maps',       label: 'Google Maps',        icon: '🗺️' },
  { id: 'justdial',          label: 'JustDial',            icon: '📞' },
  { id: 'sulekha',           label: 'Sulekha',             icon: '🔍' },
  { id: 'indiamart',         label: 'IndiaMart',           icon: '🏭' },
  { id: 'tradeindia',        label: 'TradeIndia',          icon: '📦' },
  { id: 'yellowpages_india', label: 'Yellow Pages India',  icon: '📒' },
  { id: 'linkedin',          label: 'LinkedIn',            icon: '💼' },
];

const STATUS_COLORS = {
  completed: 'badge-success',
  running:   'badge-primary',
  failed:    'badge-danger',
  stopped:   'badge-warning',
  pending:   'badge-muted',
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function ConnectionBadge({ isConnected }) {
  return (
    <span className={`badge ${isConnected ? 'badge-success' : 'badge-danger'} gap-1.5`}>
      {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {isConnected ? 'Live' : 'Disconnected'}
    </span>
  );
}
ConnectionBadge.propTypes = { isConnected: PropTypes.bool.isRequired };

function ProgressBar({ value, label }) {
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-xs text-gray-500">
          <span>{label}</span>
          <span>{Math.round(value)}%</span>
        </div>
      )}
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
ProgressBar.propTypes = { value: PropTypes.number.isRequired, label: PropTypes.string };
ProgressBar.defaultProps = { label: null };

function StatCard({ title, value, sub, color }) {
  const colorMap = {
    blue:   'bg-blue-50 text-blue-700',
    green:  'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <div className="card p-4 flex flex-col gap-1">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
      <p className={`text-2xl font-bold ${colorMap[color] || 'text-gray-800'} rounded px-1 -mx-1`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  sub:   PropTypes.string,
  color: PropTypes.string,
};
StatCard.defaultProps = { sub: null, color: 'blue' };

function SourceToggle({ source, enabled, active, onToggle }) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border transition-colors
        ${active ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}
        ${!enabled ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{source.icon}</span>
        <div>
          <p className="text-sm font-medium text-gray-800">{source.label}</p>
          {active && (
            <p className="text-xs text-blue-600 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Scraping…
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onToggle(source.id)}
        className={`toggle ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <span className={`toggle-thumb ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}
SourceToggle.propTypes = {
  source:   PropTypes.shape({ id: PropTypes.string, icon: PropTypes.string, label: PropTypes.string }).isRequired,
  enabled:  PropTypes.bool.isRequired,
  active:   PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

function JobHistoryTable({ jobs }) {
  if (!jobs || jobs.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <Database className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No job history yet</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr>
            <th>Started</th>
            <th>Duration</th>
            <th>Sources</th>
            <th>Raw</th>
            <th>New</th>
            <th>Dupes</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job, i) => (
            <tr key={job._id || i}>
              <td className="whitespace-nowrap">{dayjs(job.startedAt).fromNow()}</td>
              <td>
                {job.endedAt
                  ? `${Math.round((new Date(job.endedAt) - new Date(job.startedAt)) / 60000)}m`
                  : '—'}
              </td>
              <td>
                <div className="flex flex-wrap gap-1">
                  {(job.sources || []).map((s) => (
                    <span key={s} className="badge badge-muted">{s}</span>
                  ))}
                </div>
              </td>
              <td className="font-medium">{job.rawCount ?? '—'}</td>
              <td className="font-medium text-green-700">{job.newCount ?? '—'}</td>
              <td className="font-medium text-orange-600">{job.dupCount ?? '—'}</td>
              <td>
                <span className={`badge ${STATUS_COLORS[job.status] || 'badge-muted'}`}>
                  {job.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
JobHistoryTable.propTypes = {
  jobs: PropTypes.arrayOf(PropTypes.object).isRequired,
};

function QueryRotationStatus({ queries }) {
  if (!queries || queries.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">No query rotation data available</p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {queries.map((q, i) => (
        <div
          key={i}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border
            ${q.used ? 'bg-gray-100 text-gray-400 border-gray-200 line-through' : 'bg-blue-50 text-blue-700 border-blue-200'}
          `}
        >
          <ChevronRight className="w-3 h-3" />
          {q.query || q}
        </div>
      ))}
    </div>
  );
}
QueryRotationStatus.propTypes = {
  queries: PropTypes.arrayOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.object])
  ).isRequired,
};

// ─── ScraperControl ────────────────────────────────────────────────────────────
function ScraperControl({ scraperRunning, stats, enabledSources, onStart, onStop, loading }) {
  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          Scraper Control
        </h2>
        {scraperRunning && (
          <span className="badge badge-primary gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Running
          </span>
        )}
      </div>
      <div className="card-body space-y-4">
        {scraperRunning && (
          <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
            <ProgressBar value={stats.progress} label="Overall Progress" />
            <div className="flex flex-wrap gap-4 text-sm text-blue-700">
              {stats.activeSource && (
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Source: <strong>{stats.activeSource}</strong>
                </span>
              )}
              {stats.currentQuery && (
                <span>
                  Query: <strong className="font-mono text-xs bg-blue-100 px-1 rounded">{stats.currentQuery}</strong>
                </span>
              )}
              {stats.queriesTotal > 0 && (
                <span>{stats.queriesCompleted} / {stats.queriesTotal} queries</span>
              )}
              {stats.leadsPerMinute > 0 && (
                <span>{stats.leadsPerMinute} leads/min</span>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {scraperRunning ? (
            <button
              className="btn btn-danger"
              onClick={onStop}
              disabled={loading}
            >
              <Square className="w-4 h-4" />
              {loading ? 'Stopping…' : 'Stop Scraper'}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={onStart}
              disabled={loading || enabledSources.length === 0}
            >
              <Play className="w-4 h-4" />
              {loading ? 'Starting…' : 'Start Scraper'}
            </button>
          )}
          {enabledSources.length === 0 && !scraperRunning && (
            <p className="text-sm text-orange-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Enable at least one source below
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
ScraperControl.propTypes = {
  scraperRunning:  PropTypes.bool.isRequired,
  stats:           PropTypes.object.isRequired,
  enabledSources:  PropTypes.arrayOf(PropTypes.string).isRequired,
  onStart:         PropTypes.func.isRequired,
  onStop:          PropTypes.func.isRequired,
  loading:         PropTypes.bool.isRequired,
};

// ─── ScraperStatus (real-time stats panel) ────────────────────────────────────
function ScraperStatus({ stats, isConnected }) {
  const dupeRate = stats.rawScraped > 0
    ? Math.round((stats.duplicatesFiltered / stats.rawScraped) * 100)
    : 0;

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2">
          <Database className="w-4 h-4 text-green-600" />
          Live Stats
        </h2>
        <ConnectionBadge isConnected={isConnected} />
      </div>
      <div className="card-body">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard title="Raw Scraped"       value={stats.rawScraped}         color="blue"   />
          <StatCard title="New Leads"         value={stats.newToday}           color="green"  />
          <StatCard title="Dupes Filtered"    value={stats.duplicatesFiltered} color="orange" />
          <StatCard title="Dupe Rate"         value={`${dupeRate}%`}           color="purple"
                    sub={dupeRate < 30 ? '✓ Good' : dupeRate < 60 ? '⚠ High' : '✗ Very High'} />
        </div>

        {/* Today's dedup report */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            Today's Dedup Report
          </p>
          <p className="text-sm text-gray-600">
            Scraped{' '}
            <span className="font-bold text-gray-900">{stats.rawScraped} raw</span>
            {' → '}
            <span className="font-bold text-green-700">{stats.newToday} new</span>
            {' → '}
            <span className="font-bold text-orange-600">{stats.duplicatesFiltered} duplicates filtered</span>
          </p>
        </div>
      </div>
    </div>
  );
}
ScraperStatus.propTypes = {
  stats:       PropTypes.object.isRequired,
  isConnected: PropTypes.bool.isRequired,
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ScraperPage() {
  const { isConnected, scraperRunning, stats, jobHistory, queryRotation } = useRealTimeLeads();

  const [enabledSources, setEnabledSources] = useState(
    ALL_SOURCES.map((s) => s.id)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleToggleSource = useCallback((id) => {
    setEnabledSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }, []);

  const handleStart = async () => {
    setError(null);
    setLoading(true);
    try {
      await ScraperService.startScrape({ sources: enabledSources });
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to start scraper');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setError(null);
    setLoading(true);
    try {
      await ScraperService.stopScrape();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to stop scraper');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Scraper Control</h1>
        <p className="page-subtitle">Manage data collection from all lead sources</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Top row: control + live status */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ScraperControl
          scraperRunning={scraperRunning}
          stats={stats}
          enabledSources={enabledSources}
          onStart={handleStart}
          onStop={handleStop}
          loading={loading}
        />
        <ScraperStatus stats={stats} isConnected={isConnected} />
      </div>

      {/* Source toggles */}
      <div className="card">
        <div className="card-header">
          <h2 className="section-title">Source Toggles</h2>
          <p className="text-xs text-gray-500 mt-0.5">Enable or disable individual scrapers</p>
        </div>
        <div className="card-body grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {ALL_SOURCES.map((source) => (
            <SourceToggle
              key={source.id}
              source={source}
              enabled={enabledSources.includes(source.id)}
              active={scraperRunning && stats.activeSource === source.id}
              onToggle={handleToggleSource}
            />
          ))}
        </div>
      </div>

      {/* Query Rotation */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-purple-600" />
          <h2 className="section-title">Query Rotation Status</h2>
        </div>
        <div className="card-body">
          <QueryRotationStatus queries={queryRotation} />
        </div>
      </div>

      {/* Job History */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <h2 className="section-title">Job History (last 10 runs)</h2>
        </div>
        <div className="card-body p-0">
          <JobHistoryTable jobs={jobHistory} />
        </div>
      </div>
    </div>
  );
}
