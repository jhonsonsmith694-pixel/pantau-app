// PANTAU Type Definitions

export type User = {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  premium: boolean;
  storageUsed: number;
  storageLimit: number;
  lastSyncAt?: string;
  onboarded: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Monitor = {
  id: number;
  title: string;
  category: MonitorCategory;
  active: boolean;
  createdAt: string;
};

export type Note = {
  id: number;
  title: string;
  content: string;
  pinned: boolean;
  category: NoteCategory;
  color: string;
  createdAt: string;
};

export type Reminder = {
  id: string;
  userId: string;
  title: string;
  note?: string;
  dueAt: string;
  repeat?: string;
  completed: boolean;
  snoozedUntil?: string;
  createdAt: string;
  updatedAt: string;
};

export type Event = {
  id: string;
  userId: string;
  type: EventType;
  source?: string;
  sourceId?: string;
  title?: string;
  description?: string;
  metadata?: Record<string, any>;
  severity: 'info' | 'warning' | 'error';
  createdAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  body?: string;
  type?: string;
  data?: Record<string, any>;
  read: boolean;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
};

export type Setting = {
  key: string;
  value: string;
};

export type MonitorCategory = 'harga' | 'berita' | 'stok' | 'jadwal';
export type NoteCategory = 'Umum' | 'Ide' | 'Jadwal' | 'Belanja' | 'Kerja' | 'Utang';
export type EventType = 'monitor_created' | 'monitor_updated' | 'monitor_alert' | 'note_created' | 'note_updated' | 'note_deleted' | 'sync_started' | 'sync_completed' | 'sync_failed' | 'reminder_fired' | 'notification_sent' | 'app_open';
export type ThemeMode = 'light' | 'dark' | 'system';
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

export type SyncData = {
  user?: { name: string; avatar: string };
  monitors?: Monitor[];
  notes?: Note[];
  reminders?: Reminder[];
  timestamp?: string;
};

export type APIError = {
  error: string;
  code?: string;
  status?: number;
};

export type APIOptions = {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
};

export type AnalyticsEvent = {
  event: string;
  properties?: Record<string, any>;
  deviceInfo?: Record<string, any>;
  sessionId?: string;
};

// Constants
export const NOTE_COLORS = ['#FFFFFF', '#FEF3C7', '#DBEAFE', '#D1FAE5', '#FEE2E2', '#F3E8FF'];
export const NOTE_CATEGORIES: NoteCategory[] = ['Umum', 'Ide', 'Jadwal', 'Belanja', 'Kerja', 'Utang'];
export const MONITOR_CATEGORIES = [
  { key: 'harga' as MonitorCategory, label: 'Harga', icon: 'cash' as const },
  { key: 'berita' as MonitorCategory, label: 'Berita', icon: 'newspaper' as const },
  { key: 'stok' as MonitorCategory, label: 'Stok', icon: 'cube' as const },
  { key: 'jadwal' as MonitorCategory, label: 'Jadwal', icon: 'calendar' as const },
];

export const PREDEFINED_MONITORS: { title: string; cat: MonitorCategory }[] = [
  { title: 'Harga Emas Antam', cat: 'harga' },
  { title: 'Bitcoin / BTC', cat: 'harga' },
  { title: 'Harga BBM', cat: 'harga' },
  { title: 'Harga Beras', cat: 'harga' },
  { title: 'Kurs Dolar Rupiah', cat: 'harga' },
  { title: 'Berita Teknologi', cat: 'berita' },
  { title: 'Berita Politik', cat: 'berita' },
  { title: 'Berita Bola', cat: 'berita' },
  { title: 'Cuaca Hari Ini', cat: 'berita' },
  { title: 'Stok Tiket Konser', cat: 'stok' },
  { title: 'Stok Barang Diskon', cat: 'stok' },
  { title: 'Jadwal Film Bioskop', cat: 'jadwal' },
  { title: 'Jadwal Kereta', cat: 'jadwal' },
];
