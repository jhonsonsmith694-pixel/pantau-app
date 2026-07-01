// Custom Hooks — useSearch, useMonitor, useNote, useAccessibility
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState, AppStateStatus, AccessibilityInfo, PixelRatio, Dimensions, ScaledSize,
} from 'react-native';
import { COLORS, CONFIG, SPACING } from '../config';
import { ThemeMode, Monitor, Note } from '../types';
import { searchEngine, SearchResult, SearchableEntity } from '../services/search';
import { useApp } from './useApp';

export { useApp } from './useApp';

// ===== useI18n — translation bound to the active language (re-renders on change) =====
import { t as translate } from '../services/i18n';
export function useI18n() {
  const { language } = useApp();
  // language dependency ensures consumers re-render when it changes
  return { t: (key: string) => translate(key), language };
}

// ===== useTheme =====
export function useTheme() {
  const { themeMode, colorScheme } = useApp();
  const isDark = useMemo(() => {
    if (themeMode === 'system') return colorScheme === 'dark';
    return themeMode === 'dark';
  }, [themeMode, colorScheme]);
  const colors = useMemo(() => (isDark ? COLORS.dark : COLORS.light), [isDark]);
  return { isDark, colors, themeMode };
}

// ===== useDebounce =====
export function useDebounce<T>(value: T, delay: number = CONFIG.debounceDelay): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ===== useNetwork =====
export function useNetwork() {
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    const handler = () => setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handler);
      window.addEventListener('offline', handler);
      return () => {
        window.removeEventListener('online', handler);
        window.removeEventListener('offline', handler);
      };
    }
  }, []);
  return isOnline;
}

// ===== useAppState =====
export function useAppState() {
  const [state, setState] = useState<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', setState);
    return () => sub.remove();
  }, []);
  return state;
}

// ===== useRefresh =====
export function useRefresh(refreshFn: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refreshFn(); } catch {}
    finally { setRefreshing(false); }
  }, [refreshFn]);
  return { refreshing, onRefresh };
}

// ===== useSearch — Global Search =====
export function useSearch(types: SearchableEntity[] = ['all']) {
  const { monitors, notes } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [category, setCategory] = useState<string>('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debouncedQuery = useDebounce(query, CONFIG.searchDebounceMs);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }
    const all = searchEngine.search(debouncedQuery, { monitors, notes }, types);
    const filtered = searchEngine.filterByCategory(all, category);
    setResults(filtered);
  }, [debouncedQuery, monitors, notes, types, category]);

  const search = useCallback((q: string) => {
    setQuery(q);
    if (q.trim()) searchEngine.addRecentSearch(q);
    setRecentSearches(searchEngine.getRecentSearches());
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  const clearRecent = useCallback(() => {
    searchEngine.clearRecentSearches();
    setRecentSearches([]);
  }, []);

  return {
    query, setQuery: search, results, clearSearch,
    category, setCategory, recentSearches, clearRecent,
  };
}

// ===== useMonitor =====
export function useMonitor() {
  const { monitors, addMonitor, editMonitor, toggleMonitor, deleteMonitor } = useApp();
  const activeMonitors = useMemo(() => monitors.filter(m => m.active), [monitors]);
  const byCategory = useMemo(() => {
    const map: Record<string, Monitor[]> = {};
    for (const m of monitors) {
      if (!map[m.category]) map[m.category] = [];
      map[m.category].push(m);
    }
    return map;
  }, [monitors]);

  return { monitors, activeMonitors, byCategory, addMonitor, editMonitor, toggleMonitor, deleteMonitor };
}

// ===== useNote =====
export function useNote() {
  const { notes, addNote, editNote, deleteNote, togglePin } = useApp();
  const pinnedNotes = useMemo(() => notes.filter(n => n.pinned), [notes]);
  const byCategory = useMemo(() => {
    const map: Record<string, Note[]> = {};
    for (const n of notes) {
      if (!map[n.category]) map[n.category] = [];
      map[n.category].push(n);
    }
    return map;
  }, [notes]);

  return { notes, pinnedNotes, byCategory, addNote, editNote, deleteNote, togglePin };
}

// ===== useAccessibility =====
export function useAccessibility() {
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    // Check screen reader
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReaderEnabled);
    const srSub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReaderEnabled);

    // Check font scale
    const updateScale = () => setFontScale(PixelRatio.getFontScale());
    updateScale();
    // No listener for font scale changes, periodic check instead

    // Check tablet
    const updateLayout = () => {
      const { width } = Dimensions.get('window');
      setIsTablet(width >= 768);
    };
    updateLayout();
    const dimSub = Dimensions.addEventListener('change', updateLayout);

    return () => {
      srSub.remove();
      dimSub.remove();
    };
  }, []);

  const scaledSpacing = useMemo(() => {
    const scale = Math.min(Math.max(fontScale, CONFIG.textScaleMin), CONFIG.textScaleMax);
    return {
      xs: SPACING.xs * scale,
      sm: SPACING.sm * scale,
      md: SPACING.md * scale,
      lg: SPACING.lg * scale,
      xl: SPACING.xl * scale,
      xxl: SPACING.xxl * scale,
      xxxl: SPACING.xxxl * scale,
    };
  }, [fontScale]);

  return {
    screenReaderEnabled,
    fontScale,
    isTablet,
    isSmallDevice: !isTablet && Dimensions.get('window').width < 360,
    scaledSpacing,
    highContrast: !screenReaderEnabled, // simplified
  };
}
