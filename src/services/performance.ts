// Performance Service — measure and track app performance
import { logger } from './logger';

type MetricType = 'render' | 'api' | 'storage' | 'sync' | 'navigation' | 'other';

type Metric = {
  name: string;
  type: MetricType;
  durationMs: number;
  timestamp: string;
  data?: Record<string, any>;
};

class PerformanceService {
  private marks: Map<string, number> = new Map();
  private metrics: Metric[] = [];
  private maxMetrics: number = 500;
  private enabled: boolean = true;

  setEnabled(v: boolean) { this.enabled = v; }

  // Start a measurement
  start(name: string): void {
    if (!this.enabled) return;
    this.marks.set(name, performance.now());
  }

  // End measurement and record
  end(name: string, type: MetricType = 'other', data?: Record<string, any>): number {
    if (!this.enabled) return 0;
    const start = this.marks.get(name);
    if (!start) {
      logger.warn(`Performance: no start mark for "${name}"`);
      return 0;
    }
    const duration = performance.now() - start;
    this.marks.delete(name);
    const metric: Metric = {
      name,
      type,
      durationMs: Math.round(duration * 100) / 100,
      timestamp: new Date().toISOString(),
      data,
    };
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) this.metrics.shift();
    if (duration > 1000) logger.warn(`Performance: ${name} took ${metric.durationMs}ms`, data, 'perf');
    return duration;
  }

  // Measure an async function
  async measure<T>(name: string, type: MetricType, fn: () => Promise<T>, data?: Record<string, any>): Promise<T> {
    this.start(name);
    try {
      return await fn();
    } finally {
      this.end(name, type, data);
    }
  }

  // Track render timing
  trackRender(componentName: string, durationMs: number) {
    if (durationMs > 16) { // 60fps threshold
      logger.warn(`Slow render: ${componentName} took ${durationMs}ms`, undefined, 'perf');
    }
  }

  getMetrics(type?: MetricType): Metric[] {
    return type ? this.metrics.filter(m => m.type === type) : [...this.metrics];
  }

  getAverageDuration(type: MetricType): number {
    const filtered = this.metrics.filter(m => m.type === type);
    if (filtered.length === 0) return 0;
    return filtered.reduce((sum, m) => sum + m.durationMs, 0) / filtered.length;
  }

  clear() { this.metrics = []; this.marks.clear(); }

  // Bundle size estimate (placeholder)
  getBundleInfo() {
    return {
      platform: 'android',
      estimatedSize: '~8MB',
      modules: '~200',
    };
  }
}

export const perf = new PerformanceService();
