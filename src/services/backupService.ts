import { databaseService } from './databaseService';
import {
  Category,
  CompanySettings,
  FullBackupData,
  Movement,
  Product,
  Sale,
  CashMovement,
  CashRegister,
  User,
} from '../types';

export const backupService = {
  async generateBackup(): Promise<FullBackupData> {
    const products = await databaseService.getAll<Product>('products');
    const categories = await databaseService.getAll<Category>('categories');
    const movements = await databaseService.getAll<Movement>('movements');
    const sales = await databaseService.getAll<Sale>('sales');
    const cashRegisters = await databaseService.getAll<CashRegister>('cashRegisters');
    const cashMovements = await databaseService.getAll<CashMovement>('cashMovements');
    const users = await databaseService.getAll<User>('users');
    const settings = (await databaseService.getById<CompanySettings>('settings', 'main'))!;

    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      appName: 'ESTOQUE PRO',
      data: {
        products,
        categories,
        movements,
        sales,
        cashRegisters,
        cashMovements,
        users,
        settings,
      },
    };
  },

  async downloadBackupFile(): Promise<void> {
    const backup = await this.generateBackup();
    const jsonString = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `estoque-pro-backup-${dateStr}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async exportFullBackup(): Promise<void> {
    return this.downloadBackupFile();
  },

  async restoreFromFile(file: File): Promise<void> {
    const text = await file.text();
    let parsed: FullBackupData;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Arquivo de backup inválido ou corrompido (JSON inválido).');
    }

    if (!parsed.data || !Array.isArray(parsed.data.products) || !Array.isArray(parsed.data.sales)) {
      throw new Error('Formato de arquivo incompatível com o ESTOQUE PRO.');
    }

    // Clear existing data
    await databaseService.wipeAll();

    // Restore categories
    if (parsed.data.categories) {
      for (const cat of parsed.data.categories) {
        await databaseService.save('categories', cat);
      }
    }

    // Restore products
    if (parsed.data.products) {
      for (const prod of parsed.data.products) {
        await databaseService.save('products', prod);
      }
    }

    // Restore movements
    if (parsed.data.movements) {
      for (const mov of parsed.data.movements) {
        await databaseService.save('movements', mov);
      }
    }

    // Restore sales
    if (parsed.data.sales) {
      for (const sale of parsed.data.sales) {
        await databaseService.save('sales', sale);
      }
    }

    // Restore cashRegisters
    if (parsed.data.cashRegisters) {
      for (const cash of parsed.data.cashRegisters) {
        await databaseService.save('cashRegisters', cash);
      }
    }

    // Restore cashMovements
    if (parsed.data.cashMovements) {
      for (const cmov of parsed.data.cashMovements) {
        await databaseService.save('cashMovements', cmov);
      }
    }

    // Restore users
    if (parsed.data.users && parsed.data.users.length > 0) {
      for (const user of parsed.data.users) {
        await databaseService.save('users', user);
      }
    }

    // Restore settings
    if (parsed.data.settings) {
      await databaseService.save('settings', parsed.data.settings);
    }
  },

  async importBackup(file: File): Promise<{ success: boolean; message: string }> {
    try {
      await this.restoreFromFile(file);
      return { success: true, message: 'Backup restaurado com sucesso!' };
    } catch (e) {
      return { success: false, message: (e as Error).message || 'Erro ao restaurar backup.' };
    }
  },

  exportCSV(filename: string, rows: (string | number)[][]): void {
    const processRow = (row: (string | number)[]) =>
      row
        .map(val => {
          const str = String(val ?? '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(';');

    const csvContent = '\uFEFF' + rows.map(processRow).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
