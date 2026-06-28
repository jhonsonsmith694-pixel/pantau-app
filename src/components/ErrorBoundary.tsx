// Error Boundary — catches render errors, shows friendly fallback
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../config';

interface Props {
  children: ReactNode;
  colors?: any;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to analytics/crash service
    try {
      const { logger } = require('../services/logger');
      logger.error('React crash', { error: error.message, stack: error.stack?.slice(0, 500) }, 'ErrorBoundary');
    } catch {}
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isDark = false; // Will be overridden by theme
      const colors = COLORS.light;

      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.error + '20' }]}>
            <Ionicons name="alert-circle" size={48} color={colors.error} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Aplikasi Mengalami Error</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Maaf, terjadi kesalahan yang tidak terduga. Tim kami sudah diberitahu.
          </Text>
          {__DEV__ && this.state.error && (
            <View style={[styles.debugBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <Text style={[styles.debugText, { color: colors.error }]}>{this.state.error.message}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={this.handleReload}
            style={[styles.button, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Reload Aplikasi</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  debugBox: {
    width: '100%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.xl,
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: BORDER_RADIUS.lg,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
