// Theme Service
import { COLORS } from '../config';
import { ThemeMode } from '../types';

export type ThemeColors = typeof COLORS.light;

export function getThemeColors(mode: ThemeMode, systemDark: boolean): ThemeColors {
  const isDark = mode === 'system' ? systemDark : mode === 'dark';
  return isDark ? COLORS.dark : COLORS.light;
}

export function getStatusBarStyle(mode: ThemeMode, systemDark: boolean): 'light' | 'dark' {
  const isDark = mode === 'system' ? systemDark : mode === 'dark';
  return isDark ? 'light' : 'dark';
}
