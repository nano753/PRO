import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  PlusCircle,
  MinusCircle,
  FileSpreadsheet,
  Wallet,
  Receipt,
  BarChart3,
  AlertTriangle,
  Users,
  Database,
  Settings,
  LogOut,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  Menu,
  X,
  Sparkles,
  Download,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';

export type PageId =
  | 'dashboard'
  | 'pdv'
  | 'produtos'
  | 'entrada'
  | 'saida'
  | 'movimentacoes'
  | 'caixa'
  | 'vendas'
  | 'relatorios'
  | 'estoque_baixo'
  | 'usuarios'
  | 'backup'
  | 'configuracoes';

interface MainLayoutProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentPage,
  onNavigate,
  children,
}) => {
  const { user, logout, hasPermission, canManageUsers } = useAuth();
  const {
    settings,
    updateSettings,
    activeCashRegister,
    formatCurrency,
    showDemoPrompt,
    loadDemoData,
    skipDemoData,
    toasts,
    removeToast,
  } = useApp();
  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const navItems = [
    { id: 'dashboard' as PageId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pdv' as PageId, label: 'PDV — Vendas', icon: ShoppingCart, highlight: true },
    { id: 'produtos' as PageId, label: 'Produtos', icon: Package, permission: 'ver_produtos' as const },
    { id: 'entrada' as PageId, label: 'Entrada', icon: PlusCircle, permission: 'registrar_entrada' as const },
    { id: 'saida' as PageId, label: 'Saída', icon: MinusCircle, permission: 'registrar_saida' as const },
    { id: 'movimentacoes' as PageId, label: 'Movimentações', icon: FileSpreadsheet, permission: 'ver_produtos' as const },
    { id: 'caixa' as PageId, label: 'Caixa', icon: Wallet },
    { id: 'vendas' as PageId, label: 'Vendas', icon: Receipt },
    { id: 'relatorios' as PageId, label: 'Relatórios', icon: BarChart3, permission: 'ver_relatorios' as const },
    { id: 'estoque_baixo' as PageId, label: 'Estoque Baixo', icon: AlertTriangle, badgeColor: 'text-amber-400' },
    ...(canManageUsers ? [{ id: 'usuarios' as PageId, label: 'Usuários', icon: Users }] : []),
    { id: 'backup' as PageId, label: 'Backup & Dados', icon: Database, permission: 'fazer_backup' as const },
    { id: 'configuracoes' as PageId, label: 'Configurações', icon: Settings, permission: 'configuracoes' as const },
  ];

  const handleNavClick = (page: PageId) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  const toggleTheme = () => {
    const next = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: next });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased selection:bg-blue-600 selection:text-white print:bg-white print:text-black">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-40 print:hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
            EP
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white leading-none">
              {settings.companyName || 'ESTOQUE PRO'}
            </h1>
            <span className="text-[10px] text-slate-400">PDV & Estoque 100% Offline</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Online/Offline Badge */}
          <span
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </span>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 transition"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Sidebar for Desktop & Mobile Overlay */}
      <aside
        className={`fixed md:sticky top-0 bottom-0 left-0 z-50 md:z-30 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } print:hidden h-screen`}
      >
        {/* Brand Area */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white text-lg shadow-md shadow-blue-500/20">
              EP
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold text-base tracking-tight text-white truncate">
                {settings.companyName || 'ESTOQUE PRO'}
              </h1>
              <p className="text-[11px] text-blue-400 font-medium">PDV + Estoque + Caixa</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cash Status Widget */}
        <div className="px-4 py-3 mx-3 mt-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Status do Caixa</span>
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                activeCashRegister ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeCashRegister ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              {activeCashRegister ? 'ABERTO' : 'FECHADO'}
            </span>
          </div>
          {activeCashRegister ? (
            <div className="mt-1 flex justify-between items-baseline text-xs">
              <span className="text-slate-500 text-[11px]">Dinheiro em Gaveta:</span>
              <span className="font-mono font-bold text-slate-200">
                {formatCurrency(activeCashRegister.expectedCash)}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-[11px] text-slate-500">Abra o caixa para vender</p>
          )}
        </div>

        {/* Navigation Menu Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {navItems.map(item => {
            if (item.permission && !hasPermission(item.permission)) {
              return null;
            }

            const isActive = currentPage === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-colors ${
                  isActive
                    ? item.highlight
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-slate-800 text-white border-l-4 border-blue-500'
                    : item.highlight
                    ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${item.badgeColor || (isActive ? 'text-white' : 'text-slate-400')}`} />
                <span className="truncate">{item.label}</span>
                {item.highlight && !isActive && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-bold">
                    PDV
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom User Profile & Actions */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90 space-y-2">
          {/* Theme & PWA button row */}
          <div className="flex items-center justify-between px-1">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition"
              title="Alternar Tema"
            >
              {settings.theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Escuro</span>
                </>
              )}
            </button>

            {/* In-App PWA Install */}
            {!isInstalled && isInstallable && (
              <button
                onClick={install}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white transition font-medium"
                title="Instalar aplicativo"
              >
                <Download className="w-3 h-3" />
                <span>Instalar</span>
              </button>
            )}

            {!isInstalled && isIOS && (
              <button
                onClick={() => setShowIOSGuide(true)}
                className="text-[11px] px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Instalar iOS
              </button>
            )}
          </div>

          {/* User Card & Logout */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Operador'}</p>
              <p className="text-[10px] text-slate-400 capitalize">
                {user?.role === 'ADMINISTRADOR' ? 'Administrador' : 'Operador'}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
              title="Encerrar Sessão"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Desktop Top Bar */}
        <header className="hidden md:flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-20 print:hidden">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                  isOnline
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
                title={isOnline ? 'Conexão ativa' : 'Modo offline — dados salvos neste dispositivo'}
              >
                {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-rose-400" />}
                <span>{isOnline ? '🟢 Online' : '🔴 Offline — Dados salvos localmente'}</span>
              </span>
            </div>

            <div className="h-4 w-px bg-slate-800" />

            <div className="text-xs text-slate-400">
              {activeCashRegister ? (
                <span>
                  Caixa em operação por <strong>{activeCashRegister.user}</strong> (Saldo: {formatCurrency(activeCashRegister.expectedCash)})
                </span>
              ) : (
                <span className="text-amber-400">Nenhum caixa aberto no momento</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isInstalled && isInstallable && (
              <button
                onClick={install}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Instalar App</span>
              </button>
            )}

            <button
              onClick={toggleTheme}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Alternar Tema"
            >
              {settings.theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
            </button>

            <div className="text-xs text-right">
              <p className="font-semibold text-white">{user?.name}</p>
              <p className="text-[10px] text-slate-400 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 bg-slate-950 overflow-y-auto print:p-0 print:bg-white">
          {children}
        </main>
      </div>

      {/* First-run Demo Data Modal */}
      {showDemoPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Bem-vindo ao ESTOQUE PRO!</h3>
              <p className="text-sm text-slate-300 mt-1">
                Seu banco de dados local está vazio. Deseja iniciar com dados de exemplo (produtos, categorias e caixa aberto) para testar o sistema agora mesmo?
              </p>
              <p className="text-xs text-slate-500 mt-1 italic">
                * Os dados de exemplo são apenas para demonstração e podem ser excluídos ou editados a qualquer momento.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={skipDemoData}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
              >
                Iniciar Sistema Vazio
              </button>
              <button
                onClick={loadDemoData}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md transition"
              >
                Carregar Exemplos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari PWA Install Modal Guide */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold text-white">Instalar no iPhone / iPad</h3>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              1. Toque no botão <strong>Compartilhar</strong> (ícone com quadrado e seta para cima) na barra do Safari.<br />
              2. Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.<br />
              3. Toque em <strong>Adicionar</strong> no canto superior direito.
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full py-2 rounded-xl bg-slate-800 text-slate-200 text-sm font-medium hover:bg-slate-700"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none print:hidden">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium text-white transition-all transform translate-y-0 ${
              toast.type === 'success'
                ? 'bg-emerald-600 border-emerald-500'
                : toast.type === 'error'
                ? 'bg-rose-600 border-rose-500'
                : toast.type === 'warning'
                ? 'bg-amber-600 border-amber-500'
                : 'bg-blue-600 border-blue-500'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-black/20 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
