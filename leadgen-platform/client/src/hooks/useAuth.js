import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/auth.service';
import useAuthStore from '../store/authStore';

export function useLogin() {
  const { login } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ email, password }) => AuthService.login(email, password),
    onSuccess: (data) => {
      login(data);
      navigate('/dashboard');
    },
  });
}

export function useRegister() {
  const { login } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ name, email, password }) => AuthService.register(name, email, password),
    onSuccess: (data) => {
      login(data);
      navigate('/dashboard');
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: AuthService.logout,
    onSettled: () => {
      logout();
      queryClient.clear();
      navigate('/login');
    },
  });
}

export function useGetMe() {
  const { isAuthenticated, setUser } = useAuthStore();

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const data = await AuthService.getMe();
      setUser(data.user || data);
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

export function useRefreshToken() {
  const { login } = useAuthStore();

  return useMutation({
    mutationFn: AuthService.refreshToken,
    onSuccess: (data) => {
      login(data);
    },
  });
}

// Convenience hook that bundles everything
export function useAuth() {
  const store = useAuthStore();
  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const registerMutation = useRegister();
  const { data: meData, isLoading: meLoading } = useGetMe();

  return {
    user: store.user,
    token: store.token,
    isAuthenticated: store.isAuthenticated,
    isLoading: meLoading,
    login: loginMutation,
    logout: logoutMutation,
    register: registerMutation,
    meData,
  };
}

export default useAuth;
