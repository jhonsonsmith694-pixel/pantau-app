// Reusable UI Components
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Animated, Platform, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, MOTION } from '../config';
import { ThemeColors } from '../services/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// --- Button ---
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  colors: ThemeColors;
}
export const Button = React.memo(function Button({ title, onPress, variant = 'primary', size = 'md', icon, loading, disabled, colors }: ButtonProps) {
  const bg = useMemo(() => {
    if (disabled) return colors.border;
    switch (variant) {
      case 'primary': return colors.primary;
      case 'secondary': return colors.surface;
      case 'danger': return colors.error;
      default: return 'transparent';
    }
  }, [variant, disabled, colors]);
  const txt = useMemo(() => {
    if (disabled) return colors.textTertiary;
    switch (variant) {
      case 'primary': return '#FFFFFF';
      case 'secondary': return colors.text;
      case 'danger': return '#FFFFFF';
      default: return colors.primary;
    }
  }, [variant, disabled, colors]);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor: variant === 'secondary' ? colors.border : 'transparent', borderWidth: variant === 'secondary' ? 1 : 0 },
        size === 'sm' ? styles.btnSm : size === 'lg' ? styles.btnLg : styles.btnMd,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={txt} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={txt} style={{ marginRight: 6 }} />}
          <Text style={[styles.btnText, { color: txt }, size === 'sm' && { fontSize: 13 }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
});

// --- Card ---
interface CardProps {
  children: React.ReactNode;
  colors: ThemeColors;
  style?: any;
  onPress?: () => void;
  onLongPress?: () => void;
}
export const Card = React.memo(function Card({ children, colors, style, onPress, onLongPress }: CardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  if (!onPress && !onLongPress) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
        {children}
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.85}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
});

