import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  MessageSquare, Send, RefreshCw, Smartphone, Zap, Users,
  Mail, Phone, CheckCircle, XCircle, Clock, AlertCircle,
  ChevronDown, Loader2,
} from 'lucide-react';
import OutreachService from '../services/outreach.service';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'Restaurant', 'Hotel', 'Gym', 'Salon', 'Clinic', 'Real Estate',
  'Retail', 'Coaching', 'Event Management', 'Printing', 'Logistics',
  'IT Services', 'Architect', 'Interior Design',
];

const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'sms',      label: 'SMS',      icon: <Phone className="w-4 h-4" /> },
  { id: 'email',    label: 'Email',    icon: <Mail className="w-4 h-4" /> },
];

const WA_POLL_INTERVAL = 5000; // ms

// ─── WhatsApp QR Section ───────────────────────────────────────────────────────
function WhatsAppQRSection() {
  const [qrData, setQrData] = useState(null);
  const [waStatus, setWaStatus] = useState('disconnected'); // 'disconnected'|'connecting'|'connected'
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState(null);
  const pollRef = useRef(null);

  const fetchQR = useCallback(async () => {
    setQrLoading(true);
    setQrError(null);
    try {
      const data = await OutreachService.getWhatsAppQR();
      setQrData(data.qrCode || null);
      setWaStatus(data.status || 'connecting');
    } catch (err) {
      setQrError(err?.response?.data?.message || 'Could not load QR code');
    } finally {
      setQrLoading(false);
    }
  }, []);

  const pollStatus = useCallback(async () => {
    try {
      const data = await OutreachService.getWhatsAppStatus();
      setWaStatus(data.status || 'disconnected');
      if (data.status === 'connected') {
        clearInterval(pollRef.current);
      }
    } catch {
      // silent poll failure
    }
  }, []);

  useEffect(() => {
    fetchQR();
    pollRef.current = setInterval(pollStatus, WA_POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [fetchQR, pollStatus]);

  const statusConfig = {
    connected:    { color: 'text-green-600', bg: 'bg-green-50 border-green-200', icon: <CheckCircle className="w-4 h-4" />, label: 'Connected' },
    connecting:   { color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', icon: <Loader2 className="w-4 h-4 animate-spin" />, label: 'Connecting…' },
    disconnected: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: <XCircle className="w-4 h-4" />, label: 'Disconnected' },
  };
  const sc = statusConfig[waStatus] || statusConfig.disconnected;

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-green-600" />
          WhatsApp Connection
        </h2>
        <span className={`badge border ${sc.bg} ${sc.color} gap-1.5`}>
          {sc.icon} {sc.label}
        </span>
      </div>
      <div className="card-body">
        {waStatus === 'connected' ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-green-700 font-medium">WhatsApp is connected and ready</p>
            <button className="btn btn-outline" onClick={fetchQR}>
              <RefreshCw className="w-4 h-4" /> Re-link Device
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* QR Image */}
            <div className="flex-shrink-0 flex flex-col items-center gap-3">
              <div className="w-48 h-48 border-2 border-gray-200 rounded-xl flex items-center justify-center bg-gray-50">
                {qrLoading ? (
                  <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                ) : qrError ? (
                  <div className="text-center text-red-500 text-xs px-3">
                    <XCircle className="w-6 h-6 mx-auto mb-1" />
                    {qrError}
                  </div>
                ) : qrData ? (
                  <img
                    src={`data:image/png;base64,${qrData}`}
                    alt="WhatsApp QR Code"
                    className="w-44 h-44 object-contain"
                  />
                ) : (
                  <p className="text-xs text-gray-400">No QR available</p>
                )}
              </div>
              <button className="btn btn-outline btn-sm text-xs" onClick={fetchQR} disabled={qrLoading}>
                <RefreshCw className={`w-3 h-3 ${qrLoading ? 'animate-spin' : ''}`} />
                Refresh QR
              </button>
            </div>
            {/* Instructions */}
            <div className="space-y-3 flex-1">
              <p className="text-sm font-medium text-gray-700">Scan to connect WhatsApp</p>
              <ol className="text-sm text-gray-500 space-y-2 list-none">
                {['Open WhatsApp on your phone', 'Tap Menu (⋮) → Linked Devices', 'Tap "Link a Device"', 'Point your phone at this QR code'].map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              <p className="text-xs text-gray-400">QR code expires in 60 seconds. Auto-polling every 5s.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Message Preview Panel ─────────────────────────────────────────────────────
function MessagePreview({ message, onRegenerate, isAI, loading }) {
  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          Message Preview
        </h2>
        {isAI && (
          <button
            className="btn btn-outline gap-2 text-xs"
            onClick={onRegenerate}
            disabled={loading}
          >
            {loading
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Zap className="w-3 h-3 text-yellow-500" />
            }
            AI Regenerate
          </button>
        )}
      </div>
      <div className="card-body">
        {message ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 relative">
            {/* WhatsApp bubble style */}
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{message}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-green-200">
              <span className="text-xs text-gray-400">
                {message.length} characters
              </span>
              {isAI && (
                <span className="badge badge-primary text-xs">
                  <Zap className="w-2.5 h-2.5" /> AI Generated
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Configure campaign to preview message</p>
          </div>
        )}
      </div>
    </div>
  );
}
MessagePreview.propTypes = {
  message:      PropTypes.string,
  onRegenerate: PropTypes.func.isRequired,
  isAI:         PropTypes.bool.isRequired,
  loading:      PropTypes.bool.isRequired,
};
MessagePreview.defaultProps = { message: null };

// ─── Outreach Stats per channel ────────────────────────────────────────────────
function OutreachStats() {
  // Mock stats — in production, fetch from /outreach/stats
  const channelStats = [
    { channel: 'WhatsApp', sent: 1240, delivered: 1198, responded: 312, icon: <MessageSquare className="w-5 h-5 text-green-600" />, color: 'green' },
    { channel: 'SMS',      sent: 850,  delivered: 821,  responded: 98,  icon: <Phone className="w-5 h-5 text-blue-600" />,  color: 'blue' },
    { channel: 'Email',    sent: 560,  delivered: 534,  responded: 47,  icon: <Mail className="w-5 h-5 text-purple-600" />, color: 'purple' },
  ];
  const colorMap = {
    green:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700'  },
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700'   },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  };
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="section-title">Outreach Stats by Channel</h2>
      </div>
      <div className="card-body grid grid-cols-1 sm:grid-cols-3 gap-4">
        {channelStats.map((c) => {
          const cls = colorMap[c.color];
          const responseRate = c.sent > 0 ? ((c.responded / c.sent) * 100).toFixed(1) : 0;
          const deliveryRate = c.sent > 0 ? ((c.delivered / c.sent) * 100).toFixed(1) : 0;
          return (
            <div key={c.channel} className={`rounded-xl border p-4 ${cls.bg} ${cls.border}`}>
              <div className="flex items-center gap-2 mb-3">
                {c.icon}
                <span className={`font-semibold ${cls.text}`}>{c.channel}</span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Sent</span><span className="font-medium">{c.sent.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Delivered</span><span className="font-medium">{c.delivered.toLocaleString()} <span className="text-xs text-gray-400">({deliveryRate}%)</span></span></div>
                <div className="flex justify-between"><span className="text-gray-500">Responded</span><span className={`font-bold ${cls.text}`}>{c.responded.toLocaleString()} <span className="text-xs">({responseRate}%)</span></span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Send Queue Counter ────────────────────────────────────────────────────────
function SendQueueCounter({ count }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
        <Send className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{count.toLocaleString()}</p>
        <p className="text-sm text-gray-500">Messages in send queue</p>
      </div>
      <div className="ml-auto">
        <span className="badge badge-primary gap-1.5">
          <Clock className="w-3 h-3" /> Live
        </span>
      </div>
    </div>
  );
}
SendQueueCounter.propTypes = { count: PropTypes.number.isRequired };

// ─── Campaign Builder ──────────────────────────────────────────────────────────
function CampaignBuilder({ onMessageChange, onAIToggle, isAI }) {
  const [category, setCategory] = useState('');
  const [selectedChannels, setSelectedChannels] = useState(['whatsapp']);
  const [manualMessage, setManualMessage] = useState('');
  const [open, setOpen] = useState(false);

  const toggleChannel = (id) => {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (!isAI) {
      onMessageChange(manualMessage);
    }
  }, [manualMessage, isAI, onMessageChange]);

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="section-title flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600" />
          Campaign Builder
        </h2>
      </div>
      <div className="card-body space-y-5">
        {/* Category */}
        <div>
          <label className="label">Target Category</label>
          <div className="relative">
            <select
              className="input appearance-none pr-8"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">— Select category —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Channels */}
        <div>
          <label className="label">Channels</label>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => toggleChannel(ch.id)}
                className={`btn text-sm ${selectedChannels.includes(ch.id) ? 'btn-primary' : 'btn-outline'}`}
              >
                {ch.icon} {ch.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI / Manual toggle */}
        <div>
          <label className="label">Message Mode</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onAIToggle(true)}
              className={`btn text-sm flex-1 ${isAI ? 'btn-primary' : 'btn-outline'}`}
            >
              <Zap className="w-4 h-4 text-yellow-400" /> AI Generated
            </button>
            <button
              type="button"
              onClick={() => onAIToggle(false)}
              className={`btn text-sm flex-1 ${!isAI ? 'btn-primary' : 'btn-outline'}`}
            >
              <MessageSquare className="w-4 h-4" /> Manual
            </button>
          </div>
        </div>

        {/* Manual message textarea */}
        {!isAI && (
          <div>
            <label className="label">Message Text</label>
            <textarea
              className="input min-h-[120px] resize-none"
              placeholder="Hi {name}, we noticed your business {business} on {source}. We'd love to connect…"
              value={manualMessage}
              onChange={(e) => setManualMessage(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              Use {'{name}'}, {'{business}'}, {'{source}'} as dynamic placeholders
            </p>
          </div>
        )}

        {/* Launch button */}
        <button
          className="btn btn-primary w-full"
          disabled={!category || selectedChannels.length === 0}
        >
          <Send className="w-4 h-4" />
          Launch Campaign
        </button>
      </div>
    </div>
  );
}
CampaignBuilder.propTypes = {
  onMessageChange: PropTypes.func.isRequired,
  onAIToggle:      PropTypes.func.isRequired,
  isAI:            PropTypes.bool.isRequired,
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function OutreachPage() {
  const [isAI, setIsAI] = useState(true);
  const [message, setMessage] = useState('Hi {name}! 👋 We found your business on Google Maps and wanted to reach out. We help local businesses like {business} generate more leads through automation. Interested in a quick call? 🚀');
  const [regenerating, setRegenerating] = useState(false);
  const [queueCount] = useState(47); // In production, poll /outreach/queue/count

  const aiMessages = [
    'Hi {name}! 👋 We noticed your business {business} and thought our lead generation platform could help you scale. Want to see how? Reply YES for a free demo.',
    'Hello {name}, we discovered {business} and think there is a great growth opportunity. Our automation has helped 500+ businesses like yours. Can we chat for 5 min?',
    'Hi {name}! Running {business}? We help businesses like yours automate outreach and get 3x more quality leads. Interested? Reply to learn more! 😊',
  ];

  const handleRegenerate = async () => {
    setRegenerating(true);
    // Simulate AI regeneration (replace with actual API call)
    await new Promise((r) => setTimeout(r, 1200));
    const idx = Math.floor(Math.random() * aiMessages.length);
    setMessage(aiMessages[idx]);
    setRegenerating(false);
  };

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Outreach</h1>
        <p className="page-subtitle">Manage WhatsApp, SMS & Email campaigns</p>
      </div>

      {/* Send queue counter */}
      <SendQueueCounter count={queueCount} />

      {/* WhatsApp QR */}
      <WhatsAppQRSection />

      {/* Campaign Builder + Message Preview side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CampaignBuilder
          onMessageChange={setMessage}
          onAIToggle={setIsAI}
          isAI={isAI}
        />
        <MessagePreview
          message={message}
          onRegenerate={handleRegenerate}
          isAI={isAI}
          loading={regenerating}
        />
      </div>

      {/* Channel stats */}
      <OutreachStats />
    </div>
  );
}
