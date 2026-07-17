import api from './api';
import { type LoginRequest, type Account, type LoginResponse } from '../types';

export const authService = {
  login: async (credentials: LoginRequest) => {
    const response = await api.post<LoginResponse & { active: boolean }>(
      '/auth/login',
      credentials,
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  },

  register: async (userData: Account) => {
    const response = await api.post<any>('/auth/register', userData, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('user');
  },

  getCurrentUser: (): (LoginResponse & { active?: boolean }) | null => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getAllAccounts: async () => {
    const response = await api.get<Account[]>('/accounts');
    return response.data;
  },

  getAccountById: async () => {
    const response = await api.get<Account>(`/accounts/my-profile`);
    return response.data;
  },

  updateAccount: async (account: Account) => {
    const response = await api.put<any>(`/accounts/update-profile`, account, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  },

  toggleActive: async (idAccount: string) => {
    const response = await api.post<any>(`/accounts/${idAccount}/toggle-active`, {}, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  },
};
