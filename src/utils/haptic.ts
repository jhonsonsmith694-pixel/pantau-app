// Haptic Feedback — micro-interaction feedback
// Uses React Native HapticFeedback where available
import { Platform } from 'react-native';

let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch {}

export function lightImpact() {
  if (Haptics?.impactAsync) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

export function mediumImpact() {
  if (Haptics?.impactAsync) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }
}

export function heavyImpact() {
  if (Haptics?.impactAsync) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  }
}

export function successNotification() {
  if (Haptics?.notificationAsync) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
}

export function errorNotification() {
  if (Haptics?.notificationAsync) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  }
}

export function selectionChanged() {
  if (Haptics?.selectionAsync) {
    Haptics.selectionAsync().catch(() => {});
  }
}
