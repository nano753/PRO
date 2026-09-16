import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { MainLayout, PageId } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PDVPage } from './pages/PDVPage';
import { ProductsPage } from './pages/ProductsPage';
import { StockInPage } from './pages/StockInPage';
import { StockOutPage } from './pages/StockOutPage';
import { MovementsPage } from './pages/MovementsPage';
import { CashRegisterPage } from './pages/CashRegisterPage';
import { SalesPage } from './pages/SalesPage';
import { ReportsPage } from './pages/ReportsPage';
import { LowStockPage } from './pages/LowStockPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when user is typing in input or textarea
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if (!isAuthenticated) return;

      if (e.key === 'F1') {
        e.preventDefault();
        setCurrentPage('pdv');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setCurrentPage('produtos');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setCurrentPage('caixa');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setCurrentPage('dashboard');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Carregando ESTOQUE PRO...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'pdv':
        return <PDVPage onNavigate={setCurrentPage} />;
      case 'produtos':
        return <ProductsPage onNavigate={setCurrentPage} />;
      case 'entrada':
        return <StockInPage onNavigate={setCurrentPage} />;
      case 'saida':
        return <StockOutPage onNavigate={setCurrentPage} />;
      case 'movimentacoes':
        return <MovementsPage />;
      case 'caixa':
        return <CashRegisterPage />;
      case 'vendas':
        return <SalesPage />;
      case 'relatorios':
        return <ReportsPage />;
      case 'estoque_baixo':
        return <LowStockPage onNavigate={setCurrentPage} />;
      case 'usuarios':
        return <UsersPage />;
      case 'backup':
      case 'configuracoes':
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <MainLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderCurrentPage()}
    </MainLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
