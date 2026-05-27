const express = require('express');
const router = express.Router();
const notes = require('./notes-sync');

router.get('/tree', (req, res) => {
  const dirPath = req.query.path || '';
  const depth = parseInt(req.query.depth) || 2;

  if (dirPath.includes('..')) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  const result = notes.buildTree(dirPath, Math.min(depth, 8));
  if (result.error) {
    return res.status(result.error === 'Repository not cloned yet' ? 503 : 404).json(result);
  }
  res.json(result);
});

router.get('/file', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ error: 'path parameter required' });
  }
  if (filePath.includes('..')) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  const result = notes.getNoteContent(filePath);
  if (result.error) {
    const status = result.error === 'Repository not cloned yet' ? 503 : 404;
    return res.status(status).json(result);
  }
  res.json(result);
});

router.post('/sync', (req, res) => {
  const result = notes.syncNotes();
  res.json(result);
});

router.get('/status', (req, res) => {
  res.json(notes.getStatus());
});

module.exports = router;
