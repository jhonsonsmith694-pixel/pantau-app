// PANTAU Configuration — all config in one place
import Constants from 'expo-constants';
import { Platform } from 'react-native';

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

// PANTAU palette — warm editorial monochrome + a single considered accent.
// Deliberately avoids the blue/purple "AI gradient" fingerprint. Accent is a
// warm amber/clay that ties to the flagship "harga emas" monitor. Price up/down
// use muted green/brick so data reads clearly against the brand accent.
export const COLORS = {
  light: {
    primary: '#B45309',        // warm amber/clay — the single brand accent
    primaryLight: '#F4E6D6',   // soft accent tint for icon/badge backgrounds
    accent: '#B45309',
    accentSoft: '#F4E6D6',
    background: '#F4F1EA',      // warm bone canvas
    surface: '#FFFFFF',
    surfaceSecondary: '#FAF7F0',
    text: '#1C1A16',           // warm near-black ink (never pure #000)
    textSecondary: '#5B574D',  // warm gray
    textTertiary: '#8C8678',
    border: '#E7E1D5',         // warm hairline
    error: '#B23B2E',
    success: '#2F7D5B',
    warning: '#B7791F',
    info: '#5B574D',
    priceUp: '#2F7D5B',        // muted green — value gained
    priceDown: '#B23B2E',      // muted brick — value lost
    cardShadow: 'rgba(64,48,24,0.06)',  // tinted, not pure black
    overlay: 'rgba(28,26,22,0.45)',
    tabBar: 'rgba(255,255,255,0.92)',
    tabBarBorder: '#E7E1D5',
    gradient: ['#B45309', '#8A4218'],   // warm tonal, used sparingly
    highContrast: '#1C1A16',
    link: '#B45309',
  },
  dark: {
    primary: '#E0934E',        // brighter warm amber for dark surfaces
    primaryLight: '#2A2018',
    accent: '#E0934E',
    accentSoft: '#2A2018',
    background: '#161410',     // warm charcoal (tinted, not pure black)
    surface: '#211E18',
    surfaceSecondary: '#1B1914',
    text: '#F2EEE5',           // warm off-white
    textSecondary: '#A89F8D',
    textTertiary: '#736C5C',
    border: '#322E26',
    error: '#D2685B',
    success: '#4FA37A',
    warning: '#D6A23E',
    info: '#A89F8D',
    priceUp: '#4FA37A',
    priceDown: '#D2685B',
    cardShadow: 'rgba(0,0,0,0.4)',
    overlay: 'rgba(0,0,0,0.65)',
    tabBar: 'rgba(33,30,24,0.92)',
    tabBarBorder: '#322E26',
    gradient: ['#2A2620', '#161410'],
    highContrast: '#FFFFFF',
    link: '#E0934E',
  },
};

// Monospace family for prices/figures so digits line up (tabular feel even
// where fontVariant is unsupported). Hermes/RN-safe system fonts.
export const MONO_FONT = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string;

// Apply to any <Text> showing numbers in a data-dense context.
export const TABULAR = { fontVariant: ['tabular-nums' as const] };

export const FONTS = {
  regular: { fontSize: 15, lineHeight: 22 },
  medium: { fontSize: 15, lineHeight: 22, fontWeight: '500' as const },
  semibold: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  bold: { fontSize: 18, lineHeight: 26, fontWeight: '700' as const },
  // Display headers: heavier presence, tighter tracking (redesign skill).
  display: { fontSize: 34, lineHeight: 38, fontWeight: '800' as const, letterSpacing: -1 },
  h1: { fontSize: 28, lineHeight: 33, fontWeight: '800' as const, letterSpacing: -0.6 },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 17, lineHeight: 24, fontWeight: '600' as const, letterSpacing: -0.2 },
  // Eyebrow/label: small caps with positive tracking.
  eyebrow: { fontSize: 11, lineHeight: 14, fontWeight: '600' as const, letterSpacing: 1.4, textTransform: 'uppercase' as const },
  caption: { fontSize: 12, lineHeight: 16 },
  // Numeric: monospace + tabular figures for prices.
  numeric: { fontFamily: MONO_FONT, fontVariant: ['tabular-nums' as const] },
  h1Tablet: { fontSize: 40, lineHeight: 46, fontWeight: '800' as const, letterSpacing: -1 },
};

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
// Varied radii (redesign skill): tighter inner, softer containers.
export const BORDER_RADIUS = { sm: 8, md: 12, lg: 16, xl: 22, xxl: 28, full: 9999 };

// Motion tokens — spring/timing presets shared by entry + press animations.
export const MOTION = {
  // Heavy, premium easing (high-end-visual-design skill).
  easing: [0.32, 0.72, 0, 1] as const,
  pressScale: 0.97,
  durationFast: 180,
  durationBase: 320,
  durationSlow: 520,
  staggerStep: 70,   // ms delay between cascading list items
  entryOffset: 16,   // px translateY for fade-up entry
};

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
  syncing: 'Menyimpan data',
  success: 'Tersimpan',
  error: 'Gagal sync',
  offline: 'Offline, menunggu koneksi',
} as const;

export const PROVIDER_URLS = {
  antam: 'https://logam-mulia-api.vercel.app/api/v1/prices',
  coingecko: 'https://api.coingecko.com/api/v3/simple/price',
  nvidiaBase: 'https://integrate.api.nvidia.com/v1',
  openaiBase: 'https://api.openai.com/v1',
  geminiBase: 'https://generativelanguage.googleapis.com/v1beta',
  ollamaBase: 'http://localhost:11434',
} as const;
