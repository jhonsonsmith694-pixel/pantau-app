// PANTAU Configuration — all config in one place
import Constants from 'expo-constants';

export const CONFIG = {
  appName: 'PANTAU',
  version: '1.0.0',
  buildNumber: Constants.expoConfig?.version || '1.0',
  apiUrl: 'https://pantau-api.dokumenhilang-id.workers.dev',
  apiVersion: 'v2',
  syncInterval: 5 * 60 * 1000,
  retryMaxAttempts: 3,
  requestTimeout: 10000,
  storagePrefix: '@pantau_',
  paginationLimit: 50,
  debounceDelay: 300,
  toastDuration: 3000,
  searchDebounceMs: 400,
  cacheTTL: 5 * 60 * 1000,
  maxSyncRetries: 5,
  analyticsFlushInterval: 30 * 1000,
  backgroundTaskInterval: 15 * 60 * 1000,
  deepLinkScheme: 'pantau',
  quickActions: ['search', 'add_monitor', 'add_note'] as const,
  touchTargetMin: 44,
  textScaleMin: 0.85,
  textScaleMax: 1.3,
} as const;

export const COLORS = {
  light: {
    primary: '#1E40AF',
    primaryLight: '#DBEAFE',
    background: '#F0F2F5',
    surface: '#FFFFFF',
    surfaceSecondary: '#F8F9FA',
    text: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#94A3B8',
    border: '#E2E8F0',
    error: '#DC2626',
    success: '#059669',
    warning: '#D97706',
    info: '#3B82F6',
    cardShadow: 'rgba(0,0,0,0.08)',
    overlay: 'rgba(0,0,0,0.5)',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    gradient: ['#1E40AF', '#3B82F6'],
    highContrast: '#000000',
    link: '#2563EB',
  },
  dark: {
    primary: '#3B82F6',
    primaryLight: '#1E293B',
    background: '#0F172A',
    surface: '#1E293B',
    surfaceSecondary: '#101A34',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    border: '#334155',
    error: '#EF4444',
    success: '#059669',
    warning: '#D97706',
    info: '#3B82F6',
    cardShadow: 'rgba(0,0,0,0.3)',
    overlay: 'rgba(0,0,0,0.7)',
    tabBar: '#1E293B',
    tabBarBorder: '#334155',
    gradient: ['#1E40AF', '#1E3A5F'],
    highContrast: '#FFFFFF',
    link: '#60A5FA',
  },
};

export const FONTS = {
  regular: { fontSize: 14, lineHeight: 20 },
  medium: { fontSize: 15, lineHeight: 22, fontWeight: '500' as const },
  semibold: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  bold: { fontSize: 18, lineHeight: 26, fontWeight: '700' as const },
  h1: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 16 },
  h1Tablet: { fontSize: 34, lineHeight: 40, fontWeight: '800' as const, letterSpacing: -0.5 },
};

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
export const BORDER_RADIUS = { sm: 6, md: 10, lg: 14, xl: 20, full: 9999 };

export const API_PATHS = {
  health: '/api/health',
  version: '/api/version',
  register: '/api/v2/auth/register',
  session: '/api/v2/auth/session',
  user: '/api/v2/users',
  monitors: '/api/v2/monitors',
  monitor: (id: string) => `/api/v2/monitors/${id}`,
  notes: '/api/v2/notes',
  note: (id: string) => `/api/v2/notes/${id}`,
  reminders: '/api/v2/reminders',
  reminder: (id: string) => `/api/v2/reminders/${id}`,
  sync: '/api/v2/sync',
  settings: '/api/v2/settings',
  track: '/api/v2/track',
  events: '/api/v2/events',
  notifications: '/api/v2/notifications',
  aiInsight: '/api/v2/ai/insight',
} as const;

export const ERROR_MESSAGES = {
  network: 'Koneksi internet bermasalah. Coba lagi.',
  timeout: 'Server lambat. Coba lagi.',
  server: 'Server error. Coba lagi nanti.',
  auth: 'Sesi habis. Login ulang.',
  validation: 'Data tidak valid.',
  notFound: 'Data tidak ditemukan.',
  conflict: 'Data sudah ada.',
  offline: 'Mode offline. Data akan sync otomatis.',
  generic: 'Terjadi kesalahan. Coba lagi.',
} as const;

export const SYNC_MESSAGES = {
  syncing: 'Menyimpan data...',
  success: 'Tersimpan!',
  error: 'Gagal sync',
  offline: 'Offline, antri...',
} as const;

export const PROVIDER_URLS = {
  antam: 'https://logam-mulia-api.vercel.app/api/v1/prices',
  coingecko: 'https://api.coingecko.com/api/v3/simple/price',
  nvidiaBase: 'https://integrate.api.nvidia.com/v1',
  openaiBase: 'https://api.openai.com/v1',
  geminiBase: 'https://generativelanguage.googleapis.com/v1beta',
  ollamaBase: 'http://localhost:11434',
} as const;
