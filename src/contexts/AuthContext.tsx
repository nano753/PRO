import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { Permission, User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  registerCompanyAndAdmin: (data: {
    companyName: string;
    document: string;
    logo?: string;
    phone?: string;
    address?: string;
    adminName: string;
    adminUsername: string;
    adminPassword: string;
  }) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  canManageUsers: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = async () => {
    try {
      const current = await authService.getCurrentUser();
      setUser(current);
    } catch (e) {
      console.error('Error loading current user:', e);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (username: string, password: string) => {
    const loggedIn = await authService.login(username, password);
    setUser(loggedIn);
  };

  const registerCompanyAndAdmin = async (data: {
    companyName: string;
    document: string;
    logo?: string;
    phone?: string;
    address?: string;
    adminName: string;
    adminUsername: string;
    adminPassword: string;
  }) => {
    const result = await authService.registerCompanyAndAdmin(data);
    setUser(result.user);
    // Broadcast data change event so AppContext updates its settings immediately
    window.dispatchEvent(new CustomEvent('estoque_data_changed'));
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const hasPermission = (permission: Permission): boolean => {
    return authService.hasPermission(user, permission);
  };

  const canManageUsers = user?.role === 'ADMINISTRADOR';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        registerCompanyAndAdmin,
        logout,
        hasPermission,
        canManageUsers,
        refreshUser: loadUser,
      }}
    >
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
