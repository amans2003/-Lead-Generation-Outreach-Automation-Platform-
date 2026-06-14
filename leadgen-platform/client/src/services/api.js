import axios from 'axios';
import useAuthStore from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 30000,
  withCredentials: true, // send cookies (refreshToken httpOnly cookie)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach Authorization header from authStore
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Track whether a token refresh is in flight to avoid concurrent refresh loops
let isRefreshing = false;
let pendingQueue = []; // { resolve, reject }[]

function drainQueue(error, token) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
}

// Response interceptor — try token refresh on 401 before logging out
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only attempt refresh on 401, skip if already retried or it's the refresh call itself
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh-token')
    ) {
      if (isRefreshing) {
        // Another request already kicked off a refresh — queue this one
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        }).catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        // Refresh token is sent automatically via httpOnly cookie
        const res = await api.post('/auth/refresh-token', {});
        const newToken = res.data?.data?.accessToken || res.data?.accessToken;
        if (!newToken) throw new Error('No access token in refresh response');

        // Persist new token
        useAuthStore.getState().setAuth(useAuthStore.getState().user, newToken);
        localStorage.setItem('token', newToken);

        drainQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        drainQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
