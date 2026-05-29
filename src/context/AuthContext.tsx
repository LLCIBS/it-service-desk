import React, { createContext, useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import type { AuthOrganization, AuthUser } from '../types';

interface AuthState {
  user: AuthUser | null;
  organization: AuthOrganization | null;
  loading: boolean;
  inTenantContext: boolean;
  isSuperAdmin: boolean;
}

interface AuthContextValue extends AuthState {
  login: (orgSlug: string, email: string, password: string) => Promise<void>;
  platformLogin: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<AuthOrganization>;
  exitOrganization: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function isPlatformPath() {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/platform');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<AuthState>({
    user: null,
    organization: null,
    loading: true,
    inTenantContext: false,
    isSuperAdmin: false,
  });

  const applyAuthPayload = (data: {
    user: AuthUser;
    organization: AuthOrganization;
    inTenantContext?: boolean;
  }) => {
    setState({
      user: data.user,
      organization: data.organization,
      loading: false,
      inTenantContext: Boolean(data.inTenantContext),
      isSuperAdmin: data.user.role === 'super_admin',
    });
  };

  const refresh = useCallback(async () => {
    try {
      const endpoint = isPlatformPath() ? '/api/platform/auth/me' : '/api/auth/me';
      const res = await apiFetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        applyAuthPayload(data);
      } else {
        setState({
          user: null,
          organization: null,
          loading: false,
          inTenantContext: false,
          isSuperAdmin: false,
        });
      }
    } catch {
      setState({
        user: null,
        organization: null,
        loading: false,
        inTenantContext: false,
        isSuperAdmin: false,
      });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, location.pathname]);

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
    applyAuthPayload({ ...data, inTenantContext: true });
  };

  const platformLogin = async (email: string, password: string) => {
    const res = await apiFetch('/api/platform/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Неверный email или пароль');
    }
    const data = await res.json();
    applyAuthPayload(data);
  };

  const logout = async () => {
    const endpoint =
      state.isSuperAdmin && !state.inTenantContext
        ? '/api/platform/auth/logout'
        : '/api/auth/logout';
    await apiFetch(endpoint, { method: 'POST' }).catch(() => {});
    setState({
      user: null,
      organization: null,
      loading: false,
      inTenantContext: false,
      isSuperAdmin: false,
    });
  };

  const switchOrganization = async (orgId: string) => {
    const res = await apiFetch(`/api/platform/switch-org/${orgId}`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Не удалось переключить организацию');
    }
    const data = await res.json();
    setState((prev) => ({
      ...prev,
      organization: data.organization,
      inTenantContext: true,
      isSuperAdmin: true,
    }));
    return data.organization as AuthOrganization;
  };

  const exitOrganization = async () => {
    const res = await apiFetch('/api/platform/exit-org', { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Не удалось выйти из организации');
    }
    const data = await res.json();
    setState((prev) => ({
      ...prev,
      organization: data.organization,
      inTenantContext: false,
    }));
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        platformLogin,
        logout,
        refresh,
        switchOrganization,
        exitOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
