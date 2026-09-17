import { Injectable } from '@angular/core';
import { openDB, IDBPDatabase } from 'idb';

@Injectable({
  providedIn: 'root',
})
export class IndexedDb {
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = openDB('OmniDoorDB', 1, {
      upgrade(db: IDBPDatabase<any>) {
        if (!db.objectStoreNames.contains('cache-data')) {
          db.createObjectStore('cache-data');
        }
        if (!db.objectStoreNames.contains('sync-queue')) {
          db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }

  // Métodos para el caché (ej: obtener listado de accesos para mostrar offline)
  async getCache(key: string): Promise<any> {
    const db = await this.dbPromise;
    return db.get('cache-data', key);
  }

  async setCache(key: string, data: any): Promise<void> {
    const db = await this.dbPromise;
    await db.put('cache-data', data, key);
  }

  // Métodos para la cola de sincronización (ej: posts offline)
  async addSyncItem(item: any): Promise<void> {
    const db = await this.dbPromise;
    await db.add('sync-queue', item);
  }

  async getAllSyncItems(): Promise<any[]> {
    const db = await this.dbPromise;
    return db.getAll('sync-queue');
  }

  async removeSyncItem(id: number): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('sync-queue', id);
  }

  async clearSyncQueue(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear('sync-queue');
  }

  async clearCacheData(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear('cache-data');
  }

  async clearAll(): Promise<void> {
    await this.clearSyncQueue();
    await this.clearCacheData();
  }
}
