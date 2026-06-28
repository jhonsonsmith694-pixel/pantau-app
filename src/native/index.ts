// Android Native Integrations — all modular, all optional
// Each module is a standalone interface that can be filled in with native modules
import { logger } from '../services/logger';

// ===== Camera =====
export type CameraResult = {
  uri: string;
  width: number;
  height: number;
  type: 'image' | 'video';
};

export const cameraModule = {
  async takePhoto(): Promise<CameraResult | null> {
    logger.warn('Camera module not implemented — install expo-camera');
    return null;
  },

  async pickFromGallery(): Promise<CameraResult | null> {
    logger.warn('Image picker not implemented — install expo-image-picker');
    return null;
  },
};

// ===== Location =====
export type LocationResult = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
};

export const locationModule = {
  async getCurrentPosition(): Promise<LocationResult | null> {
    logger.warn('Location module not implemented — install expo-location');
    return null;
  },

  async requestPermission(): Promise<boolean> {
    logger.warn('Location permission not implemented');
    return false;
  },
};

// ===== Biometric =====
export const biometricModule = {
  async authenticate(reason: string = 'Verifikasi identitas'): Promise<boolean> {
    logger.warn('Biometric module not implemented — install expo-local-authentication');
    return false;
  },

  async isAvailable(): Promise<boolean> {
    return false;
  },
};

// ===== File Picker =====
export const filePickerModule = {
  async pickFile(types: string[] = ['*/*']): Promise<{ uri: string; name: string; size: number } | null> {
    logger.warn('File picker not implemented — install expo-document-picker');
    return null;
  },
};

// ===== Background Task =====
export const backgroundModule = {
  async registerTask(name: string, intervalMs: number = 15 * 60 * 1000): Promise<void> {
    logger.warn('Background task not implemented — install expo-task-manager');
  },

  async unregisterTask(name: string): Promise<void> {
    logger.warn('Background task unregister not implemented');
  },
};

// ===== Share Intent =====
export const shareIntentModule = {
  async getSharedData(): Promise<{ text?: string; uri?: string; type?: string } | null> {
    logger.warn('Share intent not implemented');
    return null;
  },

  async clearSharedData(): Promise<void> {},
};

// ===== Deep Link =====
export const deepLinkModule = {
  parseUrl(url: string): { route: string; params: Record<string, string> } | null {
    try {
      const u = new URL(url);
      const path = u.pathname.replace(/^\/+/, '') || 'home';
      const params: Record<string, string> = {};
      u.searchParams.forEach((v, k) => { params[k] = v; });
      return { route: path, params };
    } catch {
      return null;
    }
  },
};

// ===== Widget (structure) =====
export const widgetModule = {
  async updateWidget(data: Record<string, any>): Promise<void> {
    logger.warn('Widget not implemented');
  },

  async getWidgetData(): Promise<Record<string, any> | null> {
    return null;
  },
};

// ===== Quick Actions =====
export type QuickActionType = 'search' | 'add_monitor' | 'add_note';

export const quickActionsModule = {
  async setQuickActions(_actions: { type: QuickActionType; title: string; icon?: string }[]): Promise<void> {
    logger.warn('Quick actions not implemented');
  },

  async handleAction(action: QuickActionType): Promise<void> {
    logger.info(`Quick action: ${action}`, undefined, 'native');
  },
};
