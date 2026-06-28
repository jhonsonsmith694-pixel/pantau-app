-- PANTAU Database Schema v2
-- Migration 001: Initial production schema

-- Drop old tables (will be repopulated)
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS monitors;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS monitor_rules;
DROP TABLE IF EXISTS devices;
DROP TABLE IF EXISTS reminders;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS sync_queue;
DROP TABLE IF EXISTS analytics;
DROP TABLE IF EXISTS audit_logs;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  avatar TEXT DEFAULT 'person',
  premium INTEGER DEFAULT 0,
  storage_used INTEGER DEFAULT 0,
  storage_limit INTEGER DEFAULT 52428800,
  last_sync_at TEXT,
  onboarded INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT,
  push_token TEXT,
  app_version TEXT,
  last_seen_at TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX idx_devices_user ON devices(user_id);

CREATE TABLE monitors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'harga',
  provider TEXT,
  status TEXT DEFAULT 'active',
  config TEXT,
  last_checked_at TEXT,
  last_value TEXT,
  error_count INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX idx_monitors_user ON monitors(user_id);
CREATE INDEX idx_monitors_category ON monitors(category);
CREATE INDEX idx_monitors_status ON monitors(status);

CREATE TABLE monitor_rules (
  id TEXT PRIMARY KEY,
  monitor_id TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('above','below','equal','change_percent','contains')),
  value TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX idx_rules_monitor ON monitor_rules(monitor_id);

CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  category TEXT DEFAULT 'Umum',
  color TEXT DEFAULT '#FFFFFF',
  pinned INTEGER DEFAULT 0,
  archived INTEGER DEFAULT 0,
  tags TEXT,
  reminder_at TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notes_category ON notes(category);
CREATE INDEX idx_notes_pinned ON notes(pinned);
CREATE INDEX idx_notes_archived ON notes(archived);

CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  note TEXT,
  due_at TEXT NOT NULL,
  repeat TEXT,
  completed INTEGER DEFAULT 0,
  snoozed_until TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX idx_reminders_user ON reminders(user_id);
CREATE INDEX idx_reminders_due ON reminders(due_at);
CREATE INDEX idx_reminders_completed ON reminders(completed);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  source TEXT,
  source_id TEXT,
  title TEXT,
  description TEXT,
  metadata TEXT,
  severity TEXT DEFAULT 'info',
  created_at TEXT
);
CREATE INDEX idx_events_user ON events(user_id);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_created ON events(created_at);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT,
  data TEXT,
  read INTEGER DEFAULT 0,
  delivered_at TEXT,
  read_at TEXT,
  created_at TEXT
);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

CREATE TABLE settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE UNIQUE INDEX idx_settings_user_key ON settings(user_id, key);

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT,
  endpoint TEXT,
  p256dh TEXT,
  auth TEXT,
  enabled INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);

CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL CHECK(action IN ('create','update','delete')),
  payload TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','failed')),
  retry_count INTEGER DEFAULT 0,
  error TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX idx_sync_user_status ON sync_queue(user_id, status);
CREATE INDEX idx_sync_created ON sync_queue(created_at);

CREATE TABLE analytics (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event TEXT NOT NULL,
  properties TEXT,
  device_info TEXT,
  ip TEXT,
  user_agent TEXT,
  session_id TEXT,
  created_at TEXT
);
CREATE INDEX idx_analytics_event ON analytics(event);
CREATE INDEX idx_analytics_user ON analytics(user_id);
CREATE INDEX idx_analytics_created ON analytics(created_at);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource TEXT,
  resource_id TEXT,
  details TEXT,
  ip TEXT,
  created_at TEXT
);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
