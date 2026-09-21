import { dbManager, StoreName } from '../database/indexedDB';
import { db, ensureAuth } from './firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';

const ALL_STORES: StoreName[] = [
  'settings',
  'categories',
  'products',
  'movements',
  'sales',
  'cashRegisters',
  'cashMovements',
  'users',
];

// In-Memory fast cache layers
const memoryCache = new Map<StoreName, Map<string, any>>();
const storeLoaded = new Map<StoreName, boolean>();
const storeLoadPromises = new Map<StoreName, Promise<void>>();
const lastCloudSyncTimestamp = new Map<StoreName, number>();
const isCloudSyncing = new Map<StoreName, boolean>();

function getStoreMap(store: StoreName): Map<string, any> {
  let map = memoryCache.get(store);
  if (!map) {
    map = new Map<string, any>();
    memoryCache.set(store, map);
  }
  return map;
}

function getItemKey(store: StoreName, item: any): string {
  if (!item) return '';
  return String(item.id ?? item.code ?? (store === 'settings' ? 'main' : ''));
}

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

/**
 * Ensures a store is loaded into the in-memory cache from IndexedDB.
 * Returns in milliseconds, and spawns a non-blocking background cloud check.
 */
async function ensureStoreLoaded(store: StoreName): Promise<void> {
  if (storeLoaded.get(store)) {
    return;
  }

  const existingPromise = storeLoadPromises.get(store);
  if (existingPromise) {
    return existingPromise;
  }

  const loadPromise = (async () => {
    try {
      const map = getStoreMap(store);
      // Fast read from local IndexedDB
      const localItems = await dbManager.getAll<any>(store);
      for (const item of localItems) {
        const key = getItemKey(store, item);
        if (key) map.set(key, item);
      }
      storeLoaded.set(store, true);

      // Trigger background cloud sync without blocking
      triggerBackgroundCloudSync(store).catch(() => {});
    } catch (err) {
      console.warn(`[Database Cache] Error loading store ${store}:`, err);
      storeLoaded.set(store, true);
    } finally {
      storeLoadPromises.delete(store);
    }
  })();

  storeLoadPromises.set(store, loadPromise);
  return loadPromise;
}

/**
 * Asynchronously synchronizes cloud Firestore data in the background
 * without freezing the user interface or stalling transactions.
 */
async function triggerBackgroundCloudSync(store: StoreName): Promise<void> {
  const now = Date.now();
  const lastSync = lastCloudSyncTimestamp.get(store) || 0;
  // Limit background sync to at most once every 20 seconds per store unless explicitly triggered
  if (isCloudSyncing.get(store) || now - lastSync < 20000) {
    return;
  }

  isCloudSyncing.set(store, true);
  try {
    await ensureAuth().catch(() => {});
    const colRef = collection(db, store);
    const snapshot = await getDocs(colRef);
    const map = getStoreMap(store);
    let hasChanges = false;

    if (!snapshot.empty) {
      for (const docSnap of snapshot.docs) {
        const cloudData = docSnap.data();
        const docId = docSnap.id;
        const localData = map.get(docId);

        // Update local if cloud has it and local doesn't or cloud is newer
        if (!localData || JSON.stringify(localData) !== JSON.stringify(cloudData)) {
          map.set(docId, cloudData);
          await dbManager.put(store, cloudData).catch(() => {});
          hasChanges = true;
        }
      }
    }

    // Also upload any local documents that are not yet in Firestore
    for (const [id, localData] of map.entries()) {
      if (id && !snapshot.docs.some(d => d.id === id)) {
        try {
          const docRef = doc(db, store, id);
          await setDoc(docRef, cleanFirestoreData(localData), { merge: true });
        } catch {
          // Ignore background upload failures
        }
      }
    }

    lastCloudSyncTimestamp.set(store, Date.now());

    if (hasChanges) {
      window.dispatchEvent(new CustomEvent('estoque_data_changed'));
    }
  } catch (e) {
    console.warn(`[Background Cloud Sync] Sync notice for ${store}:`, e);
  } finally {
    isCloudSyncing.set(store, false);
  }
}

