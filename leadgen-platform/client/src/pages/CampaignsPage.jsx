import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pause, Play, Trash2, ChevronRight, BarChart2,
  Users, Send, CheckCircle, Clock, X, Loader2, AlertCircle,
} from 'lucide-react';
import dayjs from 'dayjs';
import CampaignsService from '../services/campaigns.service';

// ─── Constants ────────────────────────────────────────────────────────────────
const CHANNEL_OPTIONS = ['whatsapp', 'sms', 'email'];
const STATUS_CONFIG = {
  active:    { label: 'Active',    cls: 'badge-success' },
  paused:    { label: 'Paused',    cls: 'badge-warning' },
  completed: { label: 'Completed', cls: 'badge-muted'   },
  draft:     { label: 'Draft',     cls: 'badge-primary' },
  failed:    { label: 'Failed',    cls: 'badge-danger'  },
};

// ─── Campaign Stats Summary ────────────────────────────────────────────────────
function CampaignStatsSummary({ stats }) {
  const items = [
    { label: 'Total Campaigns', value: stats?.total ?? 0,     icon: <BarChart2 className="w-5 h-5 text-blue-600" />,   bg: 'bg-blue-50'   },
    { label: 'Total Leads Reached', value: stats?.reached ?? 0, icon: <Users className="w-5 h-5 text-indigo-600" />, bg: 'bg-indigo-50' },
    { label: 'Messages Sent',    value: stats?.sent ?? 0,     icon: <Send className="w-5 h-5 text-green-600" />,      bg: 'bg-green-50'  },
    { label: 'Responses',        value: stats?.responded ?? 0, icon: <CheckCircle className="w-5 h-5 text-teal-600" />, bg: 'bg-teal-50'  },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.label} className="card p-5 flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl ${item.bg} flex items-center justify-center`}>
            {item.icon}
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{item.value.toLocaleString()}</p>
            <p className="text-xs text-gray-500">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
CampaignStatsSummary.propTypes = {
  stats: PropTypes.shape({
    total: PropTypes.number,
    reached: PropTypes.number,
    sent: PropTypes.number,
    responded: PropTypes.number,
  }),
};
CampaignStatsSummary.defaultProps = { stats: null };

// ─── Campaign Card ─────────────────────────────────────────────────────────────
function CampaignCard({ campaign, onPause, onResume, onDelete }) {
  const sc = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
  const responseRate = campaign.sent > 0
    ? ((campaign.responded / campaign.sent) * 100).toFixed(1)
    : 0;

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{campaign.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Created {dayjs(campaign.createdAt).format('DD MMM YYYY')}
            </p>
          </div>
          <span className={`badge ml-2 shrink-0 ${sc.cls}`}>{sc.label}</span>
        </div>

        {/* Channels */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(campaign.channels || []).map((ch) => (
            <span key={ch} className="badge badge-muted capitalize">{ch}</span>
          ))}
          {campaign.category && (
            <span className="badge badge-primary">{campaign.category}</span>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 text-center mb-4">
          <div className="bg-gray-50 rounded-lg py-2">
            <p className="text-sm font-bold text-gray-900">{(campaign.sent || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-400">Sent</p>
          </div>
          <div className="bg-gray-50 rounded-lg py-2">
            <p className="text-sm font-bold text-gray-900">{(campaign.delivered || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-400">Delivered</p>
          </div>
          <div className="bg-green-50 rounded-lg py-2">
            <p className="text-sm font-bold text-green-700">{responseRate}%</p>
            <p className="text-xs text-gray-400">Response</p>
          </div>
        </div>

        {/* Progress bar */}
        {campaign.status === 'active' && campaign.total > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Progress</span>
              <span>{campaign.sent}/{campaign.total}</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${Math.min(100, (campaign.sent / campaign.total) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          {campaign.status === 'active' ? (
            <button className="btn btn-outline text-xs flex-1" onClick={() => onPause(campaign._id)}>
              <Pause className="w-3 h-3" /> Pause
            </button>
          ) : campaign.status === 'paused' ? (
            <button className="btn btn-primary text-xs flex-1" onClick={() => onResume(campaign._id)}>
              <Play className="w-3 h-3" /> Resume
            </button>
          ) : (
            <button className="btn btn-outline text-xs flex-1">
              <ChevronRight className="w-3 h-3" /> View
            </button>
          )}
          <button
            className="btn btn-ghost text-red-500 hover:bg-red-50 text-xs"
            onClick={() => onDelete(campaign._id)}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
CampaignCard.propTypes = {
  campaign: PropTypes.shape({
    _id:       PropTypes.string,
    name:      PropTypes.string,
    status:    PropTypes.string,
    channels:  PropTypes.arrayOf(PropTypes.string),
    category:  PropTypes.string,
    sent:      PropTypes.number,
    delivered: PropTypes.number,
    responded: PropTypes.number,
    total:     PropTypes.number,
    createdAt: PropTypes.string,
  }).isRequired,
  onPause:  PropTypes.func.isRequired,
  onResume: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

// ─── Create Campaign Modal ─────────────────────────────────────────────────────
function CreateCampaignModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name:     '',
    category: '',
    channels: ['whatsapp'],
    message:  '',
    limit:    100,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const toggleChannel = (ch) => {
    setField('channels', form.channels.includes(ch)
      ? form.channels.filter((c) => c !== ch)
      : [...form.channels, ch]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) {
      setError('Name and message are required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await CampaignsService.create(form);
      onCreated();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="section-title">New Campaign</h2>
          <button className="btn btn-ghost p-1" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="label">Campaign Name *</label>
            <input
              className="input"
              placeholder="e.g. Q1 Restaurant Outreach"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
            />
          </div>

          <div>
            <label className="label">Category</label>
            <input
              className="input"
              placeholder="e.g. Restaurant, Hotel, Gym…"
              value={form.category}
              onChange={(e) => setField('category', e.target.value)}
            />
          </div>

          <div>
            <label className="label">Channels</label>
            <div className="flex gap-2 flex-wrap">
              {CHANNEL_OPTIONS.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => toggleChannel(ch)}
                  className={`btn text-sm capitalize ${form.channels.includes(ch) ? 'btn-primary' : 'btn-outline'}`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Message *</label>
            <textarea
              className="input min-h-[100px] resize-none"
              placeholder="Hi {name}, we'd love to help your business grow…"
              value={form.message}
              onChange={(e) => setField('message', e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Variables: {'{name}'} {'{business}'} {'{source}'}</p>
          </div>

          <div>
            <label className="label">Lead Limit</label>
            <input
              type="number"
              className="input"
              min={1}
              max={10000}
              value={form.limit}
              onChange={(e) => setField('limit', Number(e.target.value))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-outline flex-1" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
CreateCampaignModal.propTypes = {
  onClose:   PropTypes.func.isRequired,
  onCreated: PropTypes.func.isRequired,
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
const MOCK_CAMPAIGNS = [
  { _id: '1', name: 'Q1 Restaurant Outreach', status: 'active', channels: ['whatsapp', 'sms'], category: 'Restaurant', sent: 340, delivered: 328, responded: 87, total: 500, createdAt: '2026-05-01' },
  { _id: '2', name: 'Hotel Chains Mumbai',    status: 'paused', channels: ['email'],            category: 'Hotel',      sent: 120, delivered: 115, responded: 22, total: 200, createdAt: '2026-04-20' },
  { _id: '3', name: 'Gym & Fitness Leads',    status: 'completed', channels: ['whatsapp'],      category: 'Gym',        sent: 200, delivered: 195, responded: 54, total: 200, createdAt: '2026-03-15' },
  { _id: '4', name: 'IT Services B2B',        status: 'draft',  channels: ['email', 'whatsapp'], category: 'IT Services', sent: 0, delivered: 0, responded: 0, total: 300, createdAt: '2026-06-01' },
];

export default function CampaignsPage() {
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['campaigns'],
    queryFn: CampaignsService.list,
    placeholderData: { campaigns: MOCK_CAMPAIGNS, stats: { total: 4, reached: 660, sent: 660, responded: 163 } },
    retry: false,
  });

  const { data: statsData } = useQuery({
    queryKey: ['campaigns', 'stats'],
    queryFn: CampaignsService.getStats,
    placeholderData: { total: 4, reached: 660, sent: 660, responded: 163 },
    retry: false,
  });

  const pauseMutation = useMutation({
    mutationFn: (id) => CampaignsService.pause(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const resumeMutation = useMutation({
    mutationFn: (id) => CampaignsService.resume(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => CampaignsService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const campaigns = data?.campaigns || MOCK_CAMPAIGNS;

  const handleCreated = useCallback(() => {
    setShowModal(false);
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
  }, [queryClient]);

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-subtitle">Manage your outreach campaigns</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* Stats summary */}
      <CampaignStatsSummary stats={statsData || data?.stats} />

      {/* Campaign list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading campaigns…
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center gap-2 py-12 text-red-500">
          <AlertCircle className="w-5 h-5" /> Failed to load campaigns. Showing cached data.
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No campaigns yet</p>
          <p className="text-sm mt-1">Create your first campaign to get started</p>
          <button className="btn btn-primary mt-4" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Create Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign._id}
              campaign={campaign}
              onPause={(id) => pauseMutation.mutate(id)}
              onResume={(id) => resumeMutation.mutate(id)}
              onDelete={(id) => {
                if (window.confirm('Delete this campaign?')) deleteMutation.mutate(id);
              }}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <CreateCampaignModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
