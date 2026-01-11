import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, User } from '@/lib/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
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

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
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
