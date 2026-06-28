// Scheduler Engine — one-time, recurring, interval, background, notification triggers
import { logger } from './logger';

export type TaskType = 'one_time' | 'recurring' | 'interval' | 'background' | 'notification';

export type ScheduledTask = {
  id: string;
  name: string;
  type: TaskType;
  interval?: number;        // For interval tasks (ms)
  cron?: string;            // For recurring (future: parse cron)
  callback: () => void | Promise<void>;
  dueAt?: Date;             // For one_time
  startAt?: Date;           // For recurring
  enabled: boolean;
  runImmediate?: boolean;   // Run on register
  tags?: string[];          // For grouping
  lastRunAt?: Date;
  runCount: number;
};

type TaskListener = (task: ScheduledTask) => void;

class Scheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private intervalIds: Map<string, ReturnType<typeof setInterval>> = new Map();
  private timeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private bgRunning: boolean = false;
  private listeners: TaskListener[] = [];

  onTask(listener: TaskListener) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private notify(task: ScheduledTask) {
    this.listeners.forEach(l => l(task));
  }

  // Register a task
  register(task: ScheduledTask): string {
    const id = task.id || `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    this.tasks.set(id, { ...task, id, runCount: 0 });

    switch (task.type) {
      case 'one_time':
        if (task.dueAt) {
          const delay = task.dueAt.getTime() - Date.now();
          if (delay > 0) {
            const timeoutId = setTimeout(() => this.execute(id), delay);
            this.timeouts.set(id, timeoutId);
          }
        }
        break;

      case 'interval':
        if (task.interval && task.interval > 0) {
          if (task.runImmediate) this.execute(id);
          const intervalId = setInterval(() => this.execute(id), task.interval);
          this.intervalIds.set(id, intervalId);
        }
        break;

      case 'recurring':
        // For now, treat as interval with `interval` field
        if (task.interval && task.interval > 0) {
          if (task.runImmediate) this.execute(id);
          const intervalId = setInterval(() => this.execute(id), task.interval);
          this.intervalIds.set(id, intervalId);
        }
        break;

      case 'background':
        // Background tasks handled by native module
        logger.info(`Background task registered: ${task.name}`, undefined, 'scheduler');
        break;

      case 'notification':
        // Notification tasks — run when notification is tapped
        logger.info(`Notification task registered: ${task.name}`, undefined, 'scheduler');
        break;
    }

    logger.debug(`Task registered: ${task.name} (${task.type})`, { id }, 'scheduler');
    return id;
  }

  // Execute a task by ID
  private async execute(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task || !task.enabled) return;
    try {
      logger.debug(`Running task: ${task.name}`, undefined, 'scheduler');
      await task.callback();
      task.lastRunAt = new Date();
      task.runCount++;
      this.notify(task);
    } catch (e: any) {
      logger.error(`Task failed: ${task.name} — ${e.message}`, undefined, 'scheduler');
    }
  }

  // Unregister a task
  unregister(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    const timeout = this.timeouts.get(id);
    if (timeout) { clearTimeout(timeout); this.timeouts.delete(id); }
    const interval = this.intervalIds.get(id);
    if (interval) { clearInterval(interval); this.intervalIds.delete(id); }
    this.tasks.delete(id);
    logger.debug(`Task unregistered: ${task.name}`, { id }, 'scheduler');
    return true;
  }

  // Enable/disable a task
  setEnabled(id: string, enabled: boolean): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.enabled = enabled;
    if (!enabled) {
      const timeout = this.timeouts.get(id);
      if (timeout) { clearTimeout(timeout); this.timeouts.delete(id); }
      const interval = this.intervalIds.get(id);
      if (interval) { clearInterval(interval); this.intervalIds.delete(id); }
    }
    return true;
  }

  // Get all tasks
  getTasks(type?: TaskType): ScheduledTask[] {
    const all = Array.from(this.tasks.values());
    return type ? all.filter(t => t.type === type) : all;
  }

  // Get task by ID
  getTask(id: string): ScheduledTask | undefined {
    return this.tasks.get(id);
  }

  // Run all due background tasks (called by native module)
  async runBackgroundTasks(): Promise<void> {
    if (this.bgRunning) return;
    this.bgRunning = true;
    logger.info('Running background tasks', undefined, 'scheduler');
    for (const task of this.tasks.values()) {
      if (task.type === 'background' && task.enabled) {
        await this.execute(task.id);
      }
    }
    this.bgRunning = false;
  }

  // Clear all tasks
  clear() {
    for (const id of this.timeouts.keys()) clearTimeout(this.timeouts.get(id)!);
    for (const id of this.intervalIds.keys()) clearInterval(this.intervalIds.get(id)!);
    this.timeouts.clear();
    this.intervalIds.clear();
    this.tasks.clear();
    logger.info('All tasks cleared', undefined, 'scheduler');
  }

  // Stop all (cleanup)
  destroy() {
    this.clear();
  }
}

export const scheduler = new Scheduler();
