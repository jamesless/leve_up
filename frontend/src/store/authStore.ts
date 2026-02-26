import { create } from 'zustand';
import type { IUser } from '@/types';

interface IAuthState {
  token: string | null;
  user: IUser | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: IUser) => void;
  setUser: (user: IUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<IAuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: (() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  })(),
  isAuthenticated: !!localStorage.getItem('token'),

  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
