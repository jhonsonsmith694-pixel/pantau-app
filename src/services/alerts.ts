// Price Alerts — checks monitor live values against user-set thresholds and
// fires a local notification when crossed. Used both on app foreground and by
// the background fetch task.
import { Monitor } from '../types';
import { getLiveValue } from './liveData';
import { sendLocalNotification } from './notifications';
import { recordPrice } from './priceHistory';
import { logger } from './logger';

// Manual IDR formatting (Hermes Intl unreliable)
function formatIDR(n: number): string {
  const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return 'Rp ' + s;
}

// Returns the list of monitors whose alerts were triggered this run.
export async function checkAlerts(monitors: Monitor[]): Promise<Monitor[]> {
  const triggered: Monitor[] = [];
  const withAlerts = monitors.filter(m => m.alert?.enabled && m.active);

  for (const m of withAlerts) {
    try {
      const quote = await getLiveValue(m.title, m.category);
      if (!quote || quote.value <= 0) continue;

      // record for history charting
      recordPrice(m.title, quote.value);

      const alert = m.alert!;
      const crossed =
        (alert.type === 'above' && quote.value >= alert.threshold) ||
        (alert.type === 'below' && quote.value <= alert.threshold);

      // Cooldown: don't re-fire within 6 hours
      const lastFire = alert.lastTriggeredAt ? new Date(alert.lastTriggeredAt).getTime() : 0;
      const cooledDown = Date.now() - lastFire > 6 * 60 * 60 * 1000;

      if (crossed && cooledDown) {
        const arrow = alert.type === 'above' ? 'tembus di atas' : 'turun di bawah';
        await sendLocalNotification(
          `🔔 ${m.title}`,
          `Harga sekarang ${quote.display} — ${arrow} target ${formatIDR(alert.threshold)}`,
          { monitorId: m.id }
        );
        triggered.push(m);
      }
    } catch (e: any) {
      logger.warn(`Alert check failed for ${m.title}: ${e?.message}`, undefined, 'alerts');
    }
  }
  return triggered;
}
