const path = require('path');
const fs = require('fs');
const { execSync, exec } = require('child_process');

const DATA_DIR = process.env.DATA_DIR || __dirname;
const NOTES_DIR = path.join(DATA_DIR, 'learning-notes');
const REPO_URL = process.env.NOTES_REPO_URL || 'https://gitee.com/lkwhai/learning-notes.git';

const ALLOWED_EXTENSIONS = new Set([
  '.md', '.txt', '.json', '.csv', '.xml', '.yaml', '.yml',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.pdf', '.xmind',
  '.java', '.py', '.js', '.html', '.css', '.c', '.h', '.s'
]);

const SKIP_DIRS = new Set(['.git', '.idea', '__pycache__', 'node_modules']);

// Sync status: 'idle' | 'cloning' | 'pulling' | 'ready' | 'error'
let syncStatus = 'idle';
let syncError = null;
let lastSyncTime = null;

// In-memory cache
const treeCache = new Map();   // key: `${path}:${depth}`, value: { tree, timestamp }
const fileCache = new Map();   // key: relativePath, value: { data, timestamp }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function isRepoCloned() {
  return fs.existsSync(path.join(NOTES_DIR, '.git'));
}

function hasFiles() {
  if (!isRepoCloned()) return false;
  try {
    const entries = fs.readdirSync(NOTES_DIR, { withFileTypes: true });
    return entries.some(e => !e.name.startsWith('.'));
  } catch {
    return false;
  }
}

function doClone() {
  syncStatus = 'cloning';
  console.log('[Notes] Cloning repository...');
  exec(`git -c http.postBuffer=524288000 -c http.version=HTTP/1.1 clone --depth 1 "${REPO_URL}" "${NOTES_DIR}"`, { timeout: 300000 }, (err, stdout) => {
    if (err) {
      syncStatus = 'error';
      syncError = err.message;
      console.error('[Notes] Clone failed:', err.message);
    } else {
      syncStatus = 'ready';
      lastSyncTime = new Date().toISOString();
      syncError = null;
      treeCache.clear();
      fileCache.clear();
      console.log('[Notes] Clone complete');
    }
  });
}

function initNotesRepo() {
  if (syncStatus === 'cloning' || syncStatus === 'pulling') return;

  if (isRepoCloned() && hasFiles()) {
    syncStatus = 'pulling';
    console.log('[Notes] Repository exists, pulling latest changes...');
    exec('git pull', { cwd: NOTES_DIR, timeout: 120000 }, (err, stdout) => {
      if (err) {
        syncStatus = 'ready'; // still usable with old data
        lastSyncTime = new Date().toISOString();
        console.error('[Notes] Pull failed (using cached):', err.message);
      } else {
        syncStatus = 'ready';
        lastSyncTime = new Date().toISOString();
        treeCache.clear();
        fileCache.clear();
        console.log('[Notes] Pull complete:', stdout.trim());
      }
    });
    // Already cloned with files, mark ready immediately (pull is for freshness)
    syncStatus = 'ready';
    lastSyncTime = new Date().toISOString();
  } else {
    // No repo or empty working tree — clean and re-clone
    if (isRepoCloned() && !hasFiles()) {
      try { fs.rmSync(NOTES_DIR, { recursive: true, force: true }); } catch {}
    }
    doClone();
  }
}

