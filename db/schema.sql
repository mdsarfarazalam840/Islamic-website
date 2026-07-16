-- D1 Database Schema for Quran Website
-- Run: npx wrangler d1 execute quran-db --file=db/schema.sql --remote

CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  surah_number INTEGER NOT NULL,
  ayah_number INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(client_id, surah_number, ayah_number)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_client ON bookmarks(client_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_surah ON bookmarks(surah_number);

CREATE TABLE IF NOT EXISTS reading_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  surah_number INTEGER NOT NULL,
  last_ayah_number INTEGER DEFAULT 1,
  completed INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(client_id, surah_number)
);

CREATE INDEX IF NOT EXISTS idx_progress_client ON reading_progress(client_id);
