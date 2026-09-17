import { databaseService } from './databaseService';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { CompanySettings, Permission, User, UserRole } from '../types';
import { DEFAULT_SETTINGS } from '../database/initialData';
import { isValidCNPJ } from '../utils/formatters';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut } from 'firebase/auth';

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
];

export const VENDOR_DEFAULT_PERMISSIONS: Permission[] = OPERATOR_DEFAULT_PERMISSIONS;

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

  async logout(): Promise<void> {
    localStorage.removeItem(SESSION_KEY);
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
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

  async loginWithGoogle(data?: { email?: string; name?: string; picture?: string }): Promise<User> {
    let email = data?.email?.trim().toLowerCase() || '';
    let name = data?.name?.trim();
    let picture = data?.picture;
    let uid = '';

    if (!email) {
      // Trigger real Firebase Google Popup Login
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;
      email = (googleUser.email || '').trim().toLowerCase();
      name = googleUser.displayName || email.split('@')[0] || 'Usuário Google';
      picture = googleUser.photoURL || undefined;
      uid = googleUser.uid;
    }

    if (!email) {
      throw new Error('Não foi possível obter o e-mail da conta Google.');
    }

    const users = await databaseService.getAll<User>('users');
    let user = users.find(
      u =>
        u.username.toLowerCase() === email ||
        u.email?.toLowerCase() === email ||
        (uid && u.id === uid)
    );

    // E-mail do administrador cadastrado no projeto
    const isSuperAdmin =
      email === 'lfagundes192168@gmail.com' || email.includes('admin');

    if (user) {
      if (user.status !== 'ativo') {
        throw new Error('Este usuário está desativado no sistema.');
      }
      user = {
        ...user,
        name: name || user.name,
        avatar: picture || user.avatar,
        email,
        authProvider: 'google',
        role: isSuperAdmin ? 'ADMINISTRADOR' : user.role,
        permissions: isSuperAdmin ? ALL_PERMISSIONS : user.permissions,
      };
      await databaseService.save<User>('users', user);
    } else {
      user = {
        id: uid || `usr-google-${Date.now()}`,
        name: name || email.split('@')[0],
        username: email,
        email,
        avatar: picture,
        authProvider: 'google',
        passwordHash: '',
        role: isSuperAdmin ? 'ADMINISTRADOR' : 'OPERADOR', // Vendedor
        permissions: isSuperAdmin ? ALL_PERMISSIONS : VENDOR_DEFAULT_PERMISSIONS,
        status: 'ativo',
        createdAt: new Date().toISOString(),
      };
      await databaseService.save<User>('users', user);
    }

    localStorage.setItem(SESSION_KEY, user.id);
    return user;
  },

  async authenticateAdmin(username: string, plainTextPassword: string): Promise<User> {
    const cleanUsername = username.trim().toLowerCase();
    const users = await databaseService.getAll<User>('users');
    const adminUsers = users.filter(u => u.role === 'ADMINISTRADOR' && u.status === 'ativo');

    let matchedAdmin = adminUsers.find(u => u.username.toLowerCase() === cleanUsername);

    if (!matchedAdmin && adminUsers.length === 1 && cleanUsername === adminUsers[0].username.toLowerCase()) {
      matchedAdmin = adminUsers[0];
    }

    if (!matchedAdmin) {
      throw new Error('Credenciais de administrador incorretas.');
    }

    const isValid = await verifyPassword(plainTextPassword, matchedAdmin.passwordHash);
    if (!isValid) {
      throw new Error('Senha administrativa incorreta.');
    }

    localStorage.setItem(SESSION_KEY, matchedAdmin.id);
    return matchedAdmin;
  },

  async updateAdminCredentials(data: {
    adminId?: string;
    newUsername: string;
    newPassword?: string;
    newName?: string;
  }): Promise<User> {
    const cleanUsername = data.newUsername.trim().toLowerCase();
    if (!cleanUsername) {
      throw new Error('O nome de usuário administrativo é obrigatório.');
    }

    const users = await databaseService.getAll<User>('users');
    let adminUser = data.adminId ? users.find(u => u.id === data.adminId) : null;
    if (!adminUser) {
      adminUser = users.find(u => u.role === 'ADMINISTRADOR');
    }
    if (!adminUser) {
      throw new Error('Usuário administrador não encontrado no sistema.');
    }

    const usernameConflict = users.find(
      u => u.id !== adminUser!.id && u.username.toLowerCase() === cleanUsername
    );
    if (usernameConflict) {
      throw new Error(`O usuário "${data.newUsername}" já está em uso.`);
    }

    let passwordHash = adminUser.passwordHash;
    if (data.newPassword && data.newPassword.trim()) {
      if (data.newPassword.length < 4) {
        throw new Error('A nova senha deve ter pelo menos 4 caracteres.');
      }
      passwordHash = await hashPassword(data.newPassword);
    }

    const updatedAdmin: User = {
      ...adminUser,
      name: data.newName ? data.newName.trim() : adminUser.name,
      username: cleanUsername,
      passwordHash,
    };

    await databaseService.save<User>('users', updatedAdmin);

    // Keep active session updated
    const currentUserId = localStorage.getItem(SESSION_KEY);
    if (currentUserId === adminUser.id) {
      localStorage.setItem(SESSION_KEY, updatedAdmin.id);
    }

    return updatedAdmin;
  },

  async requireAdmin(actionDescription: string = 'esta ação'): Promise<User> {
    const user = await this.getCurrentUser();
    if (!user || user.role !== 'ADMINISTRADOR') {
      throw new Error(`Acesso negado: apenas o Administrador possui permissão para ${actionDescription}.`);
    }
    return user;
  },

  async requirePermission(permission: Permission, actionDescription: string = 'esta ação'): Promise<User> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('Acesso negado: nenhum usuário autenticado.');
    }
    if (user.role === 'ADMINISTRADOR') {
      return user;
    }
    if (!user.permissions.includes(permission)) {
      throw new Error(`Acesso negado: você não possui permissão para ${actionDescription}.`);
    }
    return user;
  },

  async updateUser(
    id: string,
    data: {
      name?: string;
      username?: string;
      role?: UserRole;
      permissions?: Permission[];
      status?: 'ativo' | 'inativo';
      newPassword?: string;
    }
  ): Promise<User> {
    const user = await databaseService.getById<User>('users', id);
    if (!user) throw new Error('Usuário não encontrado.');

    let cleanUsername = user.username;
    if (data.username && data.username.trim()) {
      cleanUsername = data.username.trim().toLowerCase();
      const users = await databaseService.getAll<User>('users');
      const conflict = users.find(u => u.id !== id && u.username.toLowerCase() === cleanUsername);
      if (conflict) {
        throw new Error(`O nome de usuário "${data.username}" já está em uso.`);
      }
    }

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
      username: cleanUsername,
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
