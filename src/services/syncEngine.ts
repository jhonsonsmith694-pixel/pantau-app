// Sync Engine — complete sync with queue, retry, conflict resolution
import { CONFIG } from '../config';
import { logger } from './logger';
import { syncRepo } from '../repository';
import { api } from '../api/client';

export type SyncState = 'idle' | 'syncing' | 'success' | 'error' | 'offline';
export type SyncPriority = 'high' | 'normal' | 'low';

export type SyncItem = {
  id: string;
  type: 'monitor' | 'note' | 'user' | 'settings' | 'full';
  action: 'create' | 'update' | 'delete' | 'sync';
  data: any;
  priority: SyncPriority;
  retries: number;
  maxRetries: number;
  createdAt: string;
  lastAttempt?: string;
  error?: string;
};

class SyncEngine {
  private state: SyncState = 'idle';
  private queue: SyncItem[] = [];
  private listeners: Array<(state: SyncState, item?: SyncItem) => void> = [];
  private autoSyncTimer: ReturnType<typeof setInterval> | null = null;
  private isProcessing: boolean = false;

  constructor() {
    this.loadQueue();
  }

  private async loadQueue() {
    try {
      const saved = await syncRepo.getQueue();
      this.queue = saved.map((item: any) => ({
        ...item,
        priority: item.priority || 'normal',
        retries: item.retries || 0,
        maxRetries: item.maxRetries || CONFIG.maxSyncRetries,
      }));
    } catch {}
  }

  private async saveQueue() {
    try { await syncRepo.addToQueue(this.queue); }
    catch {}
  }

  onStateChange(listener: (state: SyncState, item?: SyncItem) => void) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private notify(state: SyncState, item?: SyncItem) {
    this.state = state;
    this.listeners.forEach(l => l(state, item));
  }

  getState(): SyncState { return this.state; }
  getQueue(): SyncItem[] { return [...this.queue]; }
  getQueueSize(): number { return this.queue.length; }

  // Add item to queue
  async enqueue(item: Omit<SyncItem, 'id' | 'retries' | 'createdAt'>): Promise<string> {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    const syncItem: SyncItem = {
      ...item,
      id,
      retries: 0,
      maxRetries: item.maxRetries || CONFIG.maxSyncRetries,
      createdAt: new Date().toISOString(),
    };
    this.queue.push(syncItem);
    await this.saveQueue();
    logger.debug(`Sync enqueued: ${item.type}/${item.action}`, { id }, 'sync');
    // Start processing if idle
    if (this.state === 'idle') this.processQueue();
    return id;
  }

  // Process the queue
  async processQueue(userId?: string): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    this.notify('syncing');

    try {
      // Sort by priority
      const priorityOrder: Record<SyncPriority, number> = { high: 0, normal: 1, low: 2 };
      const sorted = [...this.queue].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      const remaining: SyncItem[] = [];
      let successes = 0;
      let failures = 0;

      for (const item of sorted) {
        try {
          const result = await this.processItem(item, userId);
          if (result) successes++;
          else {
            item.retries++;
            item.lastAttempt = new Date().toISOString();
            if (item.retries < item.maxRetries) {
              remaining.push(item);
            } else {
              item.error = 'Max retries exceeded';
              failures++;
              logger.error(`Sync item failed permanently: ${item.type}/${item.action}`, { id: item.id }, 'sync');
            }
          }
        } catch (e: any) {
          item.retries++;
          item.lastAttempt = new Date().toISOString();
          item.error = e.message;
          if (item.retries < item.maxRetries) {
            remaining.push(item);
          } else {
            failures++;
          }
        }
      }

      this.queue = remaining;
      await this.saveQueue();

      if (this.queue.length === 0) {
        this.notify('success');
      } else {
        this.notify('error');
      }

      logger.info(`Sync complete: ${successes} successes, ${failures} failures, ${remaining.length} remaining`, undefined, 'sync');
    } catch (e: any) {
      logger.error(`Sync engine error: ${e.message}`, undefined, 'sync');
      this.notify('error');
    }

    this.isProcessing = false;
  }

  private async processItem(item: SyncItem, userId?: string): Promise<boolean> {
    if (!userId) return false;

    switch (item.type) {
      case 'monitor':
        if (item.action === 'create') {
          const res = await api.createMonitor(userId, item.data);
          return res.success;
        } else if (item.action === 'update') {
          const res = await api.updateMonitor(userId, item.data.id, item.data);
          return res.success;
        } else if (item.action === 'delete') {
          const res = await api.deleteMonitor(userId, item.data.id);
          return res.success;
        }
        break;

      case 'note':
        if (item.action === 'create') {
          const res = await api.createNote(userId, item.data);
          return res.success;
        } else if (item.action === 'update') {
          const res = await api.updateNote(userId, item.data.id, item.data);
          return res.success;
        } else if (item.action === 'delete') {
          const res = await api.deleteNote(userId, item.data.id);
          return res.success;
        }
        break;

      case 'full':
        const res = await api.sync(userId, item.data);
        return res.success;

      case 'settings': {
        const res = await api.updateSettings(userId, item.data);
        return res.success;
      }

      case 'user': {
        const res = await api.updateUser(userId, item.data);
        return res.success;
      }
    }

    return false;
  }

  // Full sync
  async fullSync(userId: string, data: any): Promise<boolean> {
    this.notify('syncing');
    try {
      const res = await api.sync(userId, data);
      if (res.success) {
        this.queue = [];
        await this.saveQueue();
        this.notify('success');
        return true;
      }
      this.notify('error');
      return false;
    } catch (e: any) {
      logger.error(`Full sync failed: ${e.message}`, undefined, 'sync');
      this.notify('error');
      return false;
    }
  }

  // Conflict resolver — last-write-wins with timestamp comparison
  resolveConflict(local: any, remote: any): any {
    if (!local?.updatedAt && !remote?.updatedAt) return local || remote;
    const localTime = new Date(local?.updatedAt || 0).getTime();
    const remoteTime = new Date(remote?.updatedAt || 0).getTime();
    return localTime >= remoteTime ? local : remote;
  }

  // Start auto-sync
  startAutoSync(intervalMs: number = CONFIG.syncInterval) {
    if (this.autoSyncTimer) clearInterval(this.autoSyncTimer);
    this.autoSyncTimer = setInterval(() => {
      if (this.queue.length > 0) this.processQueue();
    }, intervalMs);
    logger.info(`Auto-sync started (every ${intervalMs / 1000}s)`, undefined, 'sync');
  }

  // Stop auto-sync
  stopAutoSync() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }

  // Clear all pending
  async clear(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
    this.notify('idle');
  }

  // Cleanup
  destroy() {
    this.stopAutoSync();
    this.listeners = [];
  }
}

export const syncEngine = new SyncEngine();
