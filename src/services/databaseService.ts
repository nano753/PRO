import { dbManager, StoreName } from '../database/indexedDB';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';

function cleanFirestoreData<T>(obj: T): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanFirestoreData(item));
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned;
  }
  return obj;
}

export const databaseService = {
  async getAll<T>(store: StoreName): Promise<T[]> {
    try {
      const colRef = collection(db, store);
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        const cloudItems = snapshot.docs.map(d => d.data() as T);
        // Synchronize local cache
        for (const item of cloudItems) {
          dbManager.put<T>(store, item).catch(() => {});
        }
        return cloudItems;
      }
    } catch (error) {
      console.warn(`[Firestore Cloud Sync] Using local storage for ${store}:`, error);
    }

    // Fallback to local IndexedDB
    const localItems = await dbManager.getAll<T>(store);

    // If local items exist and cloud had 0 items, bootstrap cloud in the background
    if (localItems.length > 0) {
      (async () => {
        try {
          for (const item of localItems) {
            const docId = String((item as any).id);
            if (docId) {
              const docRef = doc(db, store, docId);
              await setDoc(docRef, cleanFirestoreData(item), { merge: true });
            }
          }
        } catch (e) {
          console.warn(`[Firestore Cloud Sync] Background bootstrap for ${store}:`, e);
        }
      })();
    }

    return localItems;
  },

  async getById<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
    const idStr = String(key);
    try {
      const docRef = doc(db, store, idStr);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as T;
        dbManager.put<T>(store, data).catch(() => {});
        return data;
      }
    } catch (error) {
      console.warn(`[Firestore Cloud Sync] Error in getById ${store}/${idStr}:`, error);
    }

    return dbManager.getById<T>(store, key);
  },

  async save<T>(store: StoreName, item: T): Promise<T> {
    const docId = String((item as any).id || Date.now());

    // 1. Save locally for instant UI update
    await dbManager.put<T>(store, item);

    // 2. Persist to Firestore Cloud
    try {
      const cleaned = cleanFirestoreData(item);
      const docRef = doc(db, store, docId);
      await setDoc(docRef, cleaned, { merge: true });
    } catch (error) {
      console.warn(`[Firestore Cloud Sync] Error saving ${store}/${docId}:`, error);
    }

    return item;
  },

  async delete(store: StoreName, key: IDBValidKey): Promise<void> {
    const idStr = String(key);
    await dbManager.deleteItem(store, key);

    try {
      const docRef = doc(db, store, idStr);
      await deleteDoc(docRef);
    } catch (error) {
      console.warn(`[Firestore Cloud Sync] Error deleting ${store}/${idStr}:`, error);
    }
  },

  async count(store: StoreName): Promise<number> {
    try {
      const colRef = collection(db, store);
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        return snapshot.size;
      }
    } catch {
      // ignore
    }
    return dbManager.count(store);
  },

  async clear(store: StoreName): Promise<void> {
    await dbManager.clearStore(store);
    try {
      const colRef = collection(db, store);
      const snapshot = await getDocs(colRef);
      for (const d of snapshot.docs) {
        await deleteDoc(d.ref);
      }
    } catch (error) {
      console.warn(`[Firestore Cloud Sync] Error clearing ${store}:`, error);
    }
  },

  async seedDemoData(username: string): Promise<void> {
    await dbManager.seedDemoData(username);
    // Sync newly seeded items to cloud
    const stores: StoreName[] = ['categories', 'products', 'settings', 'users'];
    for (const s of stores) {
      const items = await dbManager.getAll(s);
      for (const it of items) {
        const id = String((it as any).id);
        if (id) {
          try {
            await setDoc(doc(db, s, id), cleanFirestoreData(it), { merge: true });
          } catch {
            // ignore
          }
        }
      }
    }
  },

  async wipeAll(): Promise<void> {
    await dbManager.wipeAllData();
  },

  async syncWithCloud(): Promise<{ uploaded: number; downloaded: number }> {
    let uploaded = 0;
    let downloaded = 0;
    const stores: StoreName[] = [
      'settings',
      'categories',
      'products',
      'movements',
      'sales',
      'cashRegisters',
      'cashMovements',
      'users',
    ];

    for (const store of stores) {
      try {
        const colRef = collection(db, store);
        const snapshot = await getDocs(colRef);
        const cloudDocsMap = new Map<string, any>();

        for (const docSnap of snapshot.docs) {
          cloudDocsMap.set(docSnap.id, docSnap.data());
        }

        const localItems = await dbManager.getAll<any>(store);
        const localItemsMap = new Map<string, any>();

        for (const it of localItems) {
          const id = String(it.id || it.code || '');
          if (id) localItemsMap.set(id, it);
        }

        // 1. Download missing cloud documents into local DB
        for (const [id, cloudData] of cloudDocsMap.entries()) {
          const local = localItemsMap.get(id);
          if (!local) {
            await dbManager.put(store, cloudData);
            downloaded++;
          }
        }

        // 2. Upload any local documents not yet in cloud
        for (const [id, localData] of localItemsMap.entries()) {
          if (!cloudDocsMap.has(id)) {
            const docRef = doc(db, store, id);
            await setDoc(docRef, cleanFirestoreData(localData), { merge: true });
            uploaded++;
          }
        }
      } catch (err) {
        console.warn(`[SyncWithCloud] Sync store ${store} notice:`, err);
      }
    }

    return { uploaded, downloaded };
  },
};
