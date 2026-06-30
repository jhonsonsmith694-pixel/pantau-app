// Background fetch — periodically checks price alerts even when the app is
// closed. Uses expo-background-fetch + expo-task-manager. Best-effort: Android
// schedules these at its own discretion (~15 min minimum).
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';
import { Monitor } from '../types';
import { checkAlerts } from './alerts';
import { logger } from './logger';

const TASK_NAME = 'pantau-price-alert-check';
const MONITORS_KEY = `${CONFIG.storagePrefix}monitors`;

// Define the task once at module load (required by expo-task-manager).
// Wrapped defensively: a native-module hiccup here must never crash the app.
try {
  if (!TaskManager.isTaskDefined(TASK_NAME)) {
    TaskManager.defineTask(TASK_NAME, async () => {
      try {
        const raw = await AsyncStorage.getItem(MONITORS_KEY);
        const monitors: Monitor[] = raw ? JSON.parse(raw) : [];
        const triggered = await checkAlerts(monitors);
        return triggered.length > 0
          ? BackgroundFetch.BackgroundFetchResult.NewData
          : BackgroundFetch.BackgroundFetchResult.NoData;
      } catch (e: any) {
        logger.warn(`Background task failed: ${e?.message}`, undefined, 'background');
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }
} catch (e: any) {
  logger.warn(`defineTask failed: ${e?.message}`, undefined, 'background');
}

export async function registerBackgroundFetch(): Promise<void> {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
        status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      return;
    }
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(TASK_NAME, {
        minimumInterval: 15 * 60, // 15 minutes (Android minimum)
        stopOnTerminate: false,
        startOnBoot: true,
      });
      logger.info('Background fetch registered', undefined, 'background');
    }
  } catch (e: any) {
    logger.warn(`Background register failed: ${e?.message}`, undefined, 'background');
  }
}

export async function unregisterBackgroundFetch(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
  } catch {}
}
