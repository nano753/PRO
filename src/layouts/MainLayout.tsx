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
  Shield,
  ShieldCheck,
  KeyRound,
  ChevronDown,
  Lock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AdminAuthModal } from '../components/common/AdminAuthModal';
import { AdminCredentialsModal } from '../components/common/AdminCredentialsModal';

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
  const { user, logout, hasPermission, canManageUsers, isAdmin, switchToVendorMode } = useAuth();
  const {
    settings,
    updateSettings,
    activeCashRegister,
    formatCurrency,
    showDemoPrompt,
    loadDemoData,
    skipDemoData,
    showToast,
    toasts,
    removeToast,
  } = useApp();
  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Admin Modals & State
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [isAdminCredentialsModalOpen, setIsAdminCredentialsModalOpen] = useState(false);
  const [adminMenuDropdownOpen, setAdminMenuDropdownOpen] = useState(false);
  const [pendingAdminTargetPage, setPendingAdminTargetPage] = useState<PageId | null>(null);

  const adminOnlyPages: PageId[] = [
    'entrada',
    'saida',
    'relatorios',
    'usuarios',
    'backup',
    'configuracoes',
  ];

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
    if (adminOnlyPages.includes(page) && !isAdmin) {
      setPendingAdminTargetPage(page);
      setIsAdminAuthModalOpen(true);
      setMobileMenuOpen(false);
      return;
    }
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
          {settings.logo ? (
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center p-1 overflow-hidden">
              <img
                src={settings.logo}
                alt={settings.companyName || 'Logo'}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
              EP
            </div>
          )}
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white leading-none">
              {settings.companyName || settings.name || 'ESTOQUE PRO'}
            </h1>
            <span className="text-[10px] text-slate-400">PDV & Estoque 100% Offline</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin Quick Action Button on Mobile */}
          {isAdmin ? (
            <button
              onClick={() => setIsAdminCredentialsModalOpen(true)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              title="Admin Ativo - Toque para gerenciar credenciais"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Admin Ativo</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setPendingAdminTargetPage('dashboard');
                setIsAdminAuthModalOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/40 shadow-xs active:scale-95"
              title="Acesso à Pasta de Administração"
            >
              <Shield className="w-3.5 h-3.5 text-white" />
              <span>Admin</span>
              <Lock className="w-2.5 h-2.5 text-blue-200" />
            </button>
          )}

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
            {settings.logo ? (
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center p-1 overflow-hidden shadow-md shadow-black/30">
                <img
                  src={settings.logo}
                  alt={settings.companyName || 'Logo'}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white text-lg shadow-md shadow-blue-500/20">
                EP
              </div>
            )}
            <div className="overflow-hidden">
              <h1 className="font-bold text-base tracking-tight text-white truncate">
                {settings.companyName || settings.name || 'ESTOQUE PRO'}
              </h1>
              <p className="text-[11px] text-blue-400 font-medium truncate">
                {settings.document ? `CNPJ: ${settings.document}` : 'PDV + Estoque + Caixa'}
              </p>
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
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {!isAdmin ? (
            /* VENDOR / USER MODE - ONLY PDV IS VISIBLE */
            <div className="space-y-3">
              {/* Primary PDV Button */}
              {navItems
                .filter(i => i.id === 'pdv')
                .map(item => {
                  const isActive = currentPage === item.id;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs md:text-sm font-bold transition-all bg-blue-600 text-white shadow-md shadow-blue-600/30 cursor-pointer"
                    >
                      <Icon className="w-5 h-5 shrink-0 text-white" />
                      <div className="text-left flex-1 min-w-0">
                        <span className="block font-bold">{item.label}</span>
                        <span className="block text-[11px] text-blue-200 font-normal">Frente de Caixa Ativo</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/20 text-white font-bold">
                        ATIVO
                      </span>
                    </button>
                  );
                })}

              {/* PASTA DE ADMINISTRAÇÃO (LOCKED UNTIL ADMIN CREDENTIALS ENTERED) */}
              <div className="pt-3 border-t border-slate-800/80">
                <div className="px-1 mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Acesso Gerencial
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    Bloqueado
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPendingAdminTargetPage('dashboard');
                    setIsAdminAuthModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-blue-500/30 hover:border-blue-500/60 text-left transition-all group cursor-pointer shadow-sm active:scale-98"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-xs flex items-center gap-1.5">
                      <span>Pasta de Administração</span>
                    </div>
                    <div className="text-[11px] text-slate-400 group-hover:text-slate-300 truncate">
                      Digitar usuário e senha admin
                    </div>
                  </div>
                  <Lock className="w-4 h-4 text-slate-500 group-hover:text-blue-400 shrink-0" />
                </button>

                <div className="mt-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-[11px] text-slate-400 leading-relaxed">
                  <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>Modo Vendedor (PDV)</span>
                  </div>
                  O vendedor tem acesso ao PDV para registrar vendas. As demais funções (produtos, estoque, caixa, relatórios e configurações) só aparecem após o administrador desbloquear o painel.
                </div>
              </div>
            </div>
          ) : (
            /* ADMIN MODE - ALL FUNCTIONS UNLOCKED AND VISIBLE */
            <div className="space-y-1">
              <div className="mb-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">Painel Admin Liberado</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    switchToVendorMode();
                    onNavigate('pdv');
                    showToast('Painel administrativo bloqueado. Modo PDV ativado.', 'info');
                  }}
                  className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 border border-slate-700 font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95"
                  title="Bloquear painel e voltar ao PDV"
                >
                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                  <span>Bloquear</span>
                </button>
              </div>

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
            </div>
          )}
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
            <div className="flex items-center gap-2 overflow-hidden">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="overflow-hidden">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-semibold text-white truncate">{user?.name || 'Operador'}</p>
                  {user?.authProvider === 'google' && (
                    <span className="text-[9px] px-1 rounded bg-blue-500/20 text-blue-400 font-bold shrink-0">G</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 capitalize truncate">
                  {user?.role === 'ADMINISTRADOR' ? 'Administrador' : 'Operador (PDV)'}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition shrink-0"
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
                <span>{isOnline ? '🟢 Online' : '🔴 Offline'}</span>
              </span>

              {/* Nuvem Firestore */}
              <span
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"
                title="Sincronização em Nuvem ativa no Firebase Firestore"
              >
                <span>☁️</span>
                <span>Nuvem Conectada</span>
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
            {/* ADMIN ACCESS BUTTON / DROPDOWN */}
            {isAdmin ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAdminMenuDropdownOpen(!adminMenuDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/40 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                  title="Administração Ativa"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ADMIN ATIVO</span>
                  <ChevronDown className="w-3 h-3 text-emerald-400 ml-0.5" />
                </button>
                {adminMenuDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl py-1.5 z-50 animate-in fade-in">
                    <div className="px-3.5 py-2 border-b border-slate-800 text-[11px] text-slate-400 font-medium">
                      Painel de Gestão Liberado
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminMenuDropdownOpen(false);
                        setIsAdminCredentialsModalOpen(true);
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition font-medium"
                    >
                      <KeyRound className="w-4 h-4 text-blue-400" />
                      <span>Alterar Usuário e Senha Admin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminMenuDropdownOpen(false);
                        onNavigate('configuracoes');
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition font-medium"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Configurações da Empresa</span>
                    </button>
                    <div className="my-1 border-t border-slate-800" />
                    <button
                      type="button"
                      onClick={() => {
                        setAdminMenuDropdownOpen(false);
                        switchToVendorMode();
                        onNavigate('pdv');
                        showToast('Modo Vendedor ativado. O painel administrativo foi bloqueado com sucesso.', 'info');
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-xs text-amber-400 hover:bg-amber-950/40 flex items-center gap-2 cursor-pointer transition font-medium"
                    >
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span>Bloquear Admin (Modo Vendedor)</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPendingAdminTargetPage('dashboard');
                  setIsAdminAuthModalOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/40 text-xs font-bold transition shadow-md shadow-blue-600/20 cursor-pointer active:scale-95"
                title="Entrar na Pasta de Administração com usuário e senha"
              >
                <Shield className="w-3.5 h-3.5 text-white" />
                <span>PASTA DE ADMINISTRAÇÃO</span>
                <Lock className="w-3 h-3 text-blue-200" />
              </button>
            )}

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

      {/* Admin Auth Modal */}
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => setIsAdminAuthModalOpen(false)}
        onSuccess={() => {
          if (pendingAdminTargetPage) {
            onNavigate(pendingAdminTargetPage);
            setPendingAdminTargetPage(null);
          }
        }}
      />

      {/* Admin Credentials Modal */}
      <AdminCredentialsModal
        isOpen={isAdminCredentialsModalOpen}
        onClose={() => setIsAdminCredentialsModalOpen(false)}
      />

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
