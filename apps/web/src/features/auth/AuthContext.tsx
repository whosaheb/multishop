import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setToken } from '@/lib/api';
import type { AuthUser, LoginResponse } from '@/types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (mobileNumber: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'multishop.user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    const token = sessionStorage.getItem('accessToken');
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setIsLoading(false);
  }, []);

  const login = async (mobileNumber: string, password: string) => {
    const res = await api.post<LoginResponse>('/auth/login', { mobileNumber, password });
    setToken(res.accessToken);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(res.user));
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setToken(null);
      sessionStorage.removeItem(STORAGE_KEY);
      setUser(null);
    }
  };

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
