// Price Monitor — generic price tracking
import { BaseMonitor, MonitorConfig, MonitorResult } from './base';
import { PROVIDER_URLS } from '../../config';

export class PriceMonitor extends BaseMonitor {
  readonly type: string = 'price';
  readonly name: string = 'Price Monitor';
  private fetchFn: (() => Promise<{ price: number; currency: string }>) | null = null;

  constructor(config: MonitorConfig & { fetcher?: () => Promise<{ price: number; currency: string }> }) {
    super(config);
    this.fetchFn = config.fetcher || null;
  }

  setFetcher(fn: () => Promise<{ price: number; currency: string }>) {
    this.fetchFn = fn;
  }

  async check(): Promise<MonitorResult> {
    if (!this.fetchFn) {
      return {
        value: 0,
        timestamp: new Date().toISOString(),
        source: 'mock',
        metadata: { note: 'No fetcher configured' },
      };
    }
    const data = await this.fetchFn();
    return {
      value: data.price,
      unit: data.currency,
      timestamp: new Date().toISOString(),
      source: this.config.name,
    };
  }
}

// Gold Monitor
export class GoldMonitor extends PriceMonitor {
  readonly type = 'gold' as const;
  readonly name = 'Gold Monitor (Antam)';

  constructor(config: MonitorConfig) {
    super(config);
    this.setFetcher(async () => {
      try {
        const res = await fetch(PROVIDER_URLS.antam);
        const data = await res.json();
        return { price: data?.gold?.buy || 0, currency: 'IDR' };
      } catch {
        return { price: 0, currency: 'IDR' };
      }
    });
  }
}

// Crypto Monitor
export class CryptoMonitor extends PriceMonitor {
  readonly type = 'crypto' as const;
  readonly name = 'Crypto Monitor';

  private coinId: string;

  constructor(config: MonitorConfig & { coinId?: string }) {
    super(config);
    this.coinId = config.coinId || 'bitcoin';
    this.setFetcher(async () => {
      const res = await fetch(`${PROVIDER_URLS.coingecko}?ids=${this.coinId}&vs_currencies=usd`);
      const data = await res.json();
      return { price: data[this.coinId]?.usd || 0, currency: 'USD' };
    });
  }
}

// News Monitor
export class NewsMonitor extends BaseMonitor {
  readonly type = 'news';
  readonly name = 'News Monitor';

  async check(): Promise<MonitorResult> {
    return {
      value: 'Latest headlines',
      timestamp: new Date().toISOString(),
      source: this.config.name,
      metadata: { headlines: ['News feed placeholder'] },
    };
  }
}

// Stock Monitor
export class StockMonitor extends BaseMonitor {
  readonly type = 'stock';
  readonly name = 'Stock Monitor';

  async check(): Promise<MonitorResult> {
    return {
      value: 0,
      change: 0,
      changeType: 'stable',
      timestamp: new Date().toISOString(),
      source: this.config.name,
    };
  }
}

// Reminder Monitor
export class ReminderMonitor extends BaseMonitor {
  readonly type = 'reminder';
  readonly name = 'Reminder Monitor';

  async check(): Promise<MonitorResult> {
    return {
      value: 0,
      timestamp: new Date().toISOString(),
      source: 'reminder',
      metadata: { dueItems: [] },
    };
  }
}

// Document Monitor
export class DocumentMonitor extends BaseMonitor {
  readonly type = 'document';
  readonly name = 'Document Monitor';

  async check(): Promise<MonitorResult> {
    return {
      value: 'No changes',
      timestamp: new Date().toISOString(),
      source: this.config.name,
      metadata: { changes: [] },
    };
  }
}

// Factory
export function createMonitor(type: string, config: MonitorConfig): BaseMonitor {
  switch (type) {
    case 'gold': return new GoldMonitor(config);
    case 'crypto': return new CryptoMonitor(config);
    case 'price': return new PriceMonitor(config);
    case 'news': return new NewsMonitor(config);
    case 'stock': return new StockMonitor(config);
    case 'reminder': return new ReminderMonitor(config);
    case 'document': return new DocumentMonitor(config);
    default: return new PriceMonitor(config);
  }
}
