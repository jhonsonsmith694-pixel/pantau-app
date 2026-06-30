// Price history — stores recent price points per monitor for charting.
// Lightweight: keeps last 60 points per monitor in AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';
import { PricePoint } from '../types';

const KEY_PREFIX = `${CONFIG.storagePrefix}pricehist_`;
const MAX_POINTS = 60;

function keyFor(monitorKey: string): string {
  return KEY_PREFIX + monitorKey.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 60);
}

export async function recordPrice(monitorKey: string, value: number): Promise<void> {
  if (!value || value <= 0) return;
  try {
    const k = keyFor(monitorKey);
    const raw = await AsyncStorage.getItem(k);
    const points: PricePoint[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    // Throttle: only record if last point is >30 min old (avoid spamming)
    const last = points[points.length - 1];
    if (last && now - last.t < 30 * 60 * 1000) {
      // update last point's value instead
      points[points.length - 1] = { t: now, v: value };
    } else {
      points.push({ t: now, v: value });
    }
    const trimmed = points.slice(-MAX_POINTS);
    await AsyncStorage.setItem(k, JSON.stringify(trimmed));
  } catch {}
}

export async function getPriceHistory(monitorKey: string): Promise<PricePoint[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(monitorKey));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearPriceHistory(monitorKey: string): Promise<void> {
  try { await AsyncStorage.removeItem(keyFor(monitorKey)); } catch {}
}
