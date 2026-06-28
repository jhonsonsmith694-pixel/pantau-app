// Security Service — uses expo-secure-store for sensitive data
// Falls back to obfuscated AsyncStorage if SecureStore unavailable
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';
import { sanitize } from '../utils/validation';

let SecureStore: any = null;
try { SecureStore = require('expo-secure-store'); } catch {}

function obfuscate(data: string): string {
  const key = CONFIG.appName;
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  try { return btoa(result); } catch { return ''; }
}

function deobfuscate(encoded: string): string {
  try {
    const key = CONFIG.appName;
    const data = atob(encoded);
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch { return ''; }
}

const PREFIX = `${CONFIG.storagePrefix}secure_`;

class SecurityService {
  async set(key: string, value: string): Promise<void> {
    if (SecureStore?.setItemAsync) {
      try { await SecureStore.setItemAsync(PREFIX + key, value); return; } catch {}
    }
    // Fallback: obfuscated AsyncStorage
    try {
      await AsyncStorage.setItem(PREFIX + key, obfuscate(value));
    } catch {}
  }

  async get(key: string): Promise<string | null> {
    if (SecureStore?.getItemAsync) {
      try { return await SecureStore.getItemAsync(PREFIX + key); } catch {}
    }
    try {
      const raw = await AsyncStorage.getItem(PREFIX + key);
      return raw ? deobfuscate(raw) : null;
    } catch { return null; }
  }

  async remove(key: string): Promise<void> {
    if (SecureStore?.deleteItemAsync) {
      try { await SecureStore.deleteItemAsync(PREFIX + key); return; } catch {}
    }
    try {
      await AsyncStorage.removeItem(PREFIX + key);
    } catch {}
  }

  sanitize(input: string): string { return sanitize(input); }

  sanitizeHTML(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  isValidToken(token: string): boolean {
    return /^[a-zA-Z0-9_-]{16,}$/.test(token);
  }

  isTokenExpired(createdAt: string, ttlMs: number = 7 * 24 * 60 * 60 * 1000): boolean {
    return Date.now() - new Date(createdAt).getTime() > ttlMs;
  }

  generateSessionId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 12)}`;
  }
}

export const security = new SecurityService();
