import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { Permission, User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAdminUnlocked: boolean;
  isVendor: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: (data: { email: string; name?: string; picture?: string }) => Promise<void>;
  authenticateAdmin: (username: string, password: string) => Promise<User>;
  lockAdmin: () => Promise<void>;
  updateAdminCredentials: (data: { newUsername: string; newPassword?: string; newName?: string }) => Promise<User>;
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
  switchToVendorMode: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  canManageUsers: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('estoque_pro_admin_unlocked') === 'true';
  });

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
    // When logging in normally, keep admin locked so interface begins in PDV mode
    setIsAdminUnlocked(false);
    sessionStorage.removeItem('estoque_pro_admin_unlocked');
  };

  const loginWithGoogle = async (data: { email: string; name?: string; picture?: string }) => {
    const loggedIn = await authService.loginWithGoogle(data);
    setUser(loggedIn);
    setIsAdminUnlocked(false);
    sessionStorage.removeItem('estoque_pro_admin_unlocked');
  };

  const authenticateAdmin = async (username: string, password: string): Promise<User> => {
    const adminUser = await authService.authenticateAdmin(username, password);
    setUser(adminUser);
    setIsAdminUnlocked(true);
    sessionStorage.setItem('estoque_pro_admin_unlocked', 'true');
    return adminUser;
  };

  const lockAdmin = async () => {
    setIsAdminUnlocked(false);
    sessionStorage.removeItem('estoque_pro_admin_unlocked');
    await switchToVendorMode();
  };

  const updateAdminCredentials = async (data: {
    newUsername: string;
    newPassword?: string;
    newName?: string;
  }): Promise<User> => {
    const updated = await authService.updateAdminCredentials(data);
    if (user?.role === 'ADMINISTRADOR') {
      setUser(updated);
    }
    return updated;
  };

  const switchToVendorMode = async () => {
    setIsAdminUnlocked(false);
    sessionStorage.removeItem('estoque_pro_admin_unlocked');
    // Finds or creates a default vendor/operator session
    const users = await authService.getUsers();
    let vendor = users.find(u => (u.role === 'OPERADOR' || u.role === 'VENDEDOR') && u.status === 'ativo');
    if (!vendor) {
      vendor = await authService.createUser({
        name: 'Vendedor (Operador)',
        username: 'vendedor',
        plainTextPassword: 'pdv',
        role: 'OPERADOR',
      });
    }
    localStorage.setItem('estoque_pro_current_user_id', vendor.id);
    setUser(vendor);
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
    setIsAdminUnlocked(true);
    sessionStorage.setItem('estoque_pro_admin_unlocked', 'true');
    // Broadcast data change event so AppContext updates its settings immediately
    window.dispatchEvent(new CustomEvent('estoque_data_changed'));
  };

  const logout = () => {
    setIsAdminUnlocked(false);
    sessionStorage.removeItem('estoque_pro_admin_unlocked');
    authService.logout();
    setUser(null);
  };

  const hasPermission = (permission: Permission): boolean => {
    return authService.hasPermission(user, permission);
  };

  const isAdmin = isAdminUnlocked && user?.role === 'ADMINISTRADOR';
  const isVendor = !isAdmin;
  const canManageUsers = isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin,
        isAdminUnlocked,
        isVendor,
        isLoading,
        login,
        loginWithGoogle,
        authenticateAdmin,
        lockAdmin,
        updateAdminCredentials,
        registerCompanyAndAdmin,
        logout,
        switchToVendorMode,
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
