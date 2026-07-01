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

// PANTAU palette — neutral Zinc base + a single restrained teal accent.
// Follows the taste skills (gpt-taste / stitch-design-taste): absolute neutral
// bases, one accent under 80% saturation, never pure black, no blue/purple AI
// neon. Price up/down keep functional green/red, distinct from the teal brand.
export const COLORS = {
  light: {
    primary: '#0F766E',        // teal-700 — single brand accent
    primaryLight: '#CCFBF1',   // teal-100 tint for icon/badge backgrounds
    accent: '#0F766E',
    accentSoft: '#CCFBF1',
    background: '#F7F7F8',      // neutral zinc canvas
    surface: '#FFFFFF',
    surfaceSecondary: '#F1F1F2',
    text: '#18181B',           // zinc-900 ink (never pure black)
    textSecondary: '#52525B',  // zinc-600
    textTertiary: '#A1A1AA',   // zinc-400
    border: '#E4E4E7',         // zinc-200 hairline
    error: '#DC2626',
    success: '#16A34A',
    warning: '#CA8A04',
    info: '#52525B',
    priceUp: '#16A34A',        // leaf green — gained
    priceDown: '#DC2626',      // red — lost
    cardShadow: 'rgba(24,24,27,0.06)',
    overlay: 'rgba(24,24,27,0.45)',
    tabBar: 'rgba(255,255,255,0.94)',
    tabBarBorder: '#E4E4E7',
    gradient: ['#134E4A', '#0F766E'],   // teal tonal — distinctive, not AI-blue
    highContrast: '#18181B',
    link: '#0F766E',
  },
  dark: {
    primary: '#2DD4BF',        // teal-400 brighter for dark surfaces
    primaryLight: '#134E4A',
    accent: '#2DD4BF',
    accentSoft: '#134E4A',
    background: '#0A0A0B',      // zinc-950 off-black (not pure)
    surface: '#18181B',
    surfaceSecondary: '#131316',
    text: '#FAFAFA',
    textSecondary: '#A1A1AA',
    textTertiary: '#71717A',
    border: '#27272A',
    error: '#F87171',
    success: '#34D399',
    warning: '#D6A23E',
    info: '#A1A1AA',
    priceUp: '#34D399',
    priceDown: '#F87171',
    cardShadow: 'rgba(0,0,0,0.4)',
    overlay: 'rgba(0,0,0,0.65)',
    tabBar: 'rgba(24,24,27,0.94)',
    tabBarBorder: '#27272A',
    gradient: ['#134E4A', '#0A0A0B'],
    highContrast: '#FFFFFF',
    link: '#2DD4BF',
  },
};

// Premium type system (taste skills ban Inter/system fonts). Outfit for UI/
// display, JetBrains Mono for numbers/metadata. Loaded in app/_layout.tsx.
export const FONT_FAMILY = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
  extrabold: 'Outfit_800ExtraBold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
};

export const MONO_FONT = FONT_FAMILY.monoMedium;
// Tabular figures for digits; pair with the mono family for data-dense numbers.
export const TABULAR = { fontFamily: FONT_FAMILY.monoMedium, fontVariant: ['tabular-nums' as const] };

export const FONTS = {
  regular: { fontFamily: FONT_FAMILY.regular, fontSize: 15, lineHeight: 22 },
  medium: { fontFamily: FONT_FAMILY.medium, fontSize: 15, lineHeight: 22 },
  semibold: { fontFamily: FONT_FAMILY.semibold, fontSize: 16, lineHeight: 24 },
  bold: { fontFamily: FONT_FAMILY.bold, fontSize: 18, lineHeight: 26 },
  // Display headers: weight-driven hierarchy, track-tight (not screaming size).
  display: { fontFamily: FONT_FAMILY.extrabold, fontSize: 32, lineHeight: 37, letterSpacing: -1 },
  h1: { fontFamily: FONT_FAMILY.bold, fontSize: 26, lineHeight: 31, letterSpacing: -0.6 },
  h2: { fontFamily: FONT_FAMILY.semibold, fontSize: 21, lineHeight: 27, letterSpacing: -0.3 },
  h3: { fontFamily: FONT_FAMILY.semibold, fontSize: 17, lineHeight: 23, letterSpacing: -0.2 },
  // Eyebrow/label: small caps, positive tracking.
  eyebrow: { fontFamily: FONT_FAMILY.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 1.6, textTransform: 'uppercase' as const },
  caption: { fontFamily: FONT_FAMILY.regular, fontSize: 12, lineHeight: 16 },
  numeric: { fontFamily: FONT_FAMILY.monoMedium, fontVariant: ['tabular-nums' as const] },
  h1Tablet: { fontFamily: FONT_FAMILY.extrabold, fontSize: 38, lineHeight: 44, letterSpacing: -1 },
};

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
// Varied radii (redesign skill): tighter inner, softer containers.
export const BORDER_RADIUS = { sm: 8, md: 12, lg: 16, xl: 22, xxl: 28, full: 9999 };

// Motion tokens — spring/timing presets shared by entry + press animations.
export const MOTION = {
  easing: [0.32, 0.72, 0, 1] as const,
  pressScale: 0.97,
  durationFast: 180,
  durationBase: 320,
  durationSlow: 520,
  staggerStep: 70,
  entryOffset: 16,
};

// Premium elevation system — tinted shadows (not pure black) for depth.
// Each level pairs an iOS shadow with an Android elevation.
export const ELEVATION = {
  sm: {
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  md: {
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 14, elevation: 5,
  },
  lg: {
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 28, elevation: 10,
  },
  glow: {
    shadowColor: '#0F766E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.30, shadowRadius: 20, elevation: 8,
  },
};

// Premium multi-stop gradient meshes for hero surfaces (teal tonal family).
export const GRADIENTS = {
  hero: ['#0D9488', '#0F766E', '#134E4A'] as const,
  heroDark: ['#0F766E', '#134E4A', '#0A0A0B'] as const,
  emerald: ['#10B981', '#0D9488'] as const,
  sunset: ['#0F766E', '#0E7490'] as const,
  card: ['#FFFFFF', '#F7F7F8'] as const,
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
  aiAsk: '/api/v2/ai/ask',
  aiProactive: '/api/v2/ai/proactive',
  monitorScrape: '/api/v2/monitors/scrape',
  firecrawlScrape: '/api/v2/firecrawl/scrape',
  firecrawlExtract: '/api/v2/firecrawl/extract',
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
