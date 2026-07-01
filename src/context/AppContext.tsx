// PANTAU App Context — clean architecture via Repository Layer
// Screen → Hook → Context → Repository → API/Storage → Worker → D1
import React, { createContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { Monitor, Note, ThemeMode, SyncStatus, MonitorCategory, NoteCategory } from '../types';
import { logger } from '../services/logger';
import { syncEngine } from '../services/syncEngine';
import { migrateStorage } from '../storage';
import { analytics } from '../services/analytics';
import { userRepo, monitorRepo, noteRepo, settingsRepo, syncRepo } from '../repository';
import { api } from '../api/client';
import { security } from '../services/security';
import { setLang } from '../services/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANG_KEY = '@pantau_language';

export type AppContextType = {
  user: { name: string; avatar: string } | null;
  setUser: (u: { name: string; avatar: string }) => void;
  logout: () => Promise<void>;
  monitors: Monitor[];
  addMonitor: (title: string, category: MonitorCategory) => void;
  editMonitor: (id: number, updates: Partial<Monitor>) => void;
  toggleMonitor: (id: number) => void;
  deleteMonitor: (id: number) => void;
  toggleFavorite: (id: number) => void;
  setMonitorAlert: (id: number, alert: Monitor['alert']) => void;
  setMonitorFolder: (id: number, folder: string) => void;
  notes: Note[];
  addNote: (title: string, content: string, category?: string, color?: string) => void;
  editNote: (id: number, title: string, content: string, category?: string, color?: string) => void;
  deleteNote: (id: number) => void;
  togglePin: (id: number) => void;
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;
  colorScheme: 'light' | 'dark';
  language: 'id' | 'en';
  setLanguage: (l: 'id' | 'en') => void;
  notificationEnabled: boolean;
  setNotificationEnabled: (v: boolean) => void;
  syncing: SyncStatus;
  syncNow: () => Promise<void>;
  lastSyncAt: string | null;
  loaded: boolean;
};

export const AppContext = createContext<AppContextType | null>(null);

function now() {
  const d = new Date();
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

// Welcome data
import { WELCOME_MONITORS, WELCOME_NOTES } from '../config/welcome';

// Stable, device-bound account id (random, unguessable, persisted in secure
// store). Cached here so the many synchronous getUserId() callers stay simple.
let cachedDeviceId = '';

// Resolve user ID. Prefer the persisted device id; fall back to a name-derived
// id only before the device id has loaded.
function getUserId(user: { name: string; avatar: string } | null): string {
  return cachedDeviceId || user?.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [loaded, setLoaded] = useState(false);
  const [user, setUserState] = useState<{ name: string; avatar: string } | null>(null);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [notificationEnabled, setNotificationState] = useState(false);
  const [language, setLanguageState] = useState<'id' | 'en'>('id');
  const [syncing, setSyncing] = useState<SyncStatus>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  // Init: migrate storage then load
  useEffect(() => {
    (async () => {
      try {
        await migrateStorage();
        // Restore language preference early so first paint is correct.
        try {
          const savedLang = await AsyncStorage.getItem(LANG_KEY);
          if (savedLang === 'id' || savedLang === 'en') { setLang(savedLang); setLanguageState(savedLang); }
        } catch {}
        // Establish a stable device identity + restore any saved session token
        // BEFORE touching the network, so cloud features survive app restarts.
        try {
          cachedDeviceId = await security.getDeviceId();
          await api.restoreToken();
        } catch (e: any) {
          logger.warn('Auth init failed', { error: e?.message }, 'context');
        }
        const [u, m, n, s, ls] = await Promise.all([
          userRepo.load(),
          monitorRepo.load(),
          noteRepo.load(),
          settingsRepo.load(),
          settingsRepo.loadLastSync(),
        ]);
        if (u) setUserState(u);
        if (m.length) setMonitors(m);
        if (n.length) setNotes(n);
        setNotificationState(s.notificationEnabled);
        setThemeModeState(s.theme);
        if (ls) setLastSyncAt(ls);
        // Refresh the session token idempotently (worker returns a token for an
        // existing device id instead of 409). captureToken persists it.
        if (u && cachedDeviceId) {
          userRepo.register(cachedDeviceId, u.name, u.avatar);
        }
      } catch (e: any) {
        logger.error('Failed to load data', { error: e.message }, 'context');
      }
      setLoaded(true);
    })();
  }, []);

  // Persist via repository
  useEffect(() => { if (loaded) monitorRepo.save(monitors); }, [monitors, loaded]);
  useEffect(() => { if (loaded) noteRepo.save(notes); }, [notes, loaded]);
  useEffect(() => { if (loaded) userRepo.save(user); }, [user, loaded]);
  useEffect(() => {
    if (loaded) settingsRepo.save({ notificationEnabled, theme: themeMode });
  }, [notificationEnabled, themeMode, loaded]);
  useEffect(() => { if (loaded) settingsRepo.saveTheme(themeMode); }, [themeMode, loaded]);

  // Welcome data for new users
  useEffect(() => {
    if (loaded && user && monitors.length === 0 && notes.length === 0) {
      setMonitors(WELCOME_MONITORS);
      setNotes(WELCOME_NOTES);
    }
  }, [loaded, user]);

  const colorScheme = useMemo((): 'light' | 'dark' =>
    systemColorScheme === 'dark' ? 'dark' : 'light', [systemColorScheme]);

  // Listen to sync engine state
  useEffect(() => {
    const unsub = syncEngine.onStateChange((state, item) => {
      switch (state) {
        case 'syncing': setSyncing('syncing'); break;
        case 'success': setSyncing('success'); break;
        case 'error': setSyncing('error'); break;
        default: setSyncing('idle');
      }
    });
    return unsub;
  }, []);

  const setUser = useCallback((u: { name: string; avatar: string }) => {
    setUserState(u);
    // Register against the stable device id (idempotent on the worker) and
    // run the first full sync. Done async so onboarding stays snappy.
    setTimeout(async () => {
      const uid = await security.getDeviceId();
      cachedDeviceId = uid;
      await userRepo.register(uid, u.name, u.avatar);
      syncEngine.fullSync(uid, { user: u, monitors: WELCOME_MONITORS, notes: WELCOME_NOTES });
      analytics.appOpen(uid);
    }, 800);
  }, []);

  const logout = useCallback(async () => {
    setUserState(null);
    setMonitors([]);
    setNotes([]);
    setNotificationState(false);
    setLastSyncAt(null);
    syncEngine.clear();
    api.setToken(null);            // drop + clear persisted session token
    await security.clearToken();
    await userRepo.clearAll();
  }, []);

  const syncNow = useCallback(async () => {
    const uid = getUserId(user);
    if (!uid) return;
    const success = await syncEngine.fullSync(uid, { user, monitors, notes });
    if (success) {
      const ts = new Date().toISOString();
      setLastSyncAt(ts);
      settingsRepo.saveLastSync(ts);
    }
  }, [user, monitors, notes]);

  const addMonitor = useCallback((title: string, category: MonitorCategory) => {
    setMonitors(prev => {
      const newMonitor: Monitor = { id: Date.now(), title, category, active: true, createdAt: now() };
      analytics.monitorCreated(getUserId(user));
      const uid = getUserId(user);
      syncEngine.enqueue({ type: 'monitor', action: 'create', data: { title, category }, priority: 'normal', maxRetries: 3 });
      return [newMonitor, ...prev];
    });
  }, [user]);

  const editMonitor = useCallback((id: number, updates: Partial<Monitor>) => {
    setMonitors(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    const uid = getUserId(user);
    syncEngine.enqueue({ type: 'monitor', action: 'update', data: { id, ...updates }, priority: 'normal', maxRetries: 3 });
  }, [user]);

  const toggleMonitor = useCallback((id: number) => {
    setMonitors(prev => prev.map(m => m.id === id ? { ...m, active: !m.active } : m));
  }, []);

  const deleteMonitor = useCallback((id: number) => {
    setMonitors(prev => prev.filter(m => m.id !== id));
    analytics.monitorDeleted(getUserId(user));
    syncEngine.enqueue({ type: 'monitor', action: 'delete', data: { id }, priority: 'high', maxRetries: 3 });
  }, [user]);

  const toggleFavorite = useCallback((id: number) => {
    setMonitors(prev => prev.map(m => m.id === id ? { ...m, favorite: !m.favorite } : m));
  }, []);

  const setMonitorAlert = useCallback((id: number, alert: Monitor['alert']) => {
    setMonitors(prev => prev.map(m => m.id === id ? { ...m, alert } : m));
  }, []);

  const setMonitorFolder = useCallback((id: number, folder: string) => {
    setMonitors(prev => prev.map(m => m.id === id ? { ...m, folder } : m));
  }, []);

  const addNote = useCallback((title: string, content: string, category: string = 'Umum', color = '#FFFFFF') => {
    const note: Note = { id: Date.now(), title, content, pinned: false, category: category as NoteCategory, color, createdAt: now() };
    setNotes(prev => [note, ...prev]);
    analytics.noteCreated(getUserId(user));
    syncEngine.enqueue({ type: 'note', action: 'create', data: { title, content, category, color }, priority: 'normal', maxRetries: 3 });
  }, [user]);

  const editNote = useCallback((id: number, title: string, content: string, category?: string, color?: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, title, content, category: (category || n.category) as NoteCategory, color: color || n.color } : n));
    syncEngine.enqueue({ type: 'note', action: 'update', data: { id, title, content, category, color }, priority: 'normal', maxRetries: 3 });
  }, []);

  const deleteNote = useCallback((id: number) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    analytics.noteDeleted(getUserId(user));
    syncEngine.enqueue({ type: 'note', action: 'delete', data: { id }, priority: 'high', maxRetries: 3 });
  }, [user]);

  const togglePin = useCallback((id: number) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  }, []);

  const setThemeMode = useCallback((m: ThemeMode) => setThemeModeState(m), []);
  const setNotificationEnabled = useCallback((v: boolean) => setNotificationState(v), []);
  const setLanguage = useCallback((l: 'id' | 'en') => { setLang(l); setLanguageState(l); AsyncStorage.setItem(LANG_KEY, l).catch(() => {}); }, []);

  const value = useMemo(() => ({
    user, setUser, logout,
    monitors, addMonitor, editMonitor, toggleMonitor, deleteMonitor,
    toggleFavorite, setMonitorAlert, setMonitorFolder,
    notes, addNote, editNote, deleteNote, togglePin,
    themeMode, setThemeMode, colorScheme,
    language, setLanguage,
    notificationEnabled, setNotificationEnabled,
    syncing, syncNow, lastSyncAt,
    loaded,
  }), [
    user, setUser, logout,
    monitors, addMonitor, editMonitor, toggleMonitor, deleteMonitor,
    toggleFavorite, setMonitorAlert, setMonitorFolder,
    notes, addNote, editNote, deleteNote, togglePin,
    themeMode, setThemeMode, colorScheme,
    language, setLanguage,
    notificationEnabled, setNotificationEnabled,
    syncing, syncNow, lastSyncAt, loaded,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