// --- Empty State ---
interface EmptyStateProps {
  icon: IconName;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
  colors: ThemeColors;
}
export const EmptyState = React.memo(function EmptyState({ icon, title, description, action, colors }: EmptyStateProps) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {description && <Text style={[styles.emptyDesc, { color: colors.textTertiary }]}>{description}</Text>}
      {action && (
        <TouchableOpacity onPress={action.onPress} style={[styles.emptyBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.emptyBtnText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// --- Skeleton ---
interface SkeletonProps {
  lines?: number;
  colors: ThemeColors;
}
export const Skeleton = React.memo(function Skeleton({ lines = 3, colors }: SkeletonProps) {
  return (
    <View style={{ padding: SPACING.lg }}>
      {Array.from({ length: lines }).map((_, i) => (
        <View key={i} style={[styles.skeleton, { backgroundColor: colors.border, width: i === lines - 1 ? '60%' : '100%', marginBottom: SPACING.sm }]} />
      ))}
    </View>
  );
});

// --- Error State ---
interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  colors: ThemeColors;
}
export const ErrorState = React.memo(function ErrorState({ message = 'Terjadi kesalahan', onRetry, colors }: ErrorStateProps) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: '#FEE2E2' }]}>
        <Ionicons name="alert-circle" size={36} color={colors.error} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Gagal memuat</Text>
      <Text style={[styles.emptyDesc, { color: colors.textTertiary }]}>{message}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={[styles.emptyBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.emptyBtnText}>Coba lagi</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// --- Toast (simple inline) ---
interface ToastProps {
  visible: boolean;
  message: string;
  icon?: IconName;
  type?: 'success' | 'error' | 'info';
  colors: ThemeColors;
}
export const Toast = React.memo(function Toast({ visible, message, icon, type = 'info', colors }: ToastProps) {
  if (!visible) return null;
  const bg = type === 'success' ? colors.success : type === 'error' ? colors.error : colors.primary;
  return (
    <View style={[styles.toast, { backgroundColor: bg }]}>
      {icon && <Ionicons name={icon} size={18} color="#FFF" style={{ marginRight: 8 }} />}
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
});

// --- Confirm Dialog ---
interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  colors: ThemeColors;
}
export const ConfirmDialog = React.memo(function ConfirmDialog({ visible, title, message, confirmLabel = 'Hapus', cancelLabel = 'Batal', onConfirm, onCancel, destructive, colors }: ConfirmDialogProps) {
  if (!visible) return null;
  return (
    <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
      <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
        <Text style={[styles.dialogTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.dialogMessage, { color: colors.textSecondary }]}>{message}</Text>
        <View style={styles.dialogBtns}>
          <TouchableOpacity onPress={onCancel} style={[styles.dialogBtn, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.dialogBtnText, { color: colors.text }]}>{cancelLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onConfirm} style={[styles.dialogBtn, { backgroundColor: destructive ? colors.error : colors.primary }]}>
            <Text style={[styles.dialogBtnText, { color: '#FFFFFF' }]}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

// --- Category Badge ---
interface BadgeProps {
  label: string;
  color: string;
  colors: ThemeColors;
}
export const Badge = React.memo(function Badge({ label, color, colors }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
});

// --- Pull to Refresh wrapper ---
interface PullRefreshProps {
  refreshing: boolean;
  onRefresh: () => void;
  colors: ThemeColors;
  children: React.ReactNode;
}
export const PullRefresh = React.memo(function PullRefresh({ refreshing, onRefresh, colors, children }: PullRefreshProps) {
  return (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface}>
      {children}
    </RefreshControl>
  );
});

// --- Card Skeleton ---
// Matches the monitor card shape: icon circle on left, two text lines, right icon area.
// Uses pulsing opacity animation for loading state.
interface CardSkeletonProps {
  colors: ThemeColors;
}
export const CardSkeleton = React.memo(function CardSkeleton({ colors }: CardSkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.cardSkeleton, { backgroundColor: colors.surface, borderColor: colors.border, opacity }]}>
      {/* Icon circle */}
      <View style={[styles.cardSkeletonIcon, { backgroundColor: colors.border }]} />
      {/* Text lines */}
      <View style={{ flex: 1, marginLeft: SPACING.md }}>
        <View style={[styles.cardSkeletonLine, { backgroundColor: colors.border, width: '60%' }]} />
        <View style={[styles.cardSkeletonLine, { backgroundColor: colors.border, width: '40%', marginTop: SPACING.sm }]} />
      </View>
      {/* Right icon placeholder */}
      <View style={[styles.cardSkeletonRightIcon, { backgroundColor: colors.border }]} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: BORDER_RADIUS.md },
  btnSm: { paddingVertical: 6, paddingHorizontal: 12 },
  btnMd: { paddingVertical: 10, paddingHorizontal: 20 },
  btnLg: { paddingVertical: 14, paddingHorizontal: 28 },
  btnText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  card: { borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, borderWidth: 1, marginBottom: SPACING.sm },
  empty: { alignItems: 'center', justifyContent: 'center', padding: SPACING.xxl, minHeight: 200 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  emptyTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', marginBottom: SPACING.sm },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.xl, fontFamily: 'Outfit_400Regular' },
  emptyBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: BORDER_RADIUS.md },
  emptyBtnText: { color: '#FFFFFF', fontFamily: 'Outfit_600SemiBold', fontSize: 14 },
  skeleton: { height: 14, borderRadius: 7 },
  toast: { position: 'absolute', bottom: 100, left: SPACING.lg, right: SPACING.lg, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  toastText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  dialog: { width: 300, borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  dialogTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', marginBottom: SPACING.sm },
  dialogMessage: { fontSize: 14, lineHeight: 20, marginBottom: SPACING.xl, fontFamily: 'Outfit_400Regular' },
  dialogBtns: { flexDirection: 'row', gap: SPACING.sm },
  dialogBtn: { flex: 1, paddingVertical: 10, borderRadius: BORDER_RADIUS.md, alignItems: 'center' },
  dialogBtnText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BORDER_RADIUS.full },
  badgeText: { fontSize: 11, fontFamily: 'Outfit_600SemiBold' },
  cardSkeleton: { flexDirection: 'row', alignItems: 'center', borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, borderWidth: 1, marginBottom: SPACING.sm },
  cardSkeletonIcon: { width: 38, height: 38, borderRadius: BORDER_RADIUS.md },
  cardSkeletonLine: { height: 14, borderRadius: 7 },
  cardSkeletonRightIcon: { width: 24, height: 24, borderRadius: 12, marginLeft: SPACING.sm },
});
