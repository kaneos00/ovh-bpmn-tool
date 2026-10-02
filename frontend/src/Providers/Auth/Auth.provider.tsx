import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../queryClient';
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from '../../shared/api/apiClient';

export type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  role: 'consultation' | 'editor' | 'admin';
  enabled: boolean;
  canModify: boolean;
  canAdministerUsers: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    apiClient
      .get('/auth/me')
      .then((currentUser: AuthUser) => setUser(currentUser))
      .catch(() => {
        clearAuthToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(username: string, password: string) {
        const result = await apiClient.post('/auth/login', {
          username,
          password,
        });
        setAuthToken(result.token);
        setUser(result.user);
        return result.user;
      },
      async logout() {
        try {
          if (getAuthToken()) {
            await apiClient.post('/auth/logout', {});
          }
        } finally {
          clearAuthToken();
          setUser(null);
        }
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
