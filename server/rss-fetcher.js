const Parser = require('rss-parser');
const db = require('./db');
const cron = require('node-cron');

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'WhaiBlog RSS Reader/1.0' }
});

function addSource(url, title) {
  try {
    const result = db.prepare(
      'INSERT INTO rss_sources (url, title) VALUES (?, ?)'
    ).run(url, title || null);
    return { success: true, data: { id: result.lastInsertRowid, url } };
  } catch(e) {
    if (e.message.includes('UNIQUE')) {
      return { success: false, error: 'Source already exists' };
    }
    return { success: false, error: e.message };
  }
}

function removeSource(id) {
  const source = db.prepare('SELECT * FROM rss_sources WHERE id = ?').get(id);
  if (!source) return { success: false, error: 'Source not found' };
  db.prepare('DELETE FROM rss_sources WHERE id = ?').run(id);
  return { success: true, message: 'Source removed' };
}

function listSources() {
  return db.prepare('SELECT * FROM rss_sources ORDER BY created_at DESC').all();
}

function updateSource(id, updates) {
  const source = db.prepare('SELECT * FROM rss_sources WHERE id = ?').get(id);
  if (!source) return { success: false, error: 'Source not found' };

  const fields = [], values = [];
  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.enabled !== undefined) { fields.push('enabled = ?'); values.push(updates.enabled); }
  if (updates.fetch_interval !== undefined) { fields.push('fetch_interval = ?'); values.push(updates.fetch_interval); }

  if (fields.length > 0) {
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    db.prepare('UPDATE rss_sources SET ' + fields.join(', ') + ' WHERE id = ?').run(...values);
  }
  return { success: true, data: db.prepare('SELECT * FROM rss_sources WHERE id = ?').get(id) };
}

async function fetchSource(source) {
  try {
    const feed = await parser.parseURL(source.url);

    // Update source metadata
    db.prepare(
      'UPDATE rss_sources SET title = ?, description = ?, last_fetched = CURRENT_TIMESTAMP, error_count = 0, last_error = NULL WHERE id = ?'
    ).run(feed.title || source.title, feed.description || '', source.id);

    // Store items as feed entries
    const existingUrls = new Set(
      db.prepare("SELECT url FROM feeds WHERE source = ? AND url IS NOT NULL")
        .all(feed.title || source.title)
        .map(function(r) { return r.url; })
    );

    let newCount = 0;
    const insertStmt = db.prepare(
      'INSERT INTO feeds (title, content, summary, source, url, tags, format) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    for (const item of (feed.items || []).slice(0, 20)) {
      if (item.link && existingUrls.has(item.link)) continue;

      const title = item.title || 'Untitled';
      const content = item['content:encoded'] || item.content || item.contentSnippet || '';
      const summary = item.contentSnippet || content.substring(0, 200);
      const source_name = feed.title || source.title || 'RSS';
      const url = item.link || null;
      const tags = item.categories || [];
      const format = item['content:encoded'] ? 'html' : 'markdown';

      if (title && content) {
        insertStmt.run(title, content, summary, source_name, url, JSON.stringify(tags), format);
        newCount++;
      }
    }

    return { success: true, source: feed.title, newItems: newCount };
  } catch(e) {
    db.prepare(
      'UPDATE rss_sources SET error_count = error_count + 1, last_error = ?, last_fetched = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(e.message, source.id);
    return { success: false, error: e.message };
  }
}

async function fetchAllSources() {
  const sources = db.prepare('SELECT * FROM rss_sources WHERE enabled = 1').all();
  const results = [];

  for (const source of sources) {
    const result = await fetchSource(source);
    results.push({ source: source.url, ...result });
  }

  return results;
}

async function fetchOneSource(id) {
  const source = db.prepare('SELECT * FROM rss_sources WHERE id = ?').get(id);
  if (!source) return { success: false, error: 'Source not found' };
  return await fetchSource(source);
}

function startCronJob() {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async function() {
    console.log('[RSS] Fetching all sources...');
    const results = await fetchAllSources();
    var total = results.reduce(function(sum, r) { return sum + (r.newItems || 0); }, 0);
    console.log('[RSS] Done. ' + total + ' new items from ' + results.length + ' sources.');
  });
  console.log('[RSS] Cron job started (every 30 minutes)');
}

module.exports = {
  addSource, removeSource, listSources, updateSource,
  fetchSource, fetchAllSources, fetchOneSource,
  startCronJob
};
