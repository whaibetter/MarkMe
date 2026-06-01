const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || path.join(__dirname);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'markme.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    tags TEXT DEFAULT '[]',
    status TEXT DEFAULT 'published',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER,
    post_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    parent_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    source TEXT,
    url TEXT,
    tags TEXT DEFAULT '[]',
    format TEXT DEFAULT 'markdown',
    status TEXT DEFAULT 'published',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: add format column to existing feeds table
try {
  db.prepare("SELECT format FROM feeds LIMIT 1").get();
} catch {
  db.exec("ALTER TABLE feeds ADD COLUMN format TEXT DEFAULT 'markdown'");
  console.log('Migration: added format column to feeds table');
}

module.exports = db;
