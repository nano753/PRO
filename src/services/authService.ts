import { databaseService } from './databaseService';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { CompanySettings, Permission, User, UserRole } from '../types';
import { DEFAULT_SETTINGS } from '../database/initialData';
import { isValidCNPJ } from '../utils/formatters';

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
      return null;
    }
    const user = await databaseService.getById<User>('users', userId);
    return user || null;
  },

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  async registerCompanyAndAdmin(data: {
    companyName: string;
    document: string;
    logo?: string;
    phone?: string;
    address?: string;
    adminName: string;
    adminUsername: string;
    adminPassword: string;
  }): Promise<{ user: User; settings: CompanySettings }> {
    const cleanCompanyName = data.companyName.trim();
    const cleanDocument = data.document.trim();
    const cleanAdminName = data.adminName.trim();
    const cleanAdminUsername = data.adminUsername.trim().toLowerCase();

    if (!cleanCompanyName) {
      throw new Error('O nome da empresa é obrigatório.');
    }
    if (!cleanDocument) {
      throw new Error('O CNPJ da empresa é obrigatório.');
    }
    if (!isValidCNPJ(cleanDocument)) {
      throw new Error('O CNPJ informado é inválido perante os dígitos verificadores da Receita Federal.');
    }
    if (!cleanAdminName || !cleanAdminUsername) {
      throw new Error('Nome e usuário do administrador são obrigatórios.');
    }
    if (data.adminPassword.length < 4) {
      throw new Error('A senha deve ter pelo menos 4 caracteres.');
    }

    // 1. Create or update the administrator user
    const users = await databaseService.getAll<User>('users');
    let adminUser = users.find(u => u.username.toLowerCase() === cleanAdminUsername);
    const passwordHash = await hashPassword(data.adminPassword);

    if (adminUser) {
      adminUser = {
        ...adminUser,
        name: cleanAdminName,
        passwordHash,
        role: 'ADMINISTRADOR',
        permissions: ALL_PERMISSIONS,
        status: 'ativo',
      };
      await databaseService.save<User>('users', adminUser);
    } else {
      adminUser = {
        id: `usr-${Date.now()}`,
        name: cleanAdminName,
        username: cleanAdminUsername,
        passwordHash,
        role: 'ADMINISTRADOR',
        permissions: ALL_PERMISSIONS,
        status: 'ativo',
        createdAt: new Date().toISOString(),
      };
      await databaseService.save<User>('users', adminUser);
    }

    // 2. Save company settings with name, CNPJ and logo
    const existingSettings =
      (await databaseService.getById<CompanySettings>('settings', 'main')) || DEFAULT_SETTINGS;

    const newSettings: CompanySettings = {
      ...existingSettings,
      id: 'main',
      companyName: cleanCompanyName,
      name: cleanCompanyName,
      document: cleanDocument,
      logo: data.logo || existingSettings.logo || '',
      phone: data.phone?.trim() || existingSettings.phone || '',
      address: data.address?.trim() || existingSettings.address || '',
    };

    await databaseService.save<CompanySettings>('settings', newSettings);

    // 3. Establish active session
    localStorage.setItem(SESSION_KEY, adminUser.id);

    return { user: adminUser, settings: newSettings };
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
