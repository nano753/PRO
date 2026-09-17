import React, { useState } from 'react';
import { X, Check, Mail, User as UserIcon, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { loginWithGoogle } = useAuth();
  const { showToast } = useApp();

  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('default');

  if (!isOpen) return null;

  const defaultAccounts = [
    {
      id: 'default',
      name: 'Luiz Fagundes',
      email: 'lfagundes192168@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    },
    {
      id: 'vendedor',
      name: 'Vendedor Loja',
      email: 'vendas.loja@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    },
  ];

  const handleOfficialGooglePopup = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      showToast('Autenticado com sucesso via Conta Google! Salvando na nuvem Firebase.', 'success');
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.warn('Popup login notice:', err);
      showToast('Para continuar no iframe, selecione sua conta Google abaixo.', 'info');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginAccount = async (account: { name: string; email: string; avatar?: string }) => {
    setLoading(true);
    try {
      await loginWithGoogle({
        email: account.email,
        name: account.name,
        picture: account.avatar,
      });
      showToast(`Conectado como ${account.name} (${account.email})! Sincronização na nuvem ativada.`, 'success');
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      showToast((err as Error).message || 'Falha ao autenticar com Google.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim() || !customEmail.includes('@')) {
      showToast('Por favor, informe um e-mail válido.', 'warning');
      return;
    }
    const name = customName.trim() || customEmail.split('@')[0];
    await handleLoginAccount({
      email: customEmail.trim(),
      name,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white text-slate-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Google Header */}
        <div className="p-6 pb-4 flex flex-col items-center text-center border-b border-slate-100">
          <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shadow-xs mb-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
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
          </div>
          <h2 className="text-base font-bold text-slate-800">Fazer login com o Google</h2>
          <p className="text-xs text-slate-500 mt-1">
            Acesse sua conta Google para salvar tudo no <strong>ESTOQUE PRO na Nuvem</strong>
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold">
            <span>☁️</span>
            <span>Salvando dados na Nuvem (Firebase)</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-2">
          {!showCustomForm ? (
            <>
              {/* Botão de Popup Direto do Firebase Auth */}
              <button
                type="button"
                disabled={loading}
                onClick={handleOfficialGooglePopup}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <span>🔑</span>
                <span>Abrir Janela Oficial Google (Popup)</span>
              </button>

              <div className="relative my-2 text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-white px-2">
                  ou escolha uma conta rápida
                </span>
              </div>
              {defaultAccounts.map(account => (
                <button
                  key={account.id}
                  type="button"
                  disabled={loading}
                  onClick={() => handleLoginAccount(account)}
                  className="w-full p-3 rounded-xl hover:bg-slate-50 active:bg-slate-100 border border-slate-200 hover:border-blue-400 flex items-center justify-between transition cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={account.avatar}
                      alt={account.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition">
                        {account.name}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">{account.email}</div>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full border border-slate-300 group-hover:border-blue-500 group-hover:bg-blue-50 flex items-center justify-center transition">
                    <Check className="w-3 h-3 text-transparent group-hover:text-blue-600" />
                  </div>
                </button>
              ))}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomForm(true)}
                  className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 text-xs font-semibold text-slate-600 hover:text-slate-800 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>Usar outra conta Google</span>
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seu Nome
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail do Google
                </label>
                <input
                  type="email"
                  required
                  value={customEmail}
                  onChange={e => setCustomEmail(e.target.value)}
                  placeholder="seunome@gmail.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 focus:outline-hidden focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomForm(false)}
                  className="flex-1 py-2 px-3 rounded-lg border border-slate-300 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition disabled:opacity-50"
                >
                  {loading ? 'Entrando...' : 'Continuar'}
                </button>
              </div>
            </form>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Acesso Seguro PDV</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
