// Provider Plugin Interface — all data providers implement this
export type ProviderResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  source: string;
  cached: boolean;
  timestamp: string;
};

export interface IDataProvider {
  readonly name: string;
  readonly type: string;
  isAvailable(): boolean;
  fetch<T>(params?: Record<string, any>): Promise<ProviderResult<T>>;
}

// Provider Registry — manages all providers
class ProviderRegistry {
  private providers: Map<string, IDataProvider> = new Map();

  register(provider: IDataProvider) {
    this.providers.set(provider.type, provider);
  }

  get(type: string): IDataProvider | undefined {
    return this.providers.get(type);
  }

  getAvailable(): { name: string; type: string }[] {
    return Array.from(this.providers.values())
      .filter(p => p.isAvailable())
      .map(p => ({ name: p.name, type: p.type }));
  }

  listAll(): { name: string; type: string; available: boolean }[] {
    return Array.from(this.providers.values()).map(p => ({
      name: p.name,
      type: p.type,
      available: p.isAvailable(),
    }));
  }
}

export const providerRegistry = new ProviderRegistry();
