const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const db = require('./db');
const config = require('./config');

const app = express();
const PORT = config.PORT;

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MCP Bridge 路由（远程 AI 客户端通过 /bridge/tools/:name 调用）
const bridgeRouter = require('./bridge-router');
app.use('/bridge', bridgeRouter);

app.use(express.static(path.join(__dirname, '../client')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
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

app.get('/api/stats', (req, res) => {
  const posts = db.prepare('SELECT COUNT(*) as count FROM posts WHERE status = ?').get('published');
  const files = db.prepare('SELECT COUNT(*) as count FROM files').get();
  res.json({ posts: posts.count, files: files.count });
});

// Catch-all to serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(PORT, () => {
  console.log(`MarkMe server running on http://localhost:${PORT}`);
});
