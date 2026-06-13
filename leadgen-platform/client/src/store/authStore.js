import { create } from 'zustand';

const TOKEN_KEY = 'leadgen_token';
const USER_KEY = 'leadgen_user';

const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const useAuthStore = create((set) => ({
  user: getStoredUser(),
  token: getStoredToken(),
  isAuthenticated: !!getStoredToken(),
  isLoading: false,

  // Primary login — called with { token, ...userFields }
  login: (userData) => {
    const { token, ...user } = userData;
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem('token', token); // compat for pages using localStorage.getItem('token')
    } catch { /* localStorage unavailable */ }
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  // Alias used by LoginPage / RegisterPage
  setAuth: (user, token) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem('token', token);
    } catch { /* localStorage unavailable */ }
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem('token');
    } catch { /* localStorage unavailable */ }
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user) => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch { /* localStorage unavailable */ }
    set({ user });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));

export default useAuthStore;
