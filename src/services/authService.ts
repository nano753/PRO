import { databaseService } from './databaseService';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { Permission, User, UserRole } from '../types';

const SESSION_KEY = 'estoque_pro_current_user_id';

export const ALL_PERMISSIONS: Permission[] = [
  'ver_produtos',
  'criar_produtos',
  'editar_produtos',
  'excluir_produtos',
  'registrar_entrada',
  'registrar_saida',
  'vender',
  'aplicar_desconto',
  'cancelar_venda',
  'abrir_caixa',
  'fechar_caixa',
  'fazer_sangria',
  'fazer_suprimento',
  'ver_relatorios',
  'fazer_backup',
  'restaurar_backup',
  'gerenciar_usuarios',
  'configuracoes',
];

export const OPERATOR_DEFAULT_PERMISSIONS: Permission[] = [
  'ver_produtos',
  'vender',
  'aplicar_desconto',
  'abrir_caixa',
  'fechar_caixa',
  'fazer_suprimento',
  'fazer_sangria',
  'registrar_entrada',
  'registrar_saida',
];

export const authService = {
  async login(username: string, plainTextPassword: string): Promise<User> {
    const cleanUsername = username.trim().toLowerCase();
    const users = await databaseService.getAll<User>('users');
    const user = users.find(u => u.username.toLowerCase() === cleanUsername);

    if (!user) {
      throw new Error('Usuário ou senha incorretos.');
    }

    if (user.status !== 'ativo') {
      throw new Error('Este usuário está desativado no sistema.');
    }

    const isValid = await verifyPassword(plainTextPassword, user.passwordHash);
    if (!isValid) {
      throw new Error('Usuário ou senha incorretos.');
    }

    localStorage.setItem(SESSION_KEY, user.id);
    return user;
  },

  async getCurrentUser(): Promise<User | null> {
    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId) {
      // Check if admin exists to auto-select if fresh
      const users = await databaseService.getAll<User>('users');
      return users[0] || null;
    }
    const user = await databaseService.getById<User>('users', userId);
    return user || null;
  },

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  async getUsers(): Promise<User[]> {
    const users = await databaseService.getAll<User>('users');
    return users.sort((a, b) => a.name.localeCompare(b.name));
  },

  async createUser(data: {
    name: string;
    username: string;
    plainTextPassword: string;
    role: UserRole;
    permissions?: Permission[];
  }): Promise<User> {
    const cleanUsername = data.username.trim().toLowerCase();
    const cleanName = data.name.trim();

    if (!cleanUsername || !cleanName) {
      throw new Error('Nome e nome de usuário são obrigatórios.');
    }

    if (data.plainTextPassword.length < 4) {
      throw new Error('A senha deve ter pelo menos 4 caracteres.');
    }

    const users = await databaseService.getAll<User>('users');
    if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
      throw new Error(`O nome de usuário "${data.username}" já está em uso.`);
    }

    const passwordHash = await hashPassword(data.plainTextPassword);
    const permissions =
      data.permissions ||
      (data.role === 'ADMINISTRADOR' ? ALL_PERMISSIONS : OPERATOR_DEFAULT_PERMISSIONS);

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: cleanName,
      username: cleanUsername,
      passwordHash,
      role: data.role,
      permissions,
      status: 'ativo',
      createdAt: new Date().toISOString(),
    };

    await databaseService.save<User>('users', newUser);
    return newUser;
  },

  async updateUser(
    id: string,
    data: {
      name?: string;
      role?: UserRole;
      permissions?: Permission[];
      status?: 'ativo' | 'inativo';
      newPassword?: string;
    }
  ): Promise<User> {
    const user = await databaseService.getById<User>('users', id);
    if (!user) throw new Error('Usuário não encontrado.');

    let passwordHash = user.passwordHash;
    if (data.newPassword && data.newPassword.trim()) {
      if (data.newPassword.length < 4) {
        throw new Error('A nova senha deve ter pelo menos 4 caracteres.');
      }
      passwordHash = await hashPassword(data.newPassword);
    }

    const updatedUser: User = {
      ...user,
      name: data.name !== undefined ? data.name.trim() : user.name,
      role: data.role !== undefined ? data.role : user.role,
      permissions: data.permissions !== undefined ? data.permissions : user.permissions,
      status: data.status !== undefined ? data.status : user.status,
      passwordHash,
    };

    await databaseService.save<User>('users', updatedUser);
    return updatedUser;
  },

  hasPermission(user: User | null, permission: Permission): boolean {
    if (!user) return false;
    if (user.role === 'ADMINISTRADOR') return true;
    return user.permissions.includes(permission);
  },
};
