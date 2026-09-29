import { Platform } from 'react-native';
import {
  ActivityRecord,
  UserSettings,
  DailyStats,
  DEFAULT_USER_SETTINGS,
  getLocalDateKey,
  getLocalDayLabel,
} from './schema';

export interface IActivityRepository {
  init(): Promise<void>;
  saveActivity(record: ActivityRecord): Promise<void>;
  getActivities(userId: string): Promise<ActivityRecord[]>;
  getDailyStats(userId: string, days?: number): Promise<DailyStats[]>;
  getTodayStats(userId: string): Promise<DailyStats>;
  deleteActivity(userId: string, id: string): Promise<void>;
  clearLocalData(userId: string): Promise<void>;
  exportDataJSON(userId: string): Promise<string>;
  getSettings(userId: string): Promise<UserSettings>;
  saveSettings(settings: UserSettings): Promise<void>;
  getPendingSyncRecords(userId: string): Promise<ActivityRecord[]>;
  markRecordsSynced(userId: string, ids: string[]): Promise<void>;
  mergeRemoteRecords(userId: string, remoteRecords: ActivityRecord[]): Promise<void>;
}

// In-Memory / IndexedDB Store for Web and Testing
class WebAndMemoryRepository implements IActivityRepository {
  private activities: Map<string, ActivityRecord> = new Map();
  private settings: Map<string, UserSettings> = new Map();
  private dbName = 'repomodore_local_db';
  private isIndexedDBAvailable: boolean = false;

