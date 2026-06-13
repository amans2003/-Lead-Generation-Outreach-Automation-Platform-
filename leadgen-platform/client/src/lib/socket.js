import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

/**
 * Initialise and return the shared Socket.io instance.
 * Calling this multiple times is safe — it reuses the existing connection.
 */
export function initSocket(token) {
  if (socket && socket.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1500,
  });

  socket.on('connect', () => {
    console.info('[socket] connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.info('[socket] disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('[socket] connect error:', err.message);
  });

  return socket;
}

/** Return the existing socket instance (may be null if not yet initialised). */
export function getSocket() {
  return socket;
}

/** Disconnect and clean up the socket instance. */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
