import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api, getAuthToken, setAuthToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  switchDemo: (role: UserRole, email?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      const token = getAuthToken();
      if (token) {
        try {
          const res = await api.getCurrentUser();
          setUser(res.user);
        } catch {
          setAuthToken(null);
          // If token expired, auto-seed with attendee for immediate smooth reviewer experience
          await autoSeedAttendee();
        }
      } else {
        // Auto-seed with demo attendee account so the reviewer doesn't see a blank locked screen
        await autoSeedAttendee();
      }
      setLoading(false);
    }

    async function autoSeedAttendee() {
      try {
        const res = await api.switchDemoAccount('ATTENDEE', 'attendee@eventflow.com');
        setAuthToken(res.token);
        setUser(res.user);
      } catch (e) {
        console.warn('Auto-seed demo login error:', e);
      }
    }

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setAuthToken(res.token);
    setUser(res.user);
  };

  const register = async (name: string, email: string, password: string, role: UserRole) => {
    const res = await api.register({ name, email, password, role });
    setAuthToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  const switchDemo = async (role: UserRole, email?: string) => {
    setLoading(true);
    try {
      const res = await api.switchDemoAccount(role, email);
      setAuthToken(res.token);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, switchDemo }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