export const databaseService = {
  /**
   * Pre-warms all critical stores into in-memory cache for instant navigation
   */
  async prewarmCache(): Promise<void> {
    await Promise.all(ALL_STORES.map(store => ensureStoreLoaded(store)));
  },

  /**
   * Returns all items from in-memory cache instantly (0ms).
   */
  async getAll<T>(store: StoreName): Promise<T[]> {
    await ensureStoreLoaded(store);
    const map = getStoreMap(store);
    return Array.from(map.values()) as T[];
  },

  /**
   * Returns a single item by key from in-memory cache instantly (0ms).
   */
  async getById<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
    await ensureStoreLoaded(store);
    const map = getStoreMap(store);
    return map.get(String(key)) as T | undefined;
  },

  /**
   * Saves an item with sub-millisecond local latency.
   * Updates memory cache and IndexedDB immediately, and persists to Firestore in the background.
   */
  async save<T>(store: StoreName, item: T): Promise<T> {
    await ensureStoreLoaded(store);
    const map = getStoreMap(store);
    const docId = getItemKey(store, item) || `item-${Date.now()}`;

    // 1. Instant update in memory cache (0ms)
    map.set(docId, item);

    // 2. Persist locally to IndexedDB asynchronously
    dbManager.put<T>(store, item).catch(err => {
      console.warn(`[Local DB] Failed to persist ${store}/${docId}:`, err);
    });

    // 3. Persist to Firestore Cloud in the background (non-blocking)
    try {
      const cleaned = cleanFirestoreData(item);
      const docRef = doc(db, store, docId);
      // Fire-and-forget promise to not hold up UI processing
      setDoc(docRef, cleaned, { merge: true }).catch(cloudErr => {
        console.warn(`[Firestore Cloud Sync] Background save notice for ${store}/${docId}:`, cloudErr);
      });
    } catch (error) {
      console.warn(`[Firestore Cloud Sync] Error scheduling ${store}/${docId}:`, error);
    }

    return item;
  },

  /**
   * Deletes an item instantly from memory and queues persistence removal.
   */
  async delete(store: StoreName, key: IDBValidKey): Promise<void> {
    await ensureStoreLoaded(store);
    const map = getStoreMap(store);
    const idStr = String(key);

    // 1. Instant delete from memory cache
    map.delete(idStr);

    // 2. Local IndexedDB removal
    dbManager.deleteItem(store, key).catch(() => {});

    // 3. Cloud Firestore removal in the background
    try {
      const docRef = doc(db, store, idStr);
      deleteDoc(docRef).catch(() => {});
    } catch (error) {
      console.warn(`[Firestore Cloud Sync] Error deleting ${store}/${idStr}:`, error);
    }
  },

  /**
   * Returns store item count instantly from memory (0ms).
   */
  async count(store: StoreName): Promise<number> {
    if (storeLoaded.get(store)) {
      return getStoreMap(store).size;
    }
    await ensureStoreLoaded(store);
    return getStoreMap(store).size;
  },

  /**
   * Clears a store both in memory, local storage, and cloud.
   */
  async clear(store: StoreName): Promise<void> {
    const map = getStoreMap(store);
    map.clear();
    await dbManager.clearStore(store);

    try {
      const colRef = collection(db, store);
      const snapshot = await getDocs(colRef);
      for (const d of snapshot.docs) {
        deleteDoc(d.ref).catch(() => {});
      }
    } catch (error) {
      console.warn(`[Firestore Cloud Sync] Error clearing ${store}:`, error);
    }
  },

  /**
   * Seeds demo data and resets cache
   */
  async seedDemoData(username: string): Promise<void> {
    await dbManager.seedDemoData(username);
    // Invalidate memory cache so it reloads fresh seeded data
    for (const s of ALL_STORES) {
      storeLoaded.delete(s);
      memoryCache.delete(s);
    }
    await this.prewarmCache();

    // Sync newly seeded items to cloud in the background
    const storesToSync: StoreName[] = ['categories', 'products', 'settings', 'users'];
    for (const s of storesToSync) {
      const items = await this.getAll(s);
      for (const it of items) {
        const id = getItemKey(s, it);
        if (id) {
          setDoc(doc(db, s, id), cleanFirestoreData(it), { merge: true }).catch(() => {});
        }
      }
    }
  },

  /**
   * Wipes all data
   */
  async wipeAll(): Promise<void> {
    for (const s of ALL_STORES) {
      getStoreMap(s).clear();
      storeLoaded.delete(s);
    }
    await dbManager.wipeAllData();
  },

  /**
   * Forces a full synchronization between local IndexedDB and cloud Firestore
   */
  async syncWithCloud(): Promise<{ uploaded: number; downloaded: number }> {
    await ensureAuth().catch(() => {});
    let uploaded = 0;
    let downloaded = 0;

    for (const store of ALL_STORES) {
      try {
        const colRef = collection(db, store);
        const snapshot = await getDocs(colRef);
        const cloudDocsMap = new Map<string, any>();

        for (const docSnap of snapshot.docs) {
          cloudDocsMap.set(docSnap.id, docSnap.data());
        }

        const map = getStoreMap(store);
        const localItems = await dbManager.getAll<any>(store);
        const localItemsMap = new Map<string, any>();

        for (const it of localItems) {
          const id = getItemKey(store, it);
          if (id) localItemsMap.set(id, it);
        }

        // 1. Download missing cloud documents into local memory and DB
        for (const [id, cloudData] of cloudDocsMap.entries()) {
          const local = localItemsMap.get(id);
          if (!local || JSON.stringify(local) !== JSON.stringify(cloudData)) {
            map.set(id, cloudData);
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

        lastCloudSyncTimestamp.set(store, Date.now());
      } catch (err) {
        console.warn(`[SyncWithCloud] Sync store ${store} notice:`, err);
      }
    }

    return { uploaded, downloaded };
  },
};