function syncNotes() {
  if (!isRepoCloned()) {
    return { success: false, error: 'Repository not cloned yet' };
  }
  try {
    const result = execSync('git pull', { cwd: NOTES_DIR, timeout: 60000, encoding: 'utf-8' });
    lastSyncTime = new Date().toISOString();
    treeCache.clear();
    fileCache.clear();
    return { success: true, message: result.trim(), timestamp: lastSyncTime };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getStatus() {
  return {
    status: syncStatus,
    error: syncError,
    lastSync: lastSyncTime,
    repoCloned: isRepoCloned()
  };
}

function buildTree(dirPath, depth) {
  if (!isRepoCloned()) {
    return { error: syncStatus === 'cloning' ? 'Repository is being cloned, please wait...' : 'Repository not cloned yet', tree: [] };
  }

  const cacheKey = `${dirPath || ''}:${depth || 2}`;
  const cached = treeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const fullPath = path.join(NOTES_DIR, dirPath);
  if (!fullPath.startsWith(NOTES_DIR)) {
    return { error: 'Invalid path', tree: [] };
  }
  if (!fs.existsSync(fullPath)) {
    return { error: 'Path not found', tree: [] };
  }

  const tree = buildTreeRecursive(fullPath, depth || 2, 0, dirPath);
  const result = { tree, path: dirPath || '', depth: depth || 2 };

  treeCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

function buildTreeRecursive(absPath, maxDepth, currentDepth, relBase) {
  if (currentDepth >= maxDepth) return [];

  let entries;
  try {
    entries = fs.readdirSync(absPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const dirs = [];
  const files = [];

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    if (entry.name === '.gitignore') continue;

    const relPath = relBase ? relBase + '/' + entry.name : entry.name;

    if (entry.isDirectory()) {
      dirs.push({
        name: entry.name,
        path: relPath,
        type: 'directory',
        children: buildTreeRecursive(path.join(absPath, entry.name), maxDepth, currentDepth + 1, relPath)
      });
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) continue;

      let size = 0;
      try { size = fs.statSync(path.join(absPath, entry.name)).size; } catch {}

      files.push({
        name: entry.name,
        path: relPath,
        type: 'file',
        size
      });
    }
  }

  dirs.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => a.name.localeCompare(b.name));

  return [...dirs, ...files];
}

function getNoteContent(relativePath) {
  if (!isRepoCloned()) {
    return { error: syncStatus === 'cloning' ? 'Repository is being cloned, please wait...' : 'Repository not cloned yet' };
  }

  const cached = fileCache.get(relativePath);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const fullPath = path.join(NOTES_DIR, relativePath);
  if (!fullPath.startsWith(NOTES_DIR)) {
    return { error: 'Invalid path' };
  }
  if (!fs.existsSync(fullPath)) {
    return { error: 'File not found' };
  }

  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    return { error: 'Path is a directory' };
  }

  const ext = path.extname(relativePath).toLowerCase();
  const name = path.basename(relativePath);

  const binaryExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.pdf', '.xmind']);
  if (binaryExts.has(ext)) {
    const result = { type: 'binary', name, path: relativePath, url: '/notes-files/' + relativePath };
    fileCache.set(relativePath, { data: result, timestamp: Date.now() });
    return result;
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf-8');
    const parentDir = path.dirname(relativePath);

    let result;
    if (ext === '.md') {
      content = rewriteImagePaths(content, parentDir);
      result = { type: 'markdown', name, path: relativePath, content };
    } else {
      result = { type: 'text', name, path: relativePath, content };
    }

    fileCache.set(relativePath, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    return { error: 'Failed to read file: ' + err.message };
  }
}

function rewriteImagePaths(content, parentDir) {
  content = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
    if (url.startsWith('http') || url.startsWith('/notes-files/') || url.startsWith('data:')) {
      return match;
    }
    const cleanUrl = url.replace(/^\.\//, '');
    const absPath = parentDir === '.' ? cleanUrl : parentDir + '/' + cleanUrl;
    return `![${alt}](/notes-files/${absPath})`;
  });

  content = content.replace(/<img\s+([^>]*?)src=["']([^"']+)["']/gi, (match, attrs, url) => {
    if (url.startsWith('http') || url.startsWith('/notes-files/') || url.startsWith('data:')) {
      return match;
    }
    const cleanUrl = url.replace(/^\.\//, '');
    const absPath = parentDir === '.' ? cleanUrl : parentDir + '/' + cleanUrl;
    return `<img ${attrs}src="/notes-files/${absPath}"`;
  });

  return content;
}

function getNoteMeta(relativePath) {
  if (!isRepoCloned()) {
    return { error: 'Repository not cloned yet' };
  }

  const fullPath = path.join(NOTES_DIR, relativePath);
  if (!fullPath.startsWith(NOTES_DIR) || !fs.existsSync(fullPath)) {
    return { error: 'File not found' };
  }

  const stat = fs.statSync(fullPath);
  return {
    name: path.basename(relativePath),
    path: relativePath,
    size: stat.size,
    modified: stat.mtime.toISOString(),
    type: stat.isDirectory() ? 'directory' : 'file'
  };
}

module.exports = { initNotesRepo, syncNotes, buildTree, getNoteContent, getNoteMeta, getStatus, NOTES_DIR, isRepoCloned };
