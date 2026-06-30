// PANTAU Live Data — real-time value resolver for price monitors.
// Uses free, key-free public APIs so it works directly from the device:
//   - CoinGecko  : crypto prices + gold (via PAX Gold, 1 token ≈ 1 troy oz)
//   - ExchangeRate (open.er-api.com) : fiat FX rates to IDR
//   - Firecrawl (via worker) : web scraping fallback for unsupported monitors
// Returns a real quote for recognised monitors, or null when the monitor
// title isn't something we can fetch live (we never fake a value).
import { logger } from './logger';
import { api } from '../api/client';

export type LiveQuote = {
  value: number;            // numeric value in IDR
  display: string;          // formatted, human-readable (e.g. "Rp 1.075.008.570")
  change24h: number | null; // 24h percentage change, when available
  source: string;           // data source attribution
  updatedAt: string;        // ISO timestamp of when we fetched it
  snippet?: string;         // text snippet from Firecrawl scraping
};

type FetchSpec =
  | { kind: 'crypto'; coinId: string; label: string }
  | { kind: 'gold' }
  | { kind: 'forex'; base: string; label: string };

const GRAMS_PER_TROY_OUNCE = 31.1035;
const CACHE_TTL_MS = 60_000;
const FIRECRAWL_CACHE_TTL_MS = 300_000; // 5 minutes for Firecrawl results (slower/costly)
const REQUEST_TIMEOUT_MS = 12_000;

// Hermes-safe timeout (AbortSignal.timeout is unavailable on Hermes)
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('Request timeout')), ms);
    promise.then(resolve, reject).finally(() => clearTimeout(id));
  });
}

