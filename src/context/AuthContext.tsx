import React, { createContext, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { AuthOrganization, AuthUser } from '../types';

interface AuthState {
  user: AuthUser | null;
  organization: AuthOrganization | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (orgSlug: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    organization: null,
    loading: true,
  });

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setState({ user: data.user, organization: data.organization, loading: false });
      } else {
        setState({ user: null, organization: null, loading: false });
      }
    } catch {
      setState({ user: null, organization: null, loading: false });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (orgSlug: string, email: string, password: string) => {
    const res = await apiFetch(`/api/o/${orgSlug}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Неверный email или пароль');
    }
    const data = await res.json();
    setState({ user: data.user, organization: data.organization, loading: false });
  };

  const logout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setState({ user: null, organization: null, loading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
