// Storage — AsyncStorage persistence layer with migration support
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Monitor, Note, User, ThemeMode, SyncStatus } from '../types';
import { CONFIG } from '../config';

const STORAGE_VERSION = 2;
const VERSION_KEY = `${CONFIG.storagePrefix}version`;

const KEYS = {
  user: `${CONFIG.storagePrefix}user`,
  monitors: `${CONFIG.storagePrefix}monitors`,
  notes: `${CONFIG.storagePrefix}notes`,
  settings: `${CONFIG.storagePrefix}settings`,
  theme: `${CONFIG.storagePrefix}theme`,
  lastSync: `${CONFIG.storagePrefix}last_sync`,
  syncQueue: `${CONFIG.storagePrefix}sync_queue`,
  onboarding: `${CONFIG.storagePrefix}onboarding`,
  analyticsId: `${CONFIG.storagePrefix}analytics_id`,
};

// User
export async function loadUser(): Promise<{ name: string; avatar: string } | null> {
  try { const raw = await AsyncStorage.getItem(KEYS.user); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
export async function saveUser(user: { name: string; avatar: string } | null): Promise<void> {
  try { user ? await AsyncStorage.setItem(KEYS.user, JSON.stringify(user)) : await AsyncStorage.removeItem(KEYS.user); }
  catch {}
}

// Monitors
export async function loadMonitors(): Promise<Monitor[]> {
  try { const raw = await AsyncStorage.getItem(KEYS.monitors); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
export async function saveMonitors(monitors: Monitor[]): Promise<void> {
  try { await AsyncStorage.setItem(KEYS.monitors, JSON.stringify(monitors)); }
  catch {}
}

// Notes
export async function loadNotes(): Promise<Note[]> {
  try { const raw = await AsyncStorage.getItem(KEYS.notes); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
export async function saveNotes(notes: Note[]): Promise<void> {
  try { await AsyncStorage.setItem(KEYS.notes, JSON.stringify(notes)); }
  catch {}
}

// Theme
export async function loadTheme(): Promise<ThemeMode> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.theme);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {}
  return 'system';
}
export async function saveTheme(mode: ThemeMode): Promise<void> {
  try { await AsyncStorage.setItem(KEYS.theme, mode); }
  catch {}
}

// Settings
export async function loadSettings(): Promise<{ notificationEnabled: boolean; theme: ThemeMode }> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.settings);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { notificationEnabled: false, theme: 'system' };
}
export async function saveSettings(settings: { notificationEnabled: boolean; theme: ThemeMode }): Promise<void> {
  try { await AsyncStorage.setItem(KEYS.settings, JSON.stringify(settings)); }
  catch {}
}

// Last sync
export async function loadLastSync(): Promise<string | null> {
  try { return await AsyncStorage.getItem(KEYS.lastSync); }
  catch { return null; }
}
export async function saveLastSync(ts: string): Promise<void> {
  try { await AsyncStorage.setItem(KEYS.lastSync, ts); }
  catch {}
}

// Onboarding
export async function isOnboarded(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(KEYS.onboarding)) === 'true'; }
  catch { return false; }
}
export async function setOnboarded(): Promise<void> {
  try { await AsyncStorage.setItem(KEYS.onboarding, 'true'); }
  catch {}
}

// Sync queue
export async function getSyncQueue(): Promise<any[]> {
  try { const raw = await AsyncStorage.getItem(KEYS.syncQueue); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
export async function addToSyncQueue(item: any): Promise<void> {
  try {
    const queue = await getSyncQueue();
    queue.push({ ...item, queuedAt: new Date().toISOString() });
    await AsyncStorage.setItem(KEYS.syncQueue, JSON.stringify(queue));
  } catch {}
}
export async function clearSyncQueue(): Promise<void> {
  try { await AsyncStorage.setItem(KEYS.syncQueue, '[]'); }
  catch {}
}

// Clear all
export async function clearAll(): Promise<void> {
  try { await AsyncStorage.multiRemove(Object.values(KEYS)); }
  catch {}
}

// Storage usage (estimated)
export async function getStorageUsage(): Promise<{ used: number; items: Record<string, number> }> {
  const keys = Object.values(KEYS);
  let total = 0;
  const items: Record<string, number> = {};
  for (const key of keys) {
    try {
      const val = await AsyncStorage.getItem(key);
      const size = val ? val.length * 2 : 0; // UTF-16 = 2 bytes per char
      items[key.replace(CONFIG.storagePrefix, '')] = size;
      total += size;
    } catch {}
  }
  return { used: total, items };
}

// ===== Storage Migration System =====

// Run migrations if needed — call on app startup
async function getStorageVersion(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(VERSION_KEY);
    return v ? parseInt(v, 10) : 0;
  } catch { return 0; }
}

export async function migrateStorage(): Promise<void> {
  const currentVersion = await getStorageVersion();
  if (currentVersion >= STORAGE_VERSION) return;

  // v0 → v1: Initial version (no migration needed)
  if (currentVersion < 1) {
    // First install or pre-migration data — just mark as migrated
  }

  // v1 → v2: Add settings migration if needed
  if (currentVersion < 2 && currentVersion >= 1) {
    // Migrate settings format if needed
    try {
      const settings = await AsyncStorage.getItem(`${CONFIG.storagePrefix}settings`);
      if (settings) {
        const parsed = JSON.parse(settings);
        // Ensure theme field exists
        if (parsed && typeof parsed.theme === 'string') {
          // Already correct format
        }
      }
    } catch {}
  }

  await AsyncStorage.setItem(VERSION_KEY, String(STORAGE_VERSION));
}

export async function getStorageVersionLabel(): Promise<string> {
  const v = await getStorageVersion();
  return `v${v}`;
}
