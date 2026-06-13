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

  login: (userData) => {
    const { token, ...user } = userData;
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      // localStorage unavailable
    }
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // localStorage unavailable
    }
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user) => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      // localStorage unavailable
    }
    set({ user });
  },
}));

export default useAuthStore;
