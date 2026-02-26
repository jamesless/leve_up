import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as authService from '@/services/auth';
import { useAuthStore } from '@/store/authStore';
import type { ILoginRequest, IRegisterRequest } from '@/types';

export function useCurrentUser() {
  const { setUser, clearAuth } = useAuthStore();
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const res = await authService.getCurrentUser();
      if (res.success && res.user) {
        setUser(res.user);
        return res.user;
      }
      clearAuth();
      return null;
    },
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ILoginRequest) => authService.login(data),
    onSuccess: (res) => {
      if (res.success && res.token && res.user) {
        setAuth(res.token, res.user);
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        navigate('/game');
      }
    },
  });
}

export function useRegister() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: IRegisterRequest) => authService.register(data),
    onSuccess: (res) => {
      if (res.success && res.token && res.user) {
        setAuth(res.token, res.user);
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        navigate('/game');
      }
    },
  });
}

export function useLogout() {
  const { clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
      navigate('/');
    },
    onError: () => {
      clearAuth();
      queryClient.clear();
      navigate('/');
    },
  });
}
