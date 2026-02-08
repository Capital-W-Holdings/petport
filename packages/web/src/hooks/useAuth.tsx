import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { auth, User, UserRole } from '@/lib/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  // Role helpers
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setState({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const user = await auth.me();
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch {
      localStorage.removeItem('token');
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const result = await auth.login(email, password);
    localStorage.setItem('token', result.tokens.accessToken);
    setState({ user: result.user, isLoading: false, isAuthenticated: true });
  };

  const register = async (email: string, password: string, name: string) => {
    const result = await auth.register(email, password, name);
    localStorage.setItem('token', result.tokens.accessToken);
    setState({ user: result.user, isLoading: false, isAuthenticated: true });
  };

  const logout = async () => {
    try {
      await auth.logout();
    } catch {
      // Ignore errors
    }
    localStorage.removeItem('token');
    setState({ user: null, isLoading: false, isAuthenticated: false });
  };

  // Computed role helpers
  const isAdmin = useMemo(
    () => state.user?.role === 'ADMIN' || state.user?.role === 'SUPER_ADMIN',
    [state.user]
  );

  const isSuperAdmin = useMemo(() => state.user?.role === 'SUPER_ADMIN', [state.user]);

  const hasRole = useCallback(
    (role: UserRole): boolean => {
      if (!state.user) return false;
      const hierarchy: Record<UserRole, number> = { USER: 0, ADMIN: 1, SUPER_ADMIN: 2 };
      return hierarchy[state.user.role] >= hierarchy[role];
    },
    [state.user]
  );

  return (
    <AuthContext.Provider
      value={{ ...state, login, register, logout, isAdmin, isSuperAdmin, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
