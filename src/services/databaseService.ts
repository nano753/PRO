import { dbManager, StoreName } from '../database/indexedDB';

export const databaseService = {
  async getAll<T>(store: StoreName): Promise<T[]> {
    return dbManager.getAll<T>(store);
  },

  async getById<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
    return dbManager.getById<T>(store, key);
  },

  async save<T>(store: StoreName, item: T): Promise<T> {
    return dbManager.put<T>(store, item);
  },

  async delete(store: StoreName, key: IDBValidKey): Promise<void> {
    return dbManager.deleteItem(store, key);
  },

  async count(store: StoreName): Promise<number> {
    return dbManager.count(store);
  },

  async clear(store: StoreName): Promise<void> {
    return dbManager.clearStore(store);
  },

  async seedDemoData(username: string): Promise<void> {
    return dbManager.seedDemoData(username);
  },

  async wipeAll(): Promise<void> {
    return dbManager.wipeAllData();
  },
};
