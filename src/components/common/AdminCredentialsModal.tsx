import React, { useState } from 'react';
import { KeyRound, Shield, X, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';

interface AdminCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminCredentialsModal: React.FC<AdminCredentialsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, updateAdminCredentials } = useAuth();
  const { showToast } = useApp();

  const [newUsername, setNewUsername] = useState(user?.username || 'admin');
  const [newName, setNewName] = useState(user?.name || 'Administrador');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newUsername.trim()) {
      setError('O nome de usuário administrativo não pode ficar vazio.');
      return;
    }

    if (newPassword && newPassword.length < 4) {
      setError('A nova senha deve possuir pelo menos 4 caracteres.');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError('As senhas digitadas não coincidem. Digite a mesma senha nos dois campos.');
      return;
    }

    setLoading(true);

    try {
      await updateAdminCredentials({
        newUsername: newUsername.trim(),
        newPassword: newPassword.trim() ? newPassword.trim() : undefined,
        newName: newName.trim(),
      });

      showToast(
        'Credenciais do Administrador atualizadas com sucesso! O novo usuário e senha já estão salvos e ativos.',
        'success'
      );
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Erro ao atualizar credenciais do administrador.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Alterar Credenciais do Administrador
              </h2>
              <p className="text-xs text-slate-400">Personalize o usuário e senha da sua loja</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs text-blue-300 flex items-start gap-2.5">
            <Shield className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
            <span>
              Ao alterar seu usuário ou senha, o sistema passará a exigir estas novas credenciais
              imediatamente ao entrar na área de <strong>Administração</strong>.
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nome de Exibição do Administrador
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Ex: Gerência / Diretoria"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Novo Usuário Administrativo
            </label>
            <input
              type="text"
              required
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              placeholder="Ex: gerente, admin, diretor"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500 transition font-mono"
            />
            <span className="block mt-1 text-[11px] text-slate-500">
              Este será o nome de usuário digitado no login e na janela de Administração.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nova Senha Administrativa (deixe em branco se não quiser alterar a senha)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {newPassword && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Confirmar Nova Senha
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500 transition"
              />
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{loading ? 'Salvando...' : 'Salvar Novas Credenciais'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
