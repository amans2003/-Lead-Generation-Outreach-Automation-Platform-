import React, { useState } from 'react';
import PropTypes from 'prop-types';

const CHANNEL_ICONS = {
  whatsapp: '💬',
  email:    '📧',
  sms:      '📱',
  linkedin: '🔗',
};

const CHANNEL_COLORS = {
  whatsapp: { bg: '#f0fdf4', border: '#86efac', accent: '#16a34a' },
  email:    { bg: '#eff6ff', border: '#bfdbfe', accent: '#2563eb' },
  sms:      { bg: '#fdf4ff', border: '#e9d5ff', accent: '#9333ea' },
  linkedin: { bg: '#eff6ff', border: '#bfdbfe', accent: '#0369a1' },
};

function MessagePreview({ channel, message, leadName, onRegenerate, loading }) {
  const [copied, setCopied] = useState(false);

  const colors = CHANNEL_COLORS[channel] || { bg: '#f9fafb', border: '#e5e7eb', accent: '#374151' };
  const icon = CHANNEL_ICONS[channel] || '✉';

  function handleCopy() {
    navigator.clipboard.writeText(message || '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div style={{
      background: colors.bg, border: `1px solid ${colors.border}`,
      borderRadius: '12px', padding: '16px 18px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>{icon}</span>
          <span style={{ fontSize: '14px', fontWeight: '700', color: colors.accent, textTransform: 'capitalize' }}>
            {channel}
          </span>
          {leadName && (
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>— for {leadName}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={handleCopy}
            disabled={!message}
            style={{
              padding: '5px 10px', border: '1px solid ' + colors.border,
              borderRadius: '6px', fontSize: '11px', cursor: 'pointer',
              background: copied ? colors.accent : '#fff',
              color: copied ? '#fff' : colors.accent,
              fontWeight: '600', transition: 'all 0.15s',
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={onRegenerate}
            disabled={loading}
            style={{
              padding: '5px 10px', border: '1px solid ' + colors.border,
              borderRadius: '6px', fontSize: '11px', cursor: loading ? 'wait' : 'pointer',
              background: '#fff', color: colors.accent,
              fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            {loading ? '⟳ ...' : '⟳ Regenerate'}
          </button>
        </div>
      </div>

      {/* Message body */}
      <div style={{
        background: '#fff', borderRadius: '8px', padding: '14px',
        border: `1px solid ${colors.border}`, minHeight: '80px',
        fontSize: '13px', color: '#374151', lineHeight: '1.6',
        whiteSpace: 'pre-wrap', fontFamily: 'system-ui, sans-serif',
      }}>
        {loading
          ? <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Generating message…</span>
          : message || <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>No message generated yet.</span>
        }
      </div>

      {/* Character count */}
      {message && (
        <div style={{ marginTop: '6px', fontSize: '11px', color: '#9ca3af', textAlign: 'right' }}>
          {message.length} characters
          {channel === 'sms' && message.length > 160 && (
            <span style={{ color: '#f59e0b', marginLeft: '6px' }}>
              ({Math.ceil(message.length / 160)} SMS parts)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

MessagePreview.propTypes = {
  channel:      PropTypes.oneOf(['whatsapp', 'email', 'sms', 'linkedin']).isRequired,
  message:      PropTypes.string,
  leadName:     PropTypes.string,
  onRegenerate: PropTypes.func,
  loading:      PropTypes.bool,
};

MessagePreview.defaultProps = {
  message:      '',
  leadName:     '',
  onRegenerate: () => {},
  loading:      false,
};

export default MessagePreview;
