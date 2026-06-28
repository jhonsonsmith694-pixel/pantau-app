// Backward-compatible re-export
// All new code should import from src/context or src/hooks directly
export { AppProvider, AppContext } from './context/AppContext';
export { useApp } from './hooks/useApp';
export type { User, Monitor, Note, Reminder, Event, Notification, Setting, MonitorCategory, NoteCategory, EventType, ThemeMode, SyncStatus, SyncData, APIError, APIOptions, AnalyticsEvent } from './types';
export { NOTE_COLORS, NOTE_CATEGORIES, MONITOR_CATEGORIES, PREDEFINED_MONITORS } from './types';
