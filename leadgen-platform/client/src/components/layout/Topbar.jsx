import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Menu, Bell, LogOut, User, ChevronDown, Wifi, WifiOff } from 'lucide-react';
import { clsx } from 'clsx';
import useAuthStore from '../../stores/authStore.js';
import { getSocket } from '../../lib/socket.js';

function ConnectionBadge() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    setConnected(socket.connected);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <div
      className={clsx(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        connected
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-gray-100 text-gray-500 border-gray-200'
      )}
      title={connected ? 'Real-time connected' : 'Not connected'}
    >
      {connected ? (
        <Wifi size={12} className="shrink-0" />
      ) : (
        <WifiOff size={12} className="shrink-0" />
      )}
      <span className="hidden sm:inline">{connected ? 'Live' : 'Offline'}</span>
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user
    ? (user.name || user.email || 'U')
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name || 'User avatar'}
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-semibold">
            {initials}
          </div>
        )}
        <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
          {user?.name || user?.email || 'User'}
        </span>
        <ChevronDown size={14} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-52 rounded-xl bg-white shadow-lg border border-gray-200 py-1 z-50">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {user?.email || ''}
            </p>
          </div>

          <button
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => { setOpen(false); }}
          >
            <User size={15} className="text-gray-400" />
            Profile
          </button>

          <button
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            onClick={() => { setOpen(false); logout(); }}
          >
            <LogOut size={15} className="text-red-400" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function Topbar({ title, onMenuClick }) {
  return (
    <header className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        {title && (
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <ConnectionBadge />

        <button
          className="relative p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
        </button>

        <UserMenu />
      </div>
    </header>
  );
}

Topbar.propTypes = {
  title: PropTypes.string,
  onMenuClick: PropTypes.func,
};

Topbar.defaultProps = {
  title: '',
  onMenuClick: () => {},
};

export default Topbar;
