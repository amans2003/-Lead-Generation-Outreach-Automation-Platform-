import api from './api';

const AuthService = {
  /**
   * Login with email and password.
   * Returns { token, user } on success.
   */
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  /**
   * Register a new account.
   * Returns { token, user } on success.
   */
  register: async (name, email, password) => {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data;
  },

  /**
   * Logout — invalidates the server-side session/token.
   */
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  /**
   * Fetch the currently authenticated user's profile.
   */
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /**
   * Refresh the access token using a refresh token.
   */
  refreshToken: async () => {
    const response = await api.post('/auth/refresh-token');
    return response.data;
  },
};

export default AuthService;
