// Date & time utilities
export function formatDate(date: Date | string | number): string {
  const d = typeof date === 'object' ? date : new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

export function formatDateShort(date: Date | string | number): string {
  const d = typeof date === 'object' ? date : new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins}m lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}h lalu`;
  return formatDate(d);
}

export function toISO(date: Date = new Date()): string {
  return date.toISOString();
}

export function now(): string {
  return formatDate(new Date());
}

export function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export function isExpired(date: Date | string | number, ttlMs: number): boolean {
  const d = typeof date === 'object' ? date : new Date(date);
  return Date.now() - d.getTime() > ttlMs;
}

export function timeAgo(date: Date | string | number): string {
  return formatDateShort(date);
}