  async init(): Promise<void> {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      'indexedDB' in window
    ) {
      this.isIndexedDBAvailable = true;
      await this.initIndexedDB();
    }
  }

  private initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(this.dbName, 1);
        request.onupgradeneeded = (event: any) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('activities')) {
            const store = db.createObjectStore('activities', { keyPath: 'id' });
            store.createIndex('userId', 'userId', { unique: false });
          }
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'userId' });
          }
        };
        request.onsuccess = () => resolve();
        request.onerror = () => {
          this.isIndexedDBAvailable = false;
          resolve(); // Fallback to memory
        };
      } catch (err) {
        this.isIndexedDBAvailable = false;
        resolve();
      }
    });
  }

  async saveActivity(record: ActivityRecord): Promise<void> {
    this.activities.set(record.id, record);

    if (this.isIndexedDBAvailable) {
      try {
        await this.withTransaction('activities', 'readwrite', (store) => {
          store.put(record);
        });
      } catch (err) {
        console.warn('IndexedDB saveActivity error:', err);
      }
    }
  }

  async getActivities(userId: string): Promise<ActivityRecord[]> {
    if (this.isIndexedDBAvailable) {
      try {
        const all = await this.getAllFromStore<ActivityRecord>('activities');
        return all
          .filter((r) => r.userId === userId && !r.deletedAt)
          .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      } catch (err) {
        console.warn('IndexedDB getActivities error:', err);
      }
    }

    return Array.from(this.activities.values())
      .filter((r) => r.userId === userId && !r.deletedAt)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }

  async getDailyStats(userId: string, days: number = 7): Promise<DailyStats[]> {
    const activities = await this.getActivities(userId);

    // Build the list of last N days in viewer's local timezone
    const result: DailyStats[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      result.push({
        dateKey,
        dayLabel: getLocalDayLabel(dateKey),
        focusBlocks: 0,
        focusMinutes: 0,
        reportedReps: 0,
        skippedBreaks: 0,
      });
    }

    const map = new Map<string, DailyStats>(result.map((s) => [s.dateKey, s]));

    for (const act of activities) {
      const key = getLocalDateKey(act.completedAt);
      const stat = map.get(key);
      if (stat) {
        stat.focusBlocks += 1;
        stat.focusMinutes += Math.round(act.focusSeconds / 60);
        stat.reportedReps += act.reportedReps;
        if (act.breakOutcome === 'skipped') {
          stat.skippedBreaks += 1;
        }
      }
    }

    return result;
  }

  async getTodayStats(userId: string): Promise<DailyStats> {
    const stats = await this.getDailyStats(userId, 1);
    return (
      stats[0] ?? {
        dateKey: getLocalDateKey(new Date().toISOString()),
        dayLabel: 'Today',
        focusBlocks: 0,
        focusMinutes: 0,
        reportedReps: 0,
        skippedBreaks: 0,
      }
    );
  }

  async deleteActivity(userId: string, id: string): Promise<void> {
    const existing = this.activities.get(id);
    if (existing && existing.userId === userId) {
      const tombstone: ActivityRecord = {
        ...existing,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
      };
      await this.saveActivity(tombstone);
    }
  }

  async clearLocalData(userId: string): Promise<void> {
    const keysToDelete: string[] = [];
    for (const [id, act] of this.activities.entries()) {
      if (act.userId === userId) {
        keysToDelete.push(id);
      }
    }
    keysToDelete.forEach((k) => this.activities.delete(k));

    if (this.isIndexedDBAvailable) {
      try {
        await this.withTransaction('activities', 'readwrite', (store) => {
          keysToDelete.forEach((k) => store.delete(k));
        });
      } catch (err) {
        console.warn('IndexedDB clearLocalData error:', err);
      }
    }
  }

  async exportDataJSON(userId: string): Promise<string> {
    const activities = await this.getActivities(userId);
    const settings = await this.getSettings(userId);
    const payload = {
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      userId,
      settings,
      activities,
    };
    return JSON.stringify(payload, null, 2);
  }

  async getSettings(userId: string): Promise<UserSettings> {
    if (this.isIndexedDBAvailable) {
      try {
        const saved = await this.getOneFromStore<UserSettings>('settings', userId);
        if (saved) return saved;
      } catch (err) {
        console.warn('IndexedDB getSettings error:', err);
      }
    }

    const saved = this.settings.get(userId);
    if (saved) return saved;

    const defaultSettings = DEFAULT_USER_SETTINGS(userId);
    this.settings.set(userId, defaultSettings);
    return defaultSettings;
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    this.settings.set(settings.userId, settings);

    if (this.isIndexedDBAvailable) {
      try {
        await this.withTransaction('settings', 'readwrite', (store) => {
          store.put(settings);
        });
      } catch (err) {
        console.warn('IndexedDB saveSettings error:', err);
      }
    }
  }

  async getPendingSyncRecords(userId: string): Promise<ActivityRecord[]> {
    const all = await this.getActivities(userId);
    return all.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed');
  }

  async markRecordsSynced(userId: string, ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    for (const id of idSet) {
      const act = this.activities.get(id);
      if (act && act.userId === userId) {
        act.syncStatus = 'synced';
        await this.saveActivity(act);
      }
    }
  }

  async mergeRemoteRecords(userId: string, remoteRecords: ActivityRecord[]): Promise<void> {
    for (const remote of remoteRecords) {
      if (remote.userId !== userId) continue;

      const local = this.activities.get(remote.id);
      if (!local) {
        // New record from cloud
        await this.saveActivity({ ...remote, syncStatus: 'synced' });
      } else {
        // Resolve latest updatedAt
        const localTime = new Date(local.updatedAt).getTime();
        const remoteTime = new Date(remote.updatedAt).getTime();
        if (remoteTime >= localTime) {
          await this.saveActivity({ ...remote, syncStatus: 'synced' });
        }
      }
    }
  }

  private withTransaction(
    storeName: string,
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, 1);
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        callback(store);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private getAllFromStore<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, 1);
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const getReq = store.getAll();
        getReq.onsuccess = () => resolve(getReq.result ?? []);
        getReq.onerror = () => reject(getReq.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private getOneFromStore<T>(storeName: string, key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, 1);
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const getReq = store.get(key);
        getReq.onsuccess = () => resolve(getReq.result ?? null);
        getReq.onerror = () => reject(getReq.error);
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// Export singleton instance of repository
export const activityRepository: IActivityRepository = new WebAndMemoryRepository();
