import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  User, Lock, Key, MessageSquare, Mail, Phone,
  Shield, CheckCircle, XCircle, Eye, EyeOff,
  Save, Plus, Trash2, AlertCircle, Loader2,
} from 'lucide-react';
import SettingsService from '../services/settings.service';
import useAuthStore from '../store/authStore';

// ─── Tab navigation ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'profile',   label: 'Profile',    icon: <User className="w-4 h-4" /> },
  { id: 'apikeys',   label: 'API Keys',   icon: <Key className="w-4 h-4" /> },
  { id: 'limits',    label: 'Rate Limits', icon: <Shield className="w-4 h-4" /> },
  { id: 'blocklist', label: 'Blocklist',  icon: <Shield className="w-4 h-4" /> },
];

// ─── Utility ───────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  const styles = type === 'success'
    ? 'bg-green-50 border-green-300 text-green-700'
    : 'bg-red-50 border-red-300 text-red-700';
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm max-w-sm ${styles}`}>
      {type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {message}
      <button className="ml-2 opacity-60 hover:opacity-100" onClick={onClose}>✕</button>
    </div>
  );
}
Toast.propTypes = {
  message: PropTypes.string.isRequired,
  type:    PropTypes.oneOf(['success', 'error']).isRequired,
  onClose: PropTypes.func.isRequired,
};

// ─── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab({ onToast }) {
  const { user, setUser } = useAuthStore();
  const [form, setForm]   = useState({ name: user?.name || '', email: user?.email || '' });
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw]   = useState(false);
  const [saving, setSaving]   = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [errors, setErrors]   = useState({});

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setPwField = (k, v) => setPwForm((p) => ({ ...p, [k]: v }));

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const res = await SettingsService.updateProfile(form);
      setUser(res.user || res);
      onToast('Profile updated successfully', 'success');
    } catch (err) {
      onToast(err?.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) {
      onToast('Passwords do not match', 'error');
      return;
    }
    if (pwForm.newPw.length < 8) {
      onToast('Password must be at least 8 characters', 'error');
      return;
    }
    setPwSaving(true);
    try {
      await SettingsService.changePassword({ current: pwForm.current, newPassword: pwForm.newPw });
      setPwForm({ current: '', newPw: '', confirm: '' });
      onToast('Password changed successfully', 'success');
    } catch (err) {
      onToast(err?.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile form */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600" />
          <h3 className="section-title">Profile Information</h3>
        </div>
        <form onSubmit={handleSaveProfile} className="card-body space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow">
              {(form.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-900">{form.name || 'User'}</p>
              <p className="text-sm text-gray-500">{form.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input
                className={`input ${errors.name ? 'border-red-400' : ''}`}
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className={`input ${errors.email ? 'border-red-400' : ''}`}
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-500" />
          <h3 className="section-title">Change Password</h3>
        </div>
        <form onSubmit={handleChangePassword} className="card-body space-y-4">
          <div>
            <label className="label">Current Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="input pr-10"
                value={pwForm.current}
                onChange={(e) => setPwField('current', e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPw((v) => !v)}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">New Password</label>
              <input
                type="password"
                className="input"
                value={pwForm.newPw}
                onChange={(e) => setPwField('newPw', e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                className="input"
                value={pwForm.confirm}
                onChange={(e) => setPwField('confirm', e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">Minimum 8 characters</p>
          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={pwSaving}>
              {pwSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Lock className="w-4 h-4" /> Update Password</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
ProfileTab.propTypes = { onToast: PropTypes.func.isRequired };

// ─── API Keys Tab ──────────────────────────────────────────────────────────────
const API_KEY_DEFS = [
  { id: 'anthropic', label: 'Anthropic (Claude AI)', icon: <Key className="w-5 h-5 text-purple-600" />, desc: 'Used for AI message generation and lead scoring' },
  { id: 'twilio',    label: 'Twilio (SMS / WhatsApp)', icon: <Phone className="w-5 h-5 text-red-500" />, desc: 'Used to send SMS and WhatsApp messages' },
  { id: 'gmail',     label: 'Gmail (SMTP / OAuth)',   icon: <Mail className="w-5 h-5 text-yellow-500" />, desc: 'Used for email outreach campaigns' },
];

function APIKeysTab({ onToast }) {
  const [statuses, setStatuses] = useState({
    anthropic: null,
    twilio:    null,
    gmail:     null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SettingsService.getApiKeyStatus()
      .then((data) => setStatuses(data?.keys || data || {}))
      .catch(() => setStatuses({ anthropic: false, twilio: false, gmail: false }))
      .finally(() => setLoading(false));
  }, []);

  const StatusBadge = ({ connected }) => {
    if (connected === null || connected === undefined) {
      return <span className="badge badge-muted"><Loader2 className="w-3 h-3 animate-spin" /> Checking…</span>;
    }
    return connected
      ? <span className="badge badge-success gap-1"><CheckCircle className="w-3 h-3" /> Connected</span>
      : <span className="badge badge-danger gap-1"><XCircle className="w-3 h-3" /> Not Configured</span>;
  };
  StatusBadge.propTypes = { connected: PropTypes.bool };
  StatusBadge.defaultProps = { connected: null };

  return (
    <div className="card">
      <div className="card-header flex items-center gap-2">
        <Key className="w-4 h-4 text-gray-500" />
        <h3 className="section-title">API Key Status</h3>
      </div>
      <div className="card-body divide-y divide-gray-100">
        {API_KEY_DEFS.map((def) => (
          <div key={def.id} className="py-4 flex items-center gap-4 first:pt-0 last:pb-0">
            <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
              {def.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{def.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{def.desc}</p>
            </div>
            {loading
              ? <span className="badge badge-muted"><Loader2 className="w-3 h-3 animate-spin" /></span>
              : <StatusBadge connected={statuses[def.id]} />
            }
          </div>
        ))}
        <div className="pt-4">
          <p className="text-xs text-gray-400">
            API keys are configured via environment variables on the server. Contact your administrator to update them.
          </p>
        </div>
      </div>
    </div>
  );
}
APIKeysTab.propTypes = { onToast: PropTypes.func.isRequired };

// ─── Rate Limits Tab ───────────────────────────────────────────────────────────
const DEFAULT_LIMITS = { sms: 100, email: 200, whatsapp: 150 };

function RateLimitsTab({ onToast }) {
  const [limits, setLimits]   = useState(DEFAULT_LIMITS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    SettingsService.getRateLimits()
      .then((d) => setLimits(d?.limits || d || DEFAULT_LIMITS))
      .catch(() => setLimits(DEFAULT_LIMITS))
      .finally(() => setLoading(false));
  }, []);

  const channelConfig = [
    { key: 'sms',      label: 'SMS',      icon: <Phone className="w-4 h-4 text-blue-600" />,       max: 1000 },
    { key: 'email',    label: 'Email',    icon: <Mail className="w-4 h-4 text-purple-600" />,      max: 2000 },
    { key: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare className="w-4 h-4 text-green-600" />, max: 500 },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await SettingsService.updateRateLimits(limits);
      onToast('Rate limits updated', 'success');
    } catch (err) {
      onToast(err?.response?.data?.message || 'Failed to save limits', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-8 flex items-center justify-center text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading limits…
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header flex items-center gap-2">
        <Shield className="w-4 h-4 text-orange-500" />
        <h3 className="section-title">Outreach Rate Limits</h3>
        <span className="text-xs text-gray-400 ml-1">(messages per hour)</span>
      </div>
      <div className="card-body space-y-6">
        {channelConfig.map((ch) => (
          <div key={ch.key}>
            <div className="flex items-center gap-2 mb-2">
              {ch.icon}
              <label className="label mb-0">{ch.label}</label>
              <span className="ml-auto text-sm font-semibold text-gray-800">
                {limits[ch.key] ?? 0} / hr
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={ch.max}
              step={10}
              value={limits[ch.key] ?? 0}
              onChange={(e) => setLimits((p) => ({ ...p, [ch.key]: Number(e.target.value) }))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>0</span>
              <span>{ch.max / 2}</span>
              <span>{ch.max}</span>
            </div>
          </div>
        ))}

        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-3">
            Rate limits help you avoid being flagged as spam. Recommended: WhatsApp ≤150/hr, SMS ≤100/hr, Email ≤200/hr.
          </p>
          <div className="flex justify-end">
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Limits</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
RateLimitsTab.propTypes = { onToast: PropTypes.func.isRequired };

// ─── Blocklist Tab ─────────────────────────────────────────────────────────────
function BlocklistTab({ onToast }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEntry, setNewEntry] = useState('');
  const [adding, setAdding]   = useState(false);

  const loadBlocklist = useCallback(async () => {
    setLoading(true);
    try {
      const data = await SettingsService.getBlocklist();
      setEntries(data?.entries || data || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBlocklist(); }, [loadBlocklist]);

  const handleAdd = async () => {
    if (!newEntry.trim()) return;
    setAdding(true);
    try {
      await SettingsService.addToBlocklist(newEntry.trim());
      setNewEntry('');
      await loadBlocklist();
      onToast('Entry added to blocklist', 'success');
    } catch (err) {
      onToast(err?.response?.data?.message || 'Failed to add entry', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id) => {
    try {
      await SettingsService.removeFromBlocklist(id);
      setEntries((p) => p.filter((e) => e._id !== id && e.id !== id));
      onToast('Entry removed', 'success');
    } catch (err) {
      onToast(err?.response?.data?.message || 'Failed to remove entry', 'error');
    }
  };

  return (
    <div className="card">
      <div className="card-header flex items-center gap-2">
        <Shield className="w-4 h-4 text-red-500" />
        <h3 className="section-title">Opt-out / Blocklist</h3>
        <span className="ml-auto badge badge-muted">{entries.length} entries</span>
      </div>
      <div className="card-body space-y-4">
        {/* Add entry */}
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="Phone number, email, or domain to block…"
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button className="btn btn-primary shrink-0" onClick={handleAdd} disabled={adding || !newEntry.trim()}>
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </div>

        {/* Entries list */}
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading blocklist…
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Blocklist is empty</p>
            <p className="text-xs mt-1">Add phone numbers, emails, or domains to suppress outreach</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {entries.map((entry, i) => (
              <div key={entry._id || entry.id || i} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm text-gray-800 font-mono">{entry.value || entry.entry || entry}</p>
                  {entry.addedAt && (
                    <p className="text-xs text-gray-400">
                      Added {new Date(entry.addedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  className="btn btn-ghost text-red-500 hover:bg-red-50 p-1.5"
                  onClick={() => handleRemove(entry._id || entry.id || i)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
BlocklistTab.propTypes = { onToast: PropTypes.func.isRequired };

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [toast, setToast]         = useState(null);

  const showToast = useCallback((message, type) => {
    setToast({ message, type });
  }, []);

  return (
    <div className="page-container space-y-6">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account, API keys, and platform preferences</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
              ${activeTab === tab.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'profile'   && <ProfileTab   onToast={showToast} />}
        {activeTab === 'apikeys'   && <APIKeysTab   onToast={showToast} />}
        {activeTab === 'limits'    && <RateLimitsTab onToast={showToast} />}
        {activeTab === 'blocklist' && <BlocklistTab  onToast={showToast} />}
      </div>
    </div>
  );
}
