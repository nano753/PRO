import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  Edit2,
  CheckCircle2,
  XCircle,
  Lock,
  X,
} from 'lucide-react';
import { authService, ALL_PERMISSIONS, OPERATOR_DEFAULT_PERMISSIONS } from '../services/authService';
import { Permission, User, UserRole } from '../types';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

const PERMISSION_LABELS: Record<Permission, string> = {
  ver_produtos: 'Visualizar catálogo de produtos',
  criar_produtos: 'Cadastrar novos produtos',
  editar_produtos: 'Editar produtos existentes',
  excluir_produtos: 'Excluir produtos do catálogo',
  registrar_entrada: 'Registrar entrada de mercadorias',
  registrar_saida: 'Registrar saída/baixa de avarias',
  vender: 'Operar PDV e registrar vendas',
  aplicar_desconto: 'Conceder descontos no PDV',
  cancelar_venda: 'Cancelar e estornar vendas',
  abrir_caixa: 'Abrir turno de caixa',
  fechar_caixa: 'Encerrar turno de caixa',
  fazer_sangria: 'Realizar sangrias de dinheiro',
  fazer_suprimento: 'Realizar suprimentos de troco',
  ver_relatorios: 'Acessar relatórios e faturamento',
  fazer_backup: 'Gerar backup do banco de dados',
  restaurar_backup: 'Restaurar backup do sistema',
  gerenciar_usuarios: 'Criar e gerenciar usuários',
  configuracoes: 'Alterar configurações da empresa',
};

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useApp();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('OPERADOR');
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>(OPERATOR_DEFAULT_PERMISSIONS);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await authService.getUsers();
      setUsers(data);
    } catch (e) {
      console.error('Error loading users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openNewUserModal = () => {
    setEditingUser(null);
    setName('');
    setUsername('');
    setPassword('');
    setRole('OPERADOR');
    setStatus('ativo');
    setSelectedPermissions(OPERATOR_DEFAULT_PERMISSIONS);
    setIsModalOpen(true);
  };

  const openEditUserModal = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setUsername(user.username);
    setPassword('');
    setRole(user.role);
    setStatus(user.status);
    setSelectedPermissions(user.permissions);
    setIsModalOpen(true);
  };

  const handleTogglePermission = (perm: Permission) => {
    if (selectedPermissions.includes(perm)) {
      setSelectedPermissions(prev => prev.filter(p => p !== perm));
    } else {
      setSelectedPermissions(prev => [...prev, perm]);
    }
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'ADMINISTRADOR') {
      setSelectedPermissions(ALL_PERMISSIONS);
    } else {
      setSelectedPermissions(OPERATOR_DEFAULT_PERMISSIONS);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUser) {
        await authService.updateUser(editingUser.id, {
          name,
          role,
          status,
          permissions: role === 'ADMINISTRADOR' ? ALL_PERMISSIONS : selectedPermissions,
          newPassword: password.trim() ? password : undefined,
        });
        showToast('Usuário atualizado com sucesso!', 'success');
      } else {
        if (!password) {
          showToast('A senha é obrigatória para novos usuários.', 'error');
          return;
        }
        await authService.createUser({
          name,
          username,
          plainTextPassword: password,
          role,
          permissions: role === 'ADMINISTRADOR' ? ALL_PERMISSIONS : selectedPermissions,
        });
        showToast('Usuário criado com sucesso!', 'success');
      }

      setIsModalOpen(false);
      await loadUsers();
    } catch (err) {
      showToast((err as Error).message || 'Erro ao salvar usuário.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            <span>Gestão de Usuários & Permissões</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Controle quem acessa o sistema e configure os níveis de privilégio para cada operador.
          </p>
        </div>

        <button
          onClick={openNewUserModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs md:text-sm font-semibold shadow-md shadow-blue-600/20 transition self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Adicionar Novo Usuário</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Nome / Usuário</th>
                <th className="px-4 py-3.5">Perfil</th>
                <th className="px-4 py-3.5">Permissões</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5">Criado em</th>
                <th className="px-4 py-3.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>{user.name}</span>
                      {user.id === currentUser?.id && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-bold">
                          Você
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">@{user.username}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        user.role === 'ADMINISTRADOR'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      <Shield className="w-3 h-3" />
                      <span>{user.role}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {user.role === 'ADMINISTRADOR' ? (
                      <span className="text-emerald-400 font-medium">Acesso total irrestrito</span>
                    ) : (
                      <span>{user.permissions.length} permissões concedidas</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        user.status === 'ativo'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {user.status === 'ativo' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      <span>{user.status.toUpperCase()}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono">
                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEditUserModal(user)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                      title="Editar Usuário"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span>{editingUser ? 'Editar Usuário' : 'Novo Usuário do Sistema'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome de Usuário (Login) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Ex: carlos.silva"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:outline-hidden focus:border-blue-500 disabled:opacity-50"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha de Acesso *'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Perfil de Acesso
                  </label>
                  <select
                    value={role}
                    onChange={e => handleRoleChange(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="OPERADOR">OPERADOR (Acesso Restrito)</option>
                    <option value="ADMINISTRADOR">ADMINISTRADOR (Acesso Total)</option>
                  </select>
                </div>

                {/* Status */}
                {editingUser && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as 'ativo' | 'inativo')}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="ativo">Ativo (Pode acessar)</option>
                      <option value="inativo">Inativo (Bloqueado)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Granular Permissions Checkboxes (if Operador) */}
              {role === 'OPERADOR' && (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-white">
                    Permissões Específicas do Operador
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-950/60 rounded-xl border border-slate-800/80">
                    {ALL_PERMISSIONS.map(perm => {
                      const isChecked = selectedPermissions.includes(perm);
                      return (
                        <label
                          key={perm}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-900 cursor-pointer text-xs text-slate-300"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTogglePermission(perm)}
                            className="rounded text-blue-600 focus:ring-0"
                          />
                          <span>{PERMISSION_LABELS[perm] || perm}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition"
                >
                  {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
