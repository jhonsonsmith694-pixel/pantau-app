// Base Monitor Interface — all monitors implement this
export type MonitorResult = {
  value: string | number;
  change?: number;        // Percentage or absolute change
  changeType?: 'up' | 'down' | 'stable';
  unit?: string;
  timestamp: string;
  source: string;
  metadata?: Record<string, any>;
};

export type MonitorConfig = {
  id?: string;
  name: string;
  refreshIntervalMs: number;
  enabled: boolean;
  params?: Record<string, any>;
};

export interface IMonitor {
  readonly type: string;
  readonly name: string;
  config: MonitorConfig;
  check(): Promise<MonitorResult>;
  validateConfig(config: MonitorConfig): boolean;
  getCacheKey(): string;
}

// Base class with shared logic
export abstract class BaseMonitor implements IMonitor {
  abstract readonly type: string;
  abstract readonly name: string;
  config: MonitorConfig;
  private lastResult: MonitorResult | null = null;
  private lastCheckAt: number = 0;

  constructor(config: MonitorConfig) {
    this.config = { ...{ refreshIntervalMs: 60000, enabled: true }, ...config };
  }

  abstract check(): Promise<MonitorResult>;

  validateConfig(config: MonitorConfig): boolean {
    return !!config.name;
  }

  getCacheKey(): string {
    return `${this.type}:${this.config.name}`;
  }

  // Check if should refresh
  shouldRefresh(): boolean {
    if (!this.config.enabled) return false;
    return Date.now() - this.lastCheckAt >= this.config.refreshIntervalMs;
  }

  // Check with caching
  async smartCheck(): Promise<MonitorResult> {
    if (this.lastResult && !this.shouldRefresh()) return this.lastResult;
    this.lastResult = await this.check();
    this.lastCheckAt = Date.now();
    return this.lastResult;
  }

  getLastResult(): MonitorResult | null {
    return this.lastResult;
  }

  // Compare with previous result
  hasChanged(current: MonitorResult): boolean {
    if (!this.lastResult) return true;
    return current.value !== this.lastResult.value;
  }
}
