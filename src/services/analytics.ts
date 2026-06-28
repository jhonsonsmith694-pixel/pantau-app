// Analytics Service
import { api } from '../api/client';
import { AnalyticsEvent } from '../types';

class AnalyticsService {
  private sessionId: string;
  private enabled: boolean = true;

  constructor() {
    this.sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  setEnabled(v: boolean) { this.enabled = v; }

  async track(event: string, properties?: Record<string, any>, userId?: string) {
    if (!this.enabled) return;
    const payload: AnalyticsEvent = {
      event,
      properties,
      deviceInfo: { platform: 'android', appVersion: '1.0.0' },
      sessionId: this.sessionId,
    };
    // Fire and forget — don't block UI
    api.track(event, properties, userId).catch(() => {});
  }

  // Common events
  appOpen(userId?: string) { this.track('app_open', {}, userId); }
  monitorCreated(userId?: string) { this.track('monitor_created', {}, userId); }
  monitorDeleted(userId?: string) { this.track('monitor_deleted', {}, userId); }
  noteCreated(userId?: string) { this.track('note_created', {}, userId); }
  noteDeleted(userId?: string) { this.track('note_deleted', {}, userId); }
  syncStarted(userId?: string) { this.track('sync_started', {}, userId); }
  syncFinished(userId?: string) { this.track('sync_finished', {}, userId); }
  syncFailed(userId?: string) { this.track('sync_failed', {}, userId); }
  notificationClicked(userId?: string) { this.track('notification_clicked', {}, userId); }
}

export const analytics = new AnalyticsService();
