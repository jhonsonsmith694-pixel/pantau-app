// Notifications — local notification wrapper (no FCM/Firebase needed).
// Used for price alerts and proactive AI insights.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { logger } from './logger';

let configured = false;

export function configureNotificationHandler(): void {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const res = await Notifications.requestPermissionsAsync();
      status = res.status;
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'PANTAU Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0F766E',
      });
    }
    return status === 'granted';
  } catch (e: any) {
    logger.warn(`Notification permission failed: ${e?.message}`, undefined, 'notifications');
    return false;
  }
}

export async function sendLocalNotification(title: string, body: string, data?: Record<string, any>): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data || {}, sound: true },
      trigger: null, // immediate
    });
  } catch (e: any) {
    logger.warn(`Send notification failed: ${e?.message}`, undefined, 'notifications');
  }
}
