"use client";

import type { SerializedPlant } from "@/lib/domain/plant-serialization";

/**
 * On-device garden storage, replacing PlantJsonHandler's TEMP.json.
 *
 * IndexedDB rather than localStorage: sprites are stored as data URLs and a
 * six-plant garden blows past localStorage's ~5 MB ceiling.
 *
 * This is the local half of the storage story. Once auth and DATABASE_URL are
 * configured, the same interface is served by the Postgres repository and this
 * becomes an offline cache.
 */

const DB_NAME = "plantemon";
const DB_VERSION = 1;
const STORE = "garden";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
      }),
  );
}

export async function loadGarden(): Promise<SerializedPlant[]> {
  const plants = await tx<SerializedPlant[]>("readonly", (store) => store.getAll());
  // Oldest first, so pots keep a stable order between visits.
  return plants.sort((a, b) => a.scanDateTime - b.scanDateTime);
}

export async function savePlant(plant: SerializedPlant): Promise<void> {
  await tx("readwrite", (store) => store.put(plant));
}

export async function removePlant(id: string): Promise<void> {
  await tx("readwrite", (store) => store.delete(id));
}

export async function clearGarden(): Promise<void> {
  await tx("readwrite", (store) => store.clear());
}

/**
 * Asks the browser to keep this origin's storage from being evicted.
 *
 * Matters most on iOS: data for a site the user has not installed to the home
 * screen can be cleared after seven days of inactivity.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
