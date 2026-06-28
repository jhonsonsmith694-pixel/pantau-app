// Logger Service — structured logging with levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogEntry = {
  level: LogLevel;
  message: string;
  data?: Record<string, any>;
  timestamp: string;
  source?: string;
};

type LogListener = (entry: LogEntry) => void;

class LoggerService {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private listeners: LogListener[] = [];
  private enabled: boolean = true;

  setEnabled(v: boolean) { this.enabled = v; }

  onLog(listener: LogListener) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private log(level: LogLevel, message: string, data?: Record<string, any>, source?: string) {
    if (!this.enabled) return;
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      source,
    };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();
    this.listeners.forEach(l => l(entry));
    if (__DEV__) {
      const prefix = `[${level.toUpperCase()}]${source ? `[${source}]` : ''}`;
      if (level === 'error') console.error(prefix, message, data || '');
      else if (level === 'warn') console.warn(prefix, message, data || '');
      else console.log(prefix, message, data || '');
    }
  }

  debug(message: string, data?: Record<string, any>, source?: string) { this.log('debug', message, data, source); }
  info(message: string, data?: Record<string, any>, source?: string) { this.log('info', message, data, source); }
  warn(message: string, data?: Record<string, any>, source?: string) { this.log('warn', message, data, source); }
  error(message: string, data?: Record<string, any>, source?: string) { this.log('error', message, data, source); }

  getLogs(): LogEntry[] { return [...this.logs]; }
  getRecentLogs(n: number = 50): LogEntry[] { return this.logs.slice(-n); }

  clear() { this.logs = []; }

  // Export logs for debugging
  export(): string {
    return this.logs.map(e => `[${e.timestamp}] [${e.level.toUpperCase()}] ${e.message}`).join('\n');
  }
}

export const logger = new LoggerService();

// Convenience wrappers
export function logDebug(msg: string, data?: Record<string, any>, source?: string) { logger.debug(msg, data, source); }
export function logInfo(msg: string, data?: Record<string, any>, source?: string) { logger.info(msg, data, source); }
export function logWarn(msg: string, data?: Record<string, any>, source?: string) { logger.warn(msg, data, source); }
export function logError(msg: string, data?: Record<string, any>, source?: string) { logger.error(msg, data, source); }
