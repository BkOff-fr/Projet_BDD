import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User, RegisterInput } from '@/types';
import { authAPI } from '@/services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const useAuthState = () => {
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

  const register = useCallback(async (userData: RegisterInput): Promise<boolean> => {
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

const AuthContext = createContext<ReturnType<typeof useAuthState> | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const value = useAuthState();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
};
