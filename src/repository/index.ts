// Repository Layer — single source of truth for data flow
// Screen → Hook → Context → Repository → API/Storage → Worker → D1
import { Monitor, Note, User, Reminder, ThemeMode, SyncStatus } from '../types';
import { api } from '../api/client';
import * as storage from '../storage';
import { logger } from '../services/logger';

// ===== User Repository =====
export class UserRepository {
  async load(): Promise<{ name: string; avatar: string } | null> {
    return storage.loadUser();
  }

  async save(user: { name: string; avatar: string } | null): Promise<void> {
    return storage.saveUser(user);
  }

  async register(userId: string, name: string, avatar: string): Promise<void> {
    await api.register(userId, name, avatar).catch(() => {});
  }

  async sync(userId: string, data: any): Promise<void> {
    await api.sync(userId, data).catch(() => {});
  }

  async clearAll(): Promise<void> {
    return storage.clearAll();
  }
}

// ===== Monitor Repository =====
export class MonitorRepository {
  async load(): Promise<Monitor[]> {
    return storage.loadMonitors();
  }

  async save(monitors: Monitor[]): Promise<void> {
    return storage.saveMonitors(monitors);
  }

  async create(userId: string, title: string, category: string): Promise<void> {
    api.createMonitor(userId, { title, category }).catch(() => {});
  }

  async update(userId: string, id: string, data: any): Promise<void> {
    api.updateMonitor(userId, id, data).catch(() => {});
  }

  async remove(userId: string, id: string): Promise<void> {
    api.deleteMonitor(userId, id).catch(() => {});
  }
}

// ===== Note Repository =====
export class NoteRepository {
  async load(): Promise<Note[]> {
    return storage.loadNotes();
  }

  async save(notes: Note[]): Promise<void> {
    return storage.saveNotes(notes);
  }

  async create(userId: string, data: any): Promise<void> {
    api.createNote(userId, data).catch(() => {});
  }

  async update(userId: string, id: string, data: any): Promise<void> {
    api.updateNote(userId, id, data).catch(() => {});
  }

  async remove(userId: string, id: string): Promise<void> {
    api.deleteNote(userId, id).catch(() => {});
  }
}

// ===== Settings Repository =====
export class SettingsRepository {
  async load(): Promise<{ notificationEnabled: boolean; theme: ThemeMode }> {
    return storage.loadSettings();
  }

  async save(settings: { notificationEnabled: boolean; theme: ThemeMode }): Promise<void> {
    return storage.saveSettings(settings);
  }

  async loadTheme(): Promise<ThemeMode> {
    return storage.loadTheme();
  }

  async saveTheme(mode: ThemeMode): Promise<void> {
    return storage.saveTheme(mode);
  }

  async loadLastSync(): Promise<string | null> {
    return storage.loadLastSync();
  }

  async saveLastSync(ts: string): Promise<void> {
    return storage.saveLastSync(ts);
  }
}

// ===== Sync Repository =====
export class SyncRepository {
  async getQueue(): Promise<any[]> {
    return storage.getSyncQueue();
  }

  async addToQueue(item: any): Promise<void> {
    return storage.addToSyncQueue(item);
  }

  async clearQueue(): Promise<void> {
    return storage.clearSyncQueue();
  }

  async syncToCloud(userId: string, data: any): Promise<boolean> {
    const res = await api.sync(userId, data);
    return res.success;
  }

  async uploadQueue(userId: string): Promise<number> {
    const queue = await this.getQueue();
    let uploaded = 0;
    for (const item of queue) {
      try {
        const res = await api.sync(userId, item);
        if (res.success) uploaded++;
      } catch (e: any) {
        logger.error(`Queue upload failed: ${e.message}`, undefined, 'sync');
      }
    }
    if (uploaded > 0) await this.clearQueue();
    return uploaded;
  }
}

// ===== Singleton instances =====
export const userRepo = new UserRepository();
export const monitorRepo = new MonitorRepository();
export const noteRepo = new NoteRepository();
export const settingsRepo = new SettingsRepository();
export const syncRepo = new SyncRepository();
