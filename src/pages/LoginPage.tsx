import React, { useState } from 'react';
import {
  Lock,
  User as UserIcon,
  LogIn,
  AlertCircle,
  Building2,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { CompanyLogoUploader } from '../components/common/CompanyLogoUploader';
import {
  formatCNPJ,
  formatCPF,
  formatCNPJOrCPF,
  formatPhone,
  isValidCNPJOrCPF,
  validateDocument,
} from '../utils/formatters';

export const LoginPage: React.FC = () => {
  const { login, registerCompanyAndAdmin } = useAuth();
  const { settings, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [companyName, setCompanyName] = useState('');
  const [docType, setDocType] = useState<'CPF' | 'CNPJ'>('CPF');
  const [document, setDocument] = useState('');

  const docValidation = validateDocument(document, docType);
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!companyName.trim()) {
      setError('Por favor, informe o Nome da Empresa.');
      return;
    }

    if (!document.trim()) {
      setError(`Por favor, informe o seu ${docType}.`);
      return;
    }

    const docCheck = validateDocument(document, docType);
    if (!docCheck.isValid) {
      setError(`Documento inválido: ${docCheck.message}. Verifique os dados do ${docType}.`);
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

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Soft Ambient Background Elements */}
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div
        className={`w-full ${
          activeTab === 'register' ? 'max-w-2xl' : 'max-w-md'
        } rounded-2xl bg-slate-900/90 border border-slate-800/90 backdrop-blur-xl p-6 sm:p-9 shadow-2xl shadow-black/60 relative z-10 transition-all duration-300`}
      >
        {/* Top Branding */}
        <div className="text-center mb-7">
          {settings.logo && activeTab === 'login' ? (
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center mx-auto mb-3.5 p-1.5 overflow-hidden shadow-lg shadow-black/40">
              <img
                src={settings.logo}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-xl mx-auto shadow-lg shadow-blue-500/25 mb-3.5 ring-4 ring-blue-500/10">
              EP
            </div>
          )}

          <h1 className="text-2xl font-bold text-white tracking-tight">
            {activeTab === 'register'
              ? 'Criar Nova Conta'
              : settings.companyName || 'ESTOQUE PRO'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
            {activeTab === 'register'
              ? 'Cadastre os dados da sua empresa e do administrador'
              : 'Digite seu usuário e senha para acessar'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2.5 text-rose-300 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* VIEW 1: SIMPLE & ELEGANT LOGIN */}
        {activeTab === 'login' && (
          <div>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Usuário
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Digite seu usuário"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Senha
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition cursor-pointer"
                    tabIndex={-1}
                    title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Primary Entrar Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition duration-150 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>{loading ? 'Entrando...' : 'Entrar'}</span>
              </button>
            </form>

            {/* Criar Conta Link (Embaixo do botão de Entrar) */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
              <p className="text-xs sm:text-sm text-slate-400">
                Não tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setError('');
                  }}
                  className="text-blue-400 hover:text-blue-300 font-semibold hover:underline transition cursor-pointer"
                >
                  Criar conta
                </button>
              </p>
            </div>
          </div>
        )}

        {/* VIEW 2: REGISTER ACCOUNT & COMPANY */}
        {activeTab === 'register' && (
          <div>
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
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-300">
                        {docType === 'CPF' ? 'CPF do Responsável / MEI *' : 'CNPJ da Empresa *'}
                      </label>
                      {document ? (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            docValidation.isValid
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : docValidation.type === 'INVALIDO'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {docValidation.isValid ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              {docValidation.message}
                            </>
                          ) : docValidation.type === 'INVALIDO' ? (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              {docValidation.message}
                            </>
                          ) : (
                            docValidation.message
                          )}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">
                          {docType === 'CPF' ? '11 dígitos obrigatórios' : '14 dígitos obrigatórios'}
                        </span>
                      )}
                    </div>

                    {/* Selector de Tipo de Documento */}
                    <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-xl mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDocType('CPF');
                          setDocument(prev => formatCPF(prev));
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          docType === 'CPF'
                            ? 'bg-blue-600 text-white shadow-xs font-semibold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                      >
                        <span>CPF</span>
                        <span className="text-[10px] opacity-75">(Pessoa Física / MEI)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDocType('CNPJ');
                          setDocument(prev => formatCNPJ(prev));
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          docType === 'CNPJ'
                            ? 'bg-blue-600 text-white shadow-xs font-semibold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                      >
                        <span>CNPJ</span>
                        <span className="text-[10px] opacity-75">(Empresa / PJ)</span>
                      </button>
                    </div>

                    <input
                      type="text"
                      required
                      value={document}
                      onChange={e => {
                        const raw = e.target.value.replace(/\D/g, '');
                        if (raw.length > 11 && docType === 'CPF') {
                          setDocType('CNPJ');
                          setDocument(formatCNPJ(e.target.value));
                        } else if (docType === 'CPF') {
                          setDocument(formatCPF(e.target.value));
                        } else {
                          setDocument(formatCNPJ(e.target.value));
                        }
                      }}
                      placeholder={docType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
                      className={`w-full px-3 py-2 rounded-xl bg-slate-950 border text-sm font-mono text-white transition focus:outline-hidden ${
                        docValidation.isValid
                          ? 'border-emerald-500/60 focus:border-emerald-500'
                          : docValidation.type === 'INVALIDO'
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
                    {(document.replace(/\D/g, '').length <= 11 ? 'CPF: ' : 'CNPJ: ') +
                      (document || '000.000.000-00 / CNPJ')}
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
                    <div className="relative">
                      <input
                        type={showRegisterPassword ? 'text' : 'password'}
                        required
                        value={adminPassword}
                        onChange={e => setAdminPassword(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        className="w-full pr-10 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition cursor-pointer"
                        tabIndex={-1}
                      >
                        {showRegisterPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
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

              {/* Submit Registration */}
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

              {/* Voltar para Login */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setError('');
                  }}
                  className="text-xs sm:text-sm text-slate-400 hover:text-white font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Já possui uma conta? Fazer Login</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
