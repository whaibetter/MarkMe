const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const db = require('./db');
const config = require('./config');

const app = express();
const PORT = config.PORT;
const DATA_DIR = process.env.DATA_DIR || __dirname;

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(DATA_DIR, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// MCP Bridge 路由（远程 AI 客户端通过 /bridge/tools/:name 调用）
const bridgeRouter = require('./bridge-router');
app.use('/bridge', bridgeRouter);

// Notes 路由（学习笔记仓库）
const notesRouter = require('./notes-router');
const notesSync = require('./notes-sync');
app.use('/notes-files', express.static(notesSync.NOTES_DIR));
app.use('/api/notes', notesRouter);

app.use(express.static(path.join(__dirname, '../client')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// API Routes
app.get('/api/posts', (req, res) => {
  const { page = 1, limit = 10, tag, status = 'published' } = req.query;
  const offset = (page - 1) * limit;
  let query = 'SELECT * FROM posts WHERE status = ?';
  const params = [status];

  if (tag) {
    query += ' AND tags LIKE ?';
    params.push(`%${tag}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const posts = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM posts WHERE status = ?').get(status).count;

  res.json({ posts, total, page: Number(page), limit: Number(limit) });
});

app.get('/api/posts/:id', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const files = db.prepare('SELECT * FROM files WHERE post_id = ?').all(req.params.id);
  res.json({ ...post, files });
});

app.get('/api/files', (req, res) => {
  const files = db.prepare('SELECT * FROM files ORDER BY created_at DESC').all();
  res.json(files);
});

app.get('/api/files/:id', (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });
  res.json(file);
});

app.get('/api/tags', (req, res) => {
  const posts = db.prepare('SELECT tags FROM posts WHERE status = ?').all('published');
  const tagSet = new Set();
  posts.forEach(p => {
    try {
      JSON.parse(p.tags).forEach(t => tagSet.add(t));
    } catch {}
  });
  res.json([...tagSet]);
});

// Feed API
app.get('/api/feeds', (req, res) => {
  const { page = 1, limit = 20, tag } = req.query;
  const offset = (page - 1) * limit;
  let query = 'SELECT * FROM feeds WHERE status = ?';
  const params = ['published'];

  if (tag) {
    query += ' AND tags LIKE ?';
    params.push(`%${tag}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const feeds = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM feeds WHERE status = ?').get('published').count;

  res.json({ feeds, total, page: Number(page), limit: Number(limit) });
});

app.get('/api/feeds/:id', (req, res) => {
  const feed = db.prepare('SELECT * FROM feeds WHERE id = ?').get(req.params.id);
  if (!feed) return res.status(404).json({ error: 'Feed not found' });
  res.json(feed);
});

app.get('/api/stats', (req, res) => {
  const posts = db.prepare('SELECT COUNT(*) as count FROM posts WHERE status = ?').get('published');
  const files = db.prepare('SELECT COUNT(*) as count FROM files').get();
  res.json({ posts: posts.count, files: files.count });
});

// GitHub Profile API with server-side cache (memory + disk persistence)
const GITHUB_USER = 'whaibetter';
const PROFILE_CACHE_KEY = 'github-profile';
const PROFILE_CACHE_FILE = path.join(__dirname, 'data', 'profile-cache.json');
const PROFILE_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const profileCache = new Map();

// Load cache from disk on startup
try {
  if (fs.existsSync(PROFILE_CACHE_FILE)) {
    const saved = JSON.parse(fs.readFileSync(PROFILE_CACHE_FILE, 'utf-8'));
    if (saved && saved.content && saved.timestamp) {
      profileCache.set(PROFILE_CACHE_KEY, saved);
      console.log('Profile cache loaded from disk');
    }
  }
} catch (e) {
  // Ignore corrupt cache file
}

async function fetchGitHubProfile() {
  const url = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_USER}/main/README.md`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status}`);
  return await res.text();
}

app.get('/api/profile', async (req, res) => {
  try {
    const cached = profileCache.get(PROFILE_CACHE_KEY);
    const now = Date.now();

    if (cached && now - cached.timestamp < PROFILE_CACHE_TTL) {
      return res.json({ content: cached.content, cached: true });
    }

    const content = await fetchGitHubProfile();
    const entry = { content, timestamp: now };
    profileCache.set(PROFILE_CACHE_KEY, entry);

    // Persist to disk
    try {
      fs.mkdirSync(path.dirname(PROFILE_CACHE_FILE), { recursive: true });
      fs.writeFileSync(PROFILE_CACHE_FILE, JSON.stringify(entry));
    } catch (e) {
      console.error('Profile cache write error:', e.message);
    }

    res.json({ content, cached: false });
  } catch (err) {
    console.error('Profile fetch error:', err);
    const cached = profileCache.get(PROFILE_CACHE_KEY);
    if (cached) {
      return res.json({ content: cached.content, cached: true, stale: true });
    }
    res.status(500).json({ error: err.message });
  }
});

// Catch-all to serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(PORT, () => {
  console.log(`WhaiBlog server running on http://localhost:${PORT}`);
  // 后台初始化笔记仓库（不阻塞启动）
  notesSync.initNotesRepo();
});
