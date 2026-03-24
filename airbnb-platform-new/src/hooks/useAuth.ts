import { useState, useCallback, useEffect } from 'react';
import type { User } from '@/types';
import { authAPI } from '@/services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.getMe()
        .then(user => {
          setAuth({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        })
        .catch(() => {
          localStorage.removeItem('token');
          setAuth({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        });
    } else {
      setAuth(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setAuth(prev => ({ ...prev, isLoading: true, error: null }));
      const { user, token } = await authAPI.login({ email, password });
      localStorage.setItem('token', token);
      setAuth({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (error: any) {
      setAuth(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Login failed',
      }));
      return false;
    }
  }, []);

  const register = useCallback(async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    isHost?: boolean;
  }): Promise<boolean> => {
    try {
      setAuth(prev => ({ ...prev, isLoading: true, error: null }));
      const { user, token } = await authAPI.register(userData);
      localStorage.setItem('token', token);
      setAuth({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (error: any) {
      setAuth(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Registration failed',
      }));
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setAuth({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setAuth((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...updates } : null,
    }));
  }, []);

  const clearError = useCallback(() => {
    setAuth(prev => ({ ...prev, error: null }));
  }, []);

  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
    login,
    register,
    logout,
    updateUser,
    clearError,
  };
};