// Manual thousands grouping — Hermes Intl support is limited/unreliable.
function groupThousands(n: number): string {
  const s = Math.round(Math.abs(n)).toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function formatIDR(n: number): string {
  return (n < 0 ? '-' : '') + 'Rp ' + groupThousands(n);
}

// Common coins by Indonesian/English aliases → CoinGecko id
const COIN_MAP: Record<string, { id: string; label: string }> = {
  bitcoin: { id: 'bitcoin', label: 'Bitcoin' },
  btc: { id: 'bitcoin', label: 'Bitcoin' },
  ethereum: { id: 'ethereum', label: 'Ethereum' },
  eth: { id: 'ethereum', label: 'Ethereum' },
  bnb: { id: 'binancecoin', label: 'BNB' },
  binance: { id: 'binancecoin', label: 'BNB' },
  solana: { id: 'solana', label: 'Solana' },
  sol: { id: 'solana', label: 'Solana' },
  dogecoin: { id: 'dogecoin', label: 'Dogecoin' },
  doge: { id: 'dogecoin', label: 'Dogecoin' },
  cardano: { id: 'cardano', label: 'Cardano' },
  ada: { id: 'cardano', label: 'Cardano' },
  ripple: { id: 'ripple', label: 'XRP' },
  xrp: { id: 'ripple', label: 'XRP' },
  tether: { id: 'tether', label: 'Tether' },
  usdt: { id: 'tether', label: 'Tether' },
};

// Fiat currencies by alias → ISO base code
const FOREX_MAP: Record<string, { base: string; label: string }> = {
  dolar: { base: 'USD', label: 'USD/IDR' },
  dollar: { base: 'USD', label: 'USD/IDR' },
  usd: { base: 'USD', label: 'USD/IDR' },
  euro: { base: 'EUR', label: 'EUR/IDR' },
  eur: { base: 'EUR', label: 'EUR/IDR' },
  yen: { base: 'JPY', label: 'JPY/IDR' },
  jpy: { base: 'JPY', label: 'JPY/IDR' },
  ringgit: { base: 'MYR', label: 'MYR/IDR' },
  myr: { base: 'MYR', label: 'MYR/IDR' },
  riyal: { base: 'SAR', label: 'SAR/IDR' },
  sar: { base: 'SAR', label: 'SAR/IDR' },
  singapura: { base: 'SGD', label: 'SGD/IDR' },
  sgd: { base: 'SGD', label: 'SGD/IDR' },
};

function hasWord(text: string, word: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${word}([^a-z0-9]|$)`).test(text);
}

// Decide what (if anything) we can fetch live for a given monitor.
export function resolveMonitor(title: string, _category: string): FetchSpec | null {
  const t = title.toLowerCase();

  // Gold (Antam / logam mulia / emas)
  if (/(emas|gold|antam|logam mulia)/.test(t)) return { kind: 'gold' };

  // Crypto
  for (const key of Object.keys(COIN_MAP)) {
    if (hasWord(t, key)) {
      const c = COIN_MAP[key];
      return { kind: 'crypto', coinId: c.id, label: c.label };
    }
  }

  // Forex / kurs
  if (/(kurs|rupiah|dolar|dollar|valas|nilai tukar|valuta)/.test(t)) {
    for (const key of Object.keys(FOREX_MAP)) {
      if (hasWord(t, key)) {
        const f = FOREX_MAP[key];
        return { kind: 'forex', base: f.base, label: f.label };
      }
    }
    return { kind: 'forex', base: 'USD', label: 'USD/IDR' }; // default kurs → USD/IDR
  }

  return null;
}

export function isSupported(title: string, category: string): boolean {
  return resolveMonitor(title, category) !== null;
}

async function fetchCrypto(coinId: string): Promise<{ value: number; change: number | null }> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=idr&include_24hr_change=true`;
  const res = await withTimeout(fetch(url), REQUEST_TIMEOUT_MS);
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  const data: any = await res.json();
  const row = data?.[coinId];
  if (!row || typeof row.idr !== 'number') throw new Error('CoinGecko: data tidak tersedia');
  return { value: row.idr, change: typeof row.idr_24h_change === 'number' ? row.idr_24h_change : null };
}

async function fetchGold(): Promise<{ value: number; change: number | null }> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=idr&include_24hr_change=true`;
  const res = await withTimeout(fetch(url), REQUEST_TIMEOUT_MS);
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  const data: any = await res.json();
  const row = data?.['pax-gold'];
  if (!row || typeof row.idr !== 'number') throw new Error('Harga emas tidak tersedia');
  // PAX Gold tracks 1 troy ounce → convert to price per gram
  return { value: row.idr / GRAMS_PER_TROY_OUNCE, change: typeof row.idr_24h_change === 'number' ? row.idr_24h_change : null };
}

async function fetchForex(base: string): Promise<{ value: number; change: number | null }> {
  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
  const res = await withTimeout(fetch(url), REQUEST_TIMEOUT_MS);
  if (!res.ok) throw new Error(`ExchangeRate HTTP ${res.status}`);
  const data: any = await res.json();
  const idr = data?.rates?.IDR;
  if (typeof idr !== 'number') throw new Error('Kurs tidak tersedia');
  return { value: idr, change: null };
}

// Firecrawl fallback — calls the worker endpoint to scrape web data
const firecrawlCache = new Map<string, { at: number; quote: LiveQuote }>();

export async function fetchFirecrawlData(title: string, category: string): Promise<LiveQuote | null> {
  const cacheKey = `firecrawl:${title}:${category}`;
  const hit = firecrawlCache.get(cacheKey);
  if (hit && Date.now() - hit.at < FIRECRAWL_CACHE_TTL_MS) return hit.quote;

  try {
    const res = await api.monitorScrape(title, category);
    if (!res.success) {
      logger.warn(`Firecrawl gagal untuk "${title}": ${res.error}`, undefined, 'liveData');
      return null;
    }

    const { snippet, source, url, updatedAt } = res.data;
    if (!snippet) return null;

    const quote: LiveQuote = {
      value: 0,
      display: '',
      change24h: null,
      source: source || 'Firecrawl',
      updatedAt: updatedAt || new Date().toISOString(),
      snippet: snippet,
    };
    firecrawlCache.set(cacheKey, { at: Date.now(), quote });
    return quote;
  } catch (e: any) {
    logger.warn(`Firecrawl error untuk "${title}": ${e?.message || e}`, undefined, 'liveData');
    return null;
  }
}

const cache = new Map<string, { at: number; quote: LiveQuote }>();

// Fetch a live quote for a monitor. Falls back to Firecrawl when unsupported.
export async function getLiveValue(title: string, category: string): Promise<LiveQuote | null> {
  const spec = resolveMonitor(title, category);

  // If no local spec matches, try Firecrawl fallback
  if (!spec) {
    return fetchFirecrawlData(title, category);
  }

  const cacheKey = JSON.stringify(spec);
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.quote;

  try {
    let result: { value: number; change: number | null };
    let source: string;
    let perGram = false;

    if (spec.kind === 'crypto') {
      result = await fetchCrypto(spec.coinId);
      source = 'CoinGecko';
    } else if (spec.kind === 'gold') {
      result = await fetchGold();
      source = 'CoinGecko · PAXG';
      perGram = true;
    } else {
      result = await fetchForex(spec.base);
      source = 'exchangerate-api';
    }

    const quote: LiveQuote = {
      value: result.value,
      display: formatIDR(result.value) + (perGram ? ' /gr' : ''),
      change24h: result.change,
      source,
      updatedAt: new Date().toISOString(),
    };
    cache.set(cacheKey, { at: Date.now(), quote });
    return quote;
  } catch (e: any) {
    logger.warn(`liveData gagal untuk "${title}": ${e?.message || e}`, undefined, 'liveData');
    throw e;
  }
}

export function clearLiveCache(): void {
  cache.clear();
  firecrawlCache.clear();
}
