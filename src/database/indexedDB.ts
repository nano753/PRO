import { DEFAULT_SETTINGS, DEFAULT_USER, DEMO_CATEGORIES, DEMO_PRODUCTS } from './initialData';
import {
  Category,
  CompanySettings,
  Movement,
  Product,
  Sale,
  CashRegister,
  CashMovement,
  User,
} from '../types';

const DB_NAME = 'EstoqueProDB';
const DB_VERSION = 1;

export type StoreName =
  | 'products'
  | 'categories'
  | 'movements'
  | 'sales'
  | 'cashRegisters'
  | 'cashMovements'
  | 'users'
  | 'settings';

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  public async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Products store
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'id' });
          productStore.createIndex('sku', 'sku', { unique: true });
          productStore.createIndex('barcode', 'barcode', { unique: false });
          productStore.createIndex('categoryId', 'categoryId', { unique: false });
          productStore.createIndex('name', 'name', { unique: false });
          productStore.createIndex('status', 'status', { unique: false });
        }

        // Categories store
        if (!db.objectStoreNames.contains('categories')) {
          const categoryStore = db.createObjectStore('categories', { keyPath: 'id' });
          categoryStore.createIndex('name', 'name', { unique: false });
        }

        // Movements store
        if (!db.objectStoreNames.contains('movements')) {
          const movementStore = db.createObjectStore('movements', { keyPath: 'id' });
          movementStore.createIndex('productId', 'productId', { unique: false });
          movementStore.createIndex('type', 'type', { unique: false });
          movementStore.createIndex('date', 'date', { unique: false });
          movementStore.createIndex('saleId', 'saleId', { unique: false });
        }

        // Sales store
        if (!db.objectStoreNames.contains('sales')) {
          const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
          salesStore.createIndex('saleNumber', 'saleNumber', { unique: true });
          salesStore.createIndex('date', 'date', { unique: false });
          salesStore.createIndex('user', 'user', { unique: false });
          salesStore.createIndex('status', 'status', { unique: false });
        }

        // CashRegisters store
        if (!db.objectStoreNames.contains('cashRegisters')) {
          const cashStore = db.createObjectStore('cashRegisters', { keyPath: 'id' });
          cashStore.createIndex('status', 'status', { unique: false });
          cashStore.createIndex('openDate', 'openDate', { unique: false });
        }

        // CashMovements store
        if (!db.objectStoreNames.contains('cashMovements')) {
          const cashMovStore = db.createObjectStore('cashMovements', { keyPath: 'id' });
          cashMovStore.createIndex('cashRegisterId', 'cashRegisterId', { unique: false });
          cashMovStore.createIndex('type', 'type', { unique: false });
          cashMovStore.createIndex('date', 'date', { unique: false });
        }

        // Users store
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('username', 'username', { unique: true });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      };

      request.onsuccess = async (event: Event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        await this.bootstrapDefaults();
        resolve(this.db);
      };

      request.onerror = (event: Event) => {
        const error = (event.target as IDBOpenDBRequest).error;
        console.error('IndexedDB open error:', error);
        reject(error);
      };
    });

    return this.initPromise;
  }

  private async bootstrapDefaults(): Promise<void> {
    try {
      // Check user
      const users = await this.getAll<User>('users');
      if (users.length === 0) {
        await this.put<User>('users', DEFAULT_USER);
      }

      // Check settings
      const settings = await this.getById<CompanySettings>('settings', 'main');
      if (!settings) {
        await this.put<CompanySettings>('settings', DEFAULT_SETTINGS);
      }
    } catch (e) {
      console.warn('Error during default bootstrapping:', e);
    }
  }

  public async getAll<T>(storeName: StoreName): Promise<T[]> {
    const db = await this.getDB();
    return new Promise<T[]>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  public async getById<T>(storeName: StoreName, key: IDBValidKey): Promise<T | undefined> {
    const db = await this.getDB();
    return new Promise<T | undefined>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async add<T>(storeName: StoreName, value: T): Promise<T> {
    const db = await this.getDB();
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(value);

      request.onsuccess = () => resolve(value);
      request.onerror = () => reject(request.error);
    });
  }

  public async put<T>(storeName: StoreName, value: T): Promise<T> {
    const db = await this.getDB();
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => resolve(value);
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteItem(storeName: StoreName, key: IDBValidKey): Promise<void> {
    const db = await this.getDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async clearStore(storeName: StoreName): Promise<void> {
    const db = await this.getDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async count(storeName: StoreName): Promise<number> {
    const db = await this.getDB();
    return new Promise<number>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Seed demo data when user chooses to start with examples
   */
  public async seedDemoData(operatorUsername: string = 'admin'): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(
      ['categories', 'products', 'movements', 'cashRegisters', 'cashMovements'],
      'readwrite'
    );

    const catStore = tx.objectStore('categories');
    const prodStore = tx.objectStore('products');
    const movStore = tx.objectStore('movements');
    const cashStore = tx.objectStore('cashRegisters');
    const cashMovStore = tx.objectStore('cashMovements');

    for (const cat of DEMO_CATEGORIES) {
      catStore.put(cat);
    }

    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().split(' ')[0];

    for (const prod of DEMO_PRODUCTS) {
      prodStore.put(prod);
      // Initial stock movement
      if (prod.currentStock > 0) {
        const mov: Movement = {
          id: `mov-init-${prod.id}`,
          productId: prod.id,
          productName: prod.name,
          productSku: prod.sku,
          type: 'ENTRADA',
          quantity: prod.currentStock,
          unitCostOrPrice: prod.costPrice,
          totalValue: prod.currentStock * prod.costPrice,
          reason: 'Estoque Inicial',
          user: operatorUsername,
          date: today,
          time: nowTime,
          observation: 'Carga inicial de dados de demonstração',
        };
        movStore.put(mov);
      }
    }

    // Also create an open cash register with R$ 200,00 so PDV is immediately ready to sell!
    const existingCash = await this.getAll<CashRegister>('cashRegisters');
    const hasOpenCash = existingCash.some(c => c.status === 'aberto');
    if (!hasOpenCash) {
      const cashId = `cash-${Date.now()}`;
      const sampleCash: CashRegister = {
        id: cashId,
        openDate: today,
        openTime: nowTime,
        user: operatorUsername,
        openAmount: 200.0,
        cashSales: 0,
        creditSales: 0,
        debitSales: 0,
        pixSales: 0,
        supplies: 0,
        bleedings: 0,
        expectedCash: 200.0,
        status: 'aberto',
        notes: 'Caixa de demonstração aberto com fundo de troco R$ 200,00',
      };
      cashStore.put(sampleCash);

      const openMov: CashMovement = {
        id: `cmov-${Date.now()}`,
        cashRegisterId: cashId,
        type: 'abertura',
        amount: 200.0,
        reason: 'Abertura de Caixa (Fundo de troco)',
        observation: 'Valor inicial de abertura',
        user: operatorUsername,
        date: today,
        time: nowTime,
      };
      cashMovStore.put(openMov);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Reset all data (Danger zone)
   */
  public async wipeAllData(): Promise<void> {
    const stores: StoreName[] = [
      'products',
      'categories',
      'movements',
      'sales',
      'cashRegisters',
      'cashMovements',
      'users',
      'settings',
    ];

    for (const store of stores) {
      await this.clearStore(store);
    }
    await this.bootstrapDefaults();
  }
}

export const dbManager = new IndexedDBManager();
