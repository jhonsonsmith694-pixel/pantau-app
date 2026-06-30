// API Client — no hardcoded paths, uses API_PATHS from config
import { CONFIG, API_PATHS } from '../config';
import { logger } from '../services/logger';
import { security } from '../services/security';

// Timeout helper (Hermes-safe)
function timeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(id) };
}

type ApiResult<T = any> = {
  success: true; data: T
} | {
  success: false; error: string; code?: string; offline?: boolean
};

class APIClient {
  private baseUrl: string;

  constructor() {
    // Enforce HTTPS in production
    const url = CONFIG.apiUrl;
    if (__DEV__) {
      if (url.startsWith('http://')) {
        console.warn('[PANTAU] API URL uses HTTP! Use HTTPS in production.');
      }
    } else if (!url.startsWith('https://')) {
      console.error('[PANTAU] API URL must use HTTPS in production!');
      throw new Error('Production builds require HTTPS API URL');
    }
    this.baseUrl = url;
  }

  private async request<T>(
    path: string,
    options: RequestInit & { timeout?: number } = {}
  ): Promise<ApiResult<T>> {
    const { signal, clear } = timeoutSignal(options.timeout || CONFIG.requestTimeout);

    try {
      const url = `${this.baseUrl}${path}`;
      logger.debug(`API: ${options.method || 'GET'} ${path}`, undefined, 'api');
      const res = await fetch(url, {
        ...options,
        signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
      clear();
      const data = await res.json();
      if (!res.ok) {
        logger.warn(`API error: ${res.status} ${path}`, { error: data.error }, 'api');
        return { success: false, error: data.error || `HTTP ${res.status}`, code: data.code };
      }
      return { success: true, data };
    } catch (e: any) {
      clear();
      if (e.name === 'AbortError') {
        return { success: false, error: 'Request timeout', offline: true };
      }
      logger.error(`API error: ${path} — ${e.message}`, undefined, 'api');
      return { success: false, error: e.message || 'Network error', offline: true };
    }
  }

  private token: string | null = null;

  setToken(t: string | null) {
    this.token = t;
    if (t) security.saveToken(t).catch(() => {});
    else security.clearToken().catch(() => {});
  }
  getToken(): string | null { return this.token; }

  // Restore a persisted session token (call once on app startup).
  async restoreToken(): Promise<void> {
    try { const t = await security.loadToken(); if (t) this.token = t; } catch {}
  }

  private auth(userId?: string): Record<string, string> {
    const t = this.token || userId;
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  // ===== Health =====
  async health() {
    return this.request<{ status: string }>(API_PATHS.health);
  }

  async version() {
    return this.request<{ version: string }>(API_PATHS.version);
  }

  // Capture token from response and persist it for the next app launch.
  private captureToken(res: ApiResult): ApiResult {
    if (res.success && (res.data as any)?.token) {
      this.token = (res.data as any).token;
      security.saveToken(this.token as string).catch(() => {});
    }
    return res;
  }

  // ===== Auth =====
  async register(userId: string, name: string, avatar: string) {
    const res = await this.request(API_PATHS.register, {
      method: 'POST',
      body: JSON.stringify({ userId, name, avatar }),
    });
    return this.captureToken(res);
  }

  async session(token?: string) {
    const res = await this.request(API_PATHS.session, {
      method: 'POST',
      headers: this.auth(token || undefined),
    });
    return this.captureToken(res);
  }

  // ===== User =====
  async getUser(userId: string) {
    return this.request(API_PATHS.user, { headers: this.auth(userId) });
  }

  async updateUser(userId: string, data: Record<string, any>) {
    return this.request(API_PATHS.user, {
      method: 'PUT',
      headers: this.auth(userId),
      body: JSON.stringify(data),
    });
  }

  async deleteUser(userId: string) {
    return this.request(API_PATHS.user, {
      method: 'DELETE',
      headers: this.auth(userId),
    });
  }

  // ===== Monitors =====
  async getMonitors(userId: string, category?: string) {
    const qs = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request(`${API_PATHS.monitors}${qs}`, { headers: this.auth(userId) });
  }

  async createMonitor(userId: string, data: { title: string; category?: string }) {
    return this.request(API_PATHS.monitors, {
      method: 'POST',
      headers: this.auth(userId),
      body: JSON.stringify(data),
    });
  }

  async updateMonitor(userId: string, id: string, data: Record<string, any>) {
    return this.request(API_PATHS.monitor(id), {
      method: 'PUT',
      headers: this.auth(userId),
      body: JSON.stringify(data),
    });
  }

  async deleteMonitor(userId: string, id: string) {
    return this.request(API_PATHS.monitor(id), {
      method: 'DELETE',
      headers: this.auth(userId),
    });
  }

  // ===== Notes =====
  async getNotes(userId: string, params?: { category?: string; search?: string }) {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.search) qs.set('search', params.search);
    const q = qs.toString();
    return this.request(`${API_PATHS.notes}${q ? `?${q}` : ''}`, { headers: this.auth(userId) });
  }

  async createNote(userId: string, data: { title: string; content: string; category?: string; color?: string }) {
    return this.request(API_PATHS.notes, {
      method: 'POST',
      headers: this.auth(userId),
      body: JSON.stringify(data),
    });
  }

  async updateNote(userId: string, id: string, data: Record<string, any>) {
    return this.request(API_PATHS.note(id), {
      method: 'PUT',
      headers: this.auth(userId),
      body: JSON.stringify(data),
    });
  }

  async deleteNote(userId: string, id: string) {
    return this.request(API_PATHS.note(id), {
      method: 'DELETE',
      headers: this.auth(userId),
    });
  }

  // ===== Reminders =====
  async getReminders(userId: string) {
    return this.request(API_PATHS.reminders, { headers: this.auth(userId) });
  }

  async createReminder(userId: string, data: { title: string; due_at: string }) {
    return this.request(API_PATHS.reminders, {
      method: 'POST',
      headers: this.auth(userId),
      body: JSON.stringify(data),
    });
  }

  // ===== Sync =====
  async sync(userId: string, data: any) {
    return this.request(API_PATHS.sync, {
      method: 'POST',
      headers: this.auth(userId),
      body: JSON.stringify(data),
    });
  }

  // ===== Settings =====
  async getSettings(userId: string) {
    return this.request(API_PATHS.settings, { headers: this.auth(userId) });
  }

  async updateSettings(userId: string, data: Record<string, any>) {
    return this.request(API_PATHS.settings, {
      method: 'PUT',
      headers: this.auth(userId),
      body: JSON.stringify(data),
    });
  }

  // ===== Analytics =====
  async track(event: string, properties?: Record<string, any>, userId?: string) {
    return this.request(API_PATHS.track, {
      method: 'POST',
      body: JSON.stringify({ event, properties, userId }),
    });
  }

  // ===== AI (server-side NVIDIA NIM proxy — no key shipped in the app) =====
  async aiInsight(
    payload: { items: { title: string; value?: string | number | null; change?: number | null }[]; question?: string },
    userId?: string
  ) {
    return this.request<{ insight: string; model: string }>(API_PATHS.aiInsight, {
      method: 'POST',
      headers: this.auth(userId),
      body: JSON.stringify(payload),
      timeout: 30000,
    });
  }

  // Free-form question answered with live web search (Firecrawl) + price data,
  // summarised by NVIDIA NIM. Server-side keys only.
  async aiAsk(
    payload: {
      question: string;
      items?: { title: string; value?: string | number | null; change?: number | null }[];
      web?: boolean;
    },
    userId?: string
  ) {
    return this.request<{ answer: string; sources: { title: string; url: string }[]; model: string; usedWeb: boolean }>(
      API_PATHS.aiAsk,
      {
        method: 'POST',
        headers: this.auth(userId),
        body: JSON.stringify(payload),
        timeout: 45000,
      }
    );
  }

  // ===== Monitor Scrape (Firecrawl) =====
  async monitorScrape(title: string, category: string) {
    return this.request<{ snippet: string | null; source: string | null; url: string | null; updatedAt: string }>(
      API_PATHS.monitorScrape,
      { method: 'POST', headers: this.auth(), body: JSON.stringify({ title, category }), timeout: 15000 }
    );
  }

  // ===== Proactive AI insight (for notifications) =====
  async aiProactive(items: { title: string; value?: string | number | null; change?: number | null }[]) {
    return this.request<{ insight: string | null; provider?: string }>(
      API_PATHS.aiProactive,
      { method: 'POST', headers: this.auth(), body: JSON.stringify({ items }), timeout: 20000 }
    );
  }
}

export const api = new APIClient();
