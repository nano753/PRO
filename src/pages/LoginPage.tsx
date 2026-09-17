import React, { useState } from 'react';
import {
  Lock,
  User as UserIcon,
  LogIn,
  AlertCircle,
  Building2,
  UserPlus,
  Phone,
  MapPin,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { CompanyLogoUploader } from '../components/common/CompanyLogoUploader';
import {
  formatCNPJ,
  formatPhone,
  validateCNPJ,
  isValidCNPJ,
} from '../utils/formatters';

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, registerCompanyAndAdmin } = useAuth();
  const { settings, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Login form state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');

  // Register form state
  const [companyName, setCompanyName] = useState('');
  const [document, setDocument] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      showToast('Bem-vindo de volta!', 'success');
    } catch (err) {
      setError((err as Error).message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      showToast('Autenticado com sucesso via Conta Google! Salvando dados na nuvem.', 'success');
    } catch (err: any) {
      console.error('Erro no login com Google:', err);
      if (err?.code === 'auth/popup-blocked') {
        setError('O navegador bloqueou a janela do Google. Por favor, permita pop-ups nesta página.');
        showToast('Janela pop-up bloqueada pelo navegador. Permita pop-ups.', 'warning');
      } else if (
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/popup-closed-by-user'
      ) {
        // Usuário cancelou ou fechou a janela
      } else {
        const msg = err?.message || 'Não foi possível autenticar com a conta Google.';
        setError(msg);
        showToast(msg, 'error');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!companyName.trim()) {
      setError('Por favor, informe o Nome da Empresa.');
      return;
    }

    if (!document.trim()) {
      setError('Por favor, informe o CNPJ da Empresa.');
      return;
    }

    const cnpjCheck = validateCNPJ(document);
    if (!cnpjCheck.isValid) {
      setError(`CNPJ inválido: ${cnpjCheck.message}. Verifique os dados fiscais da empresa.`);
      return;
    }

    if (!adminName.trim() || !adminUsername.trim()) {
      setError('Por favor, preencha o seu nome e o nome de usuário para login.');
      return;
    }

    if (adminPassword.length < 4) {
      setError('A senha deve ter no mínimo 4 caracteres.');
      return;
    }

    if (adminPassword !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      await registerCompanyAndAdmin({
        companyName: companyName.trim(),
        document: document.trim(),
        logo: companyLogo,
        phone: phone.trim(),
        address: address.trim(),
        adminName: adminName.trim(),
        adminUsername: adminUsername.trim(),
        adminPassword,
      });

      showToast('Conta e Empresa criadas com sucesso! Bem-vindo ao sistema.', 'success');
    } catch (err) {
      setError((err as Error).message || 'Erro ao registrar empresa e usuário.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setUsername('admin');
    setPassword('admin123');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-x-hidden">
      {/* Background visual accents */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div
        className={`w-full ${
          activeTab === 'register' ? 'max-w-2xl' : 'max-w-md'
        } rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl relative z-10 transition-all duration-300`}
      >
        {/* Header */}
        <div className="text-center mb-6">
          {settings.logo && activeTab === 'login' ? (
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-3 p-1 overflow-hidden shadow-lg shadow-black/40">
              <img
                src={settings.logo}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl mx-auto shadow-lg shadow-blue-500/20 mb-3">
              EP
            </div>
          )}

          <h1 className="text-2xl font-bold text-white tracking-tight">
            {activeTab === 'register'
              ? 'Criar Conta da Empresa'
              : settings.companyName || 'ESTOQUE PRO'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {activeTab === 'register'
              ? 'Cadastre sua empresa, CNPJ e logo para emissão de notas e controle de estoque'
              : 'PDV, Gestão de Estoque e Emissão de Recibos 100% Offline'}
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setError('');
            }}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'login'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Acessar Minha Conta</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setError('');
            }}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'register'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Criar Conta & Empresa</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {activeTab === 'login' && (
          <div>
            {/* CONTINUAR COM GOOGLE */}
            <div className="mb-5">
              <button
                type="button"
                disabled={isGoogleLoading || loading}
                onClick={handleGoogleSignIn}
                className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-800 font-bold text-sm flex items-center justify-center gap-3 shadow-md transition cursor-pointer border border-slate-200 disabled:opacity-75 disabled:cursor-wait"
              >
                {isGoogleLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-400 border-t-blue-600 rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>
                  {isGoogleLoading
                    ? 'Acessando Contas Google...'
                    : 'Entrar com a Conta Google'}
                </span>
              </button>

              <p className="text-[11px] text-center text-slate-400 mt-1.5 flex items-center justify-center gap-1">
                <span>☁️</span>
                <span>Abre suas contas Google vinculadas para salvar tudo na nuvem</span>
              </p>

              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <span className="relative px-3 bg-slate-900 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  ou acesse com usuário e senha
                </span>
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Usuário de Acesso
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Ex: admin"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Autenticando...' : 'Entrar no Sistema'}</span>
              </button>
            </form>

            {/* Credentials Reminder */}
            <div className="mt-6 pt-5 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-400">
                Usuário padrão: <strong className="text-slate-200">admin</strong> | Senha:{' '}
                <strong className="text-slate-200">admin123</strong>
              </p>
              <button
                type="button"
                onClick={handleQuickFill}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer"
              >
                Preencher dados do admin padrão
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTER ACCOUNT & COMPANY */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-6">
            {/* Step 1: Dados da Empresa */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-sm font-semibold text-white">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>1. Dados da Sua Empresa (para Recibos & Cupons)</span>
              </div>

              {/* Logo Upload Component */}
              <CompanyLogoUploader
                value={companyLogo}
                onChange={setCompanyLogo}
                label="Foto ou Logotipo da Empresa"
                sublabel="Será impresso no topo de todas as notas fiscais não-fiscais e recibos de venda."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome da Empresa / Razão Social *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Ex: Comercial Silva Ltda"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      CNPJ da Empresa *
                    </label>
                    {document && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isValidCNPJ(document)
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : document.replace(/\D/g, '').length === 14
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {isValidCNPJ(document) ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            CNPJ Válido
                          </>
                        ) : document.replace(/\D/g, '').length === 14 ? (
                          <>
                            <AlertCircle className="w-3 h-3" />
                            CNPJ Inválido
                          </>
                        ) : (
                          `${document.replace(/\D/g, '').length}/14 dígitos`
                        )}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={document}
                    onChange={e => setDocument(formatCNPJ(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    className={`w-full px-3 py-2 rounded-xl bg-slate-950 border text-sm font-mono text-white transition focus:outline-hidden ${
                      isValidCNPJ(document)
                        ? 'border-emerald-500/60 focus:border-emerald-500'
                        : document && document.replace(/\D/g, '').length === 14
                        ? 'border-rose-500/70 focus:border-rose-500'
                        : 'border-slate-700 focus:border-blue-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Telefone / WhatsApp Comercial
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(formatPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Endereço Completo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="Rua, Número, Bairro, Cidade - UF"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Live Receipt Preview */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-1.5 mb-2.5 text-[11px] font-semibold text-slate-400">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                <span>Como vai aparecer no seu cupom / nota:</span>
              </div>

              <div className="max-w-xs mx-auto bg-white text-slate-900 rounded-lg p-3 font-mono text-center shadow-md border border-slate-200">
                {companyLogo ? (
                  <div className="flex justify-center mb-1.5">
                    <img
                      src={companyLogo}
                      alt="Logo Preview"
                      className="max-h-12 max-w-[100px] object-contain mx-auto"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-400 text-[10px] mx-auto mb-1.5 font-sans font-bold">
                    LOGO
                  </div>
                )}
                <h4 className="font-bold text-[11px] uppercase tracking-wide">
                  {companyName || 'NOME DA SUA EMPRESA'}
                </h4>
                <p className="text-[9px] text-slate-700 font-semibold mt-0.5">
                  CNPJ: {document || '00.000.000/0000-00'}
                </p>
                {address && (
                  <p className="text-[8px] text-slate-500 leading-tight mt-0.5">{address}</p>
                )}
                {phone && <p className="text-[8px] text-slate-500">Tel: {phone}</p>}
                <div className="mt-1.5 pt-1 border-t border-dashed border-slate-300 text-[8px] text-slate-500 font-semibold">
                  COMPROVANTE DE VENDA / NOTA
                </div>
              </div>
            </div>

            {/* Step 2: Administrator User Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-sm font-semibold text-white">
                <UserIcon className="w-4 h-4 text-emerald-400" />
                <span>2. Dados de Acesso do Administrador</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Seu Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={e => setAdminName(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome de Usuário (Login) *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={e => setAdminUsername(e.target.value.toLowerCase())}
                    placeholder="Ex: carlos (letras minúsculas)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Senha de Acesso *
                  </label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirmar Senha *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500 transition"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>
                {loading ? 'Cadastrando Empresa...' : 'Cadastrar Minha Empresa & Entrar'}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
