#!/usr/bin/env node

/**
 * MCP HTTP Bridge
 * 将 MCP 工具暴露为 HTTP API，方便不支持 MCP 的 AI Agent 调用
 */

const express = require('express');
const cors = require('cors');
const db = require('./db');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const markmeConfig = require('./markme-config');
const notes = require('./notes-sync');

const app = express();
const PORT = config.MCP_BRIDGE_PORT;

app.use(cors());
app.use(express.json());

// 安全配置
const API_KEY = config.API_KEY;
const HOST = config.HOST;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const MAX_FILE_SIZE = config.MAX_FILE_SIZE;
const ALLOWED_EXTENSIONS = config.ALLOWED_EXTENSIONS;

// API Key 认证中间件（可选）
app.use((req, res, next) => {
  // 如果设置了 API_KEY，则需要验证
  if (API_KEY) {
    const auth = req.headers.authorization;
    if (!auth || auth !== 'Bearer ' + API_KEY) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  }
  next();
});

// 路径安全检查
function isPathSafe(filePath) {
  const normalized = path.normalize(filePath);
  // 检查路径遍历
  if (normalized.includes('..')) return false;
  // 检查是否在允许的目录（可选）
  return true;
}

// 文件扩展名检查
function isAllowedFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

// 工具定义
const TOOLS = {
  create_post: {
    description: "Create a new blog post",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Post title" },
        content: { type: "string", description: "Post content (markdown)" },
        summary: { type: "string", description: "Post summary" },
        tags: { type: "array", items: { type: "string" }, description: "Post tags" },
        status: { type: "string", enum: ["published", "draft"], description: "Post status" }
      },
      required: ["title", "content"]
    }
  },
  update_post: {
    description: "Update an existing blog post",
    parameters: {
      type: "object",
      properties: {
        id: { type: "number", description: "Post ID" },
        title: { type: "string" },
        content: { type: "string" },
        summary: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        status: { type: "string", enum: ["published", "draft"] }
      },
      required: ["id"]
    }
  },
  delete_post: {
    description: "Delete a blog post",
    parameters: {
      type: "object",
      properties: { id: { type: "number", description: "Post ID" } },
      required: ["id"]
    }
  },
  list_posts: {
    description: "List all blog posts",
    parameters: {
      type: "object",
      properties: {
        page: { type: "number" },
        limit: { type: "number" },
        status: { type: "string", enum: ["published", "draft", "all"] }
      }
    }
  },
  get_post: {
    description: "Get a specific blog post",
    parameters: {
      type: "object",
      properties: { id: { type: "number", description: "Post ID" } },
      required: ["id"]
    }
  },
  upload_file: {
    description: "Upload a file to the blog",
    parameters: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Absolute path to the file" },
        post_id: { type: "number", description: "Associated post ID (optional)" }
      },
      required: ["file_path"]
    }
  },
  upload_folder: {
    description: "Upload all files from a folder",
    parameters: {
      type: "object",
      properties: {
        folder_path: { type: "string", description: "Absolute path to the folder" },
        post_id: { type: "number", description: "Associated post ID (optional)" }
      },
      required: ["folder_path"]
    }
  },
  list_files: {
    description: "List all uploaded files",
    parameters: { type: "object", properties: {} }
  },
  get_file: {
    description: "Get file details by ID",
    parameters: {
      type: "object",
      properties: { id: { type: "number", description: "File ID" } },
      required: ["id"]
    }
  },
  update_file: {
    description: "Update file metadata",
    parameters: {
      type: "object",
      properties: {
        id: { type: "number", description: "File ID" },
        original_name: { type: "string", description: "New display name" },
        post_id: { type: "number", description: "Associate with post" }
      },
      required: ["id"]
    }
  },
  replace_file: {
    description: "Replace file content with a local file (server-side path)",
    parameters: {
      type: "object",
      properties: {
        id: { type: "number", description: "File ID" },
        file_path: { type: "string", description: "Path to new file" }
      },
      required: ["id", "file_path"]
    }
  },
  upload_content: {
    description: "Upload a file by content (base64) - for remote clients without server filesystem access",
    parameters: {
      type: "object",
      properties: {
        filename: { type: "string", description: "File name with extension (e.g. 'readme.md')" },
        content: { type: "string", description: "File content as base64 encoded string" },
        post_id: { type: "number", description: "Associated post ID (optional)" }
      },
      required: ["filename", "content"]
    }
  },
  replace_file_content: {
    description: "Replace file content by base64 content - for remote clients",
    parameters: {
      type: "object",
      properties: {
        id: { type: "number", description: "File ID" },
        content: { type: "string", description: "New file content as base64 encoded string" }
      },
      required: ["id", "content"]
    }
  },
  delete_file: {
    description: "Delete an uploaded file",
    parameters: {
      type: "object",
      properties: { id: { type: "number", description: "File ID" } },
      required: ["id"]
    }
  },
  get_stats: {
    description: "Get blog statistics",
    parameters: { type: "object", properties: {} }
  },
  get_system_info: {
    description: "Get system resource usage of the WhaiBlog application (CPU, memory, disk, uptime)",
    parameters: { type: "object", properties: {} }
  },
  get_markme_config: {
    description: "Get WhaiBlog client configuration (server URL, API key status)",
    parameters: { type: "object", properties: {} }
  },
  set_markme_config: {
    description: "Set WhaiBlog client configuration (server URL and optional API key)",
    parameters: { type: "object", properties: { server_url: { type: "string" }, api_key: { type: "string" } }, required: ["server_url"] }
  },
  list_notes: {
    description: "List notes directory tree from the learning-notes repository (read-only)",
    parameters: { type: "object", properties: { path: { type: "string", description: "Relative path within repo, default root" }, depth: { type: "number", description: "Tree depth, default 2" } } }
  },
  get_note: {
    description: "Get the content of a specific note file (read-only)",
    parameters: { type: "object", properties: { path: { type: "string", description: "Relative path to the file" } }, required: ["path"] }
  },
  notes_status: {
    description: "Get notes repository sync status (cloning/ready/error)",
    parameters: { type: "object", properties: {} }
  },
  create_feed: {
    description: "Create a new feed item",
    parameters: { type: "object", properties: { title: { type: "string" }, content: { type: "string" }, summary: { type: "string" }, source: { type: "string" }, url: { type: "string" }, tags: { type: "array", items: { type: "string" } } }, required: ["title", "content"] }
  },
  list_feeds: {
    description: "List all feed items",
    parameters: { type: "object", properties: { page: { type: "number" }, limit: { type: "number" } } }
  },
  get_feed: {
    description: "Get a specific feed item",
    parameters: { type: "object", properties: { id: { type: "number" } }, required: ["id"] }
  },
  update_feed: {
    description: "Update an existing feed item",
    parameters: { type: "object", properties: { id: { type: "number" }, title: { type: "string" }, content: { type: "string" }, summary: { type: "string" }, source: { type: "string" }, url: { type: "string" }, tags: { type: "array", items: { type: "string" } }, status: { type: "string", enum: ["published", "draft"] } }, required: ["id"] }
  },
  delete_feed: {
    description: "Delete a feed item",
    parameters: { type: "object", properties: { id: { type: "number" } }, required: ["id"] }
  }
};

// 工具执行逻辑
function executeTool(name, args) {
  try {
    switch (name) {
      case 'create_post': {
        const { title, content, summary, tags = [], status = 'published' } = args;
        const stmt = db.prepare(
          'INSERT INTO posts (title, content, summary, tags, status) VALUES (?, ?, ?, ?, ?)'
        );
        const result = stmt.run(title, content, summary || content.substring(0, 200), JSON.stringify(tags), status);
        return { success: true, data: { id: result.lastInsertRowid, title, status } };
      }

      case 'update_post': {
        const { id, ...updates } = args;
        const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
        if (!post) return { success: false, error: 'Post not found' };

        const fields = [];
        const values = [];
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined) {
            fields.push(`${key} = ?`);
            values.push(key === 'tags' ? JSON.stringify(value) : value);
          }
        });

        if (fields.length > 0) {
          fields.push('updated_at = CURRENT_TIMESTAMP');
          values.push(id);
          db.prepare(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        }
        return { success: true, data: { id, ...updates } };
      }

      case 'delete_post': {
        db.prepare('DELETE FROM posts WHERE id = ?').run(args.id);
        return { success: true, message: `Post ${args.id} deleted` };
      }

      case 'list_posts': {
        const { page = 1, limit = 20, status = 'all' } = args;
        const offset = (page - 1) * limit;
        let query = 'SELECT * FROM posts';
        const params = [];
        if (status !== 'all') {
          query += ' WHERE status = ?';
          params.push(status);
        }
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        return { success: true, data: db.prepare(query).all(...params) };
      }

      case 'get_post': {
        const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(args.id);
        if (!post) return { success: false, error: 'Post not found' };
        const files = db.prepare('SELECT * FROM files WHERE post_id = ?').all(args.id);
        return { success: true, data: { ...post, files } };
      }

      case 'upload_file': {
        const { file_path, post_id } = args;

        // 安全检查
        if (!isPathSafe(file_path)) {
          return { success: false, error: 'Invalid file path' };
        }
        if (!isAllowedFile(file_path)) {
          return { success: false, error: 'File type not allowed' };
        }
        if (!fs.existsSync(file_path)) return { success: false, error: 'File not found' };

        // 检查文件大小
        const fileStats = fs.statSync(file_path);
        if (fileStats.size > MAX_FILE_SIZE) {
          return { success: false, error: 'File too large (max 50MB)' };
        }

        if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

        const originalName = path.basename(file_path);
        const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(originalName);
        const destPath = path.join(UPLOADS_DIR, filename);

        fs.copyFileSync(file_path, destPath);
        const mime = require('mime-types');
        const mimeType = mime.lookup(path.extname(originalName)) || 'application/octet-stream';

        const stmt = db.prepare(
          'INSERT INTO files (filename, original_name, mime_type, size, post_id) VALUES (?, ?, ?, ?, ?)'
        );
        const result = stmt.run(filename, originalName, mimeType, fileStats.size, post_id || null);

        return {
          success: true,
          data: { id: result.lastInsertRowid, filename, original_name: originalName, url: `/uploads/${filename}` }
        };
      }

      case 'upload_folder': {
        const { folder_path, post_id } = args;
        if (!fs.existsSync(folder_path)) return { success: false, error: 'Folder not found' };

        const mime = require('mime-types');
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        const uploaded = [];
        const processFolder = (dir, relativePath = '') => {
          const items = fs.readdirSync(dir);
          for (const item of items) {
            const fullPath = path.join(dir, item);
            const relPath = relativePath ? `${relativePath}/${item}` : item;
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
              processFolder(fullPath, relPath);
            } else {
              const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(item);
              const destPath = path.join(uploadsDir, filename);
              fs.copyFileSync(fullPath, destPath);

              const mimeType = mime.lookup(path.extname(item)) || 'application/octet-stream';
              const stmt = db.prepare(
                'INSERT INTO files (filename, original_name, mime_type, size, post_id) VALUES (?, ?, ?, ?, ?)'
              );
              const result = stmt.run(filename, item, mimeType, stat.size, post_id || null);

              uploaded.push({
                id: result.lastInsertRowid,
                filename,
                original_name: item,
                path: relPath,
                url: `/uploads/${filename}`
              });
            }
          }
        };

        processFolder(folder_path);
        return { success: true, data: uploaded };
      }

      case 'list_files': {
        return { success: true, data: db.prepare('SELECT * FROM files ORDER BY created_at DESC').all() };
      }

      case 'get_file': {
        const file = db.prepare('SELECT * FROM files WHERE id = ?').get(args.id);
        if (!file) return { success: false, error: 'File not found' };
        return { success: true, data: file };
      }

      case 'update_file': {
        const { id, original_name, post_id } = args;
        const file = db.prepare('SELECT * FROM files WHERE id = ?').get(id);
        if (!file) return { success: false, error: 'File not found' };

        if (original_name !== undefined) {
          db.prepare('UPDATE files SET original_name = ? WHERE id = ?').run(original_name, id);
        }
        if (post_id !== undefined) {
          db.prepare('UPDATE files SET post_id = ? WHERE id = ?').run(post_id, id);
        }
        return { success: true, data: db.prepare('SELECT * FROM files WHERE id = ?').get(id) };
      }

      case 'replace_file': {
        const { id, file_path } = args;
        const file = db.prepare('SELECT * FROM files WHERE id = ?').get(id);
        if (!file) return { success: false, error: 'File not found' };
        if (!fs.existsSync(file_path)) return { success: false, error: 'Source file not found' };

        const oldPath = path.join(__dirname, 'uploads', file.filename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

        const destPath = path.join(__dirname, 'uploads', file.filename);
        fs.copyFileSync(file_path, destPath);

        const stats = fs.statSync(destPath);
        const mime = require('mime-types');
        const mimeType = mime.lookup(path.extname(file_path)) || 'application/octet-stream';

        db.prepare('UPDATE files SET mime_type = ?, size = ? WHERE id = ?').run(mimeType, stats.size, id);
        return { success: true, data: db.prepare('SELECT * FROM files WHERE id = ?').get(id) };
      }

      case 'upload_content': {
        const { filename, content, post_id } = args;
        if (!filename || !content) return { success: false, error: 'filename and content required' };

        if (!isAllowedFile(filename)) return { success: false, error: 'File type not allowed' };

        if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

        const buf = Buffer.from(content, 'base64');
        if (buf.length > MAX_FILE_SIZE) return { success: false, error: 'File too large (max 50MB)' };

        const ext = path.extname(filename);
        const storedName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
        fs.writeFileSync(path.join(UPLOADS_DIR, storedName), buf);

        const mime = require('mime-types');
        const mimeType = mime.lookup(ext) || 'application/octet-stream';
        const stmt = db.prepare('INSERT INTO files (filename, original_name, mime_type, size, post_id) VALUES (?, ?, ?, ?, ?)');
        const result = stmt.run(storedName, filename, mimeType, buf.length, post_id || null);

        return { success: true, data: { id: result.lastInsertRowid, filename: storedName, original_name: filename, url: '/uploads/' + storedName } };
      }

      case 'replace_file_content': {
        const { id, content } = args;
        const file = db.prepare('SELECT * FROM files WHERE id = ?').get(id);
        if (!file) return { success: false, error: 'File not found' };

        const buf = Buffer.from(content, 'base64');
        if (buf.length > MAX_FILE_SIZE) return { success: false, error: 'File too large (max 50MB)' };

        const filePath = path.join(UPLOADS_DIR, file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        fs.writeFileSync(filePath, buf);

        const mime = require('mime-types');
        const mimeType = mime.lookup(path.extname(file.original_name)) || 'application/octet-stream';
        db.prepare('UPDATE files SET mime_type = ?, size = ? WHERE id = ?').run(mimeType, buf.length, id);

        return { success: true, data: db.prepare('SELECT * FROM files WHERE id = ?').get(id) };
      }

      case 'delete_file': {
        const file = db.prepare('SELECT * FROM files WHERE id = ?').get(args.id);
        if (!file) return { success: false, error: 'File not found' };

        const filePath = path.join(__dirname, 'uploads', file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        db.prepare('DELETE FROM files WHERE id = ?').run(args.id);
        return { success: true, message: `File ${args.id} deleted` };
      }

      case 'get_stats': {
        const posts = db.prepare('SELECT COUNT(*) as count FROM posts').get();
        const published = db.prepare('SELECT COUNT(*) as count FROM posts WHERE status = ?').get('published');
        const drafts = db.prepare('SELECT COUNT(*) as count FROM posts WHERE status = ?').get('draft');
        const files = db.prepare('SELECT COUNT(*) as count FROM files').get();
        const totalSize = db.prepare('SELECT COALESCE(SUM(size), 0) as total FROM files').get();
        return {
          success: true,
          data: {
            posts: { total: posts.count, published: published.count, drafts: drafts.count },
            files: { count: files.count, totalSize: totalSize.total }
          }
        };
      }

      case 'get_system_info': {
        const mem = process.memoryUsage();
        const cpu = process.cpuUsage();
        const uptimeSec = process.uptime();
        const totalCpuMs = (cpu.user + cpu.system) / 1000;
        const cpuPercent = uptimeSec > 0 ? ((totalCpuMs / (uptimeSec * 1000)) * 100).toFixed(1) : '0.0';

        const dbPath = path.join(__dirname, 'markme.db');
        const dbSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;

        let uploadsSize = 0, uploadsCount = 0;
        const uploadsDir = path.join(__dirname, 'uploads');
        if (fs.existsSync(uploadsDir)) {
          const walk = (dir) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
              const full = path.join(dir, entry.name);
              if (entry.isDirectory()) walk(full);
              else { uploadsSize += fs.statSync(full).size; uploadsCount++; }
            }
          };
          walk(uploadsDir);
        }

        const posts = db.prepare('SELECT COUNT(*) as count FROM posts').get();
        const files = db.prepare('SELECT COUNT(*) as count FROM files').get();

        return { success: true, data: {
          process: {
            pid: process.pid,
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            uptime: Math.round(process.uptime()) + 's'
          },
          memory: {
            rss: (mem.rss / 1024 / 1024).toFixed(1) + ' MB',
            heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(1) + ' MB',
            heapTotal: (mem.heapTotal / 1024 / 1024).toFixed(1) + ' MB',
            external: (mem.external / 1024 / 1024).toFixed(1) + ' MB'
          },
          cpu: { usage: cpuPercent + '%' },
          disk: {
            database: { size: (dbSize / 1024).toFixed(1) + ' KB', path: dbPath },
            uploads: { size: (uploadsSize / 1024).toFixed(1) + ' KB', count: uploadsCount, path: uploadsDir }
          },
          blog: {
            posts: posts.count,
            files: files.count
          }
        } };
      }

      case 'get_markme_config': {
        const cfg = markmeConfig.getConfig();
        if (!cfg || !cfg.server_url) return { success: true, data: { configured: false, message: 'WhaiBlog server URL not configured. Use set_markme_config to set the server URL.' } };
        return { success: true, data: { configured: true, server_url: cfg.server_url, api_key_set: !!cfg.api_key } };
      }

      case 'set_markme_config': {
        const { server_url, api_key } = args;
        markmeConfig.setConfig(server_url, api_key || '');
        return { success: true, data: { server_url, message: 'Configuration saved to ' + markmeConfig.getConfigPath() } };
      }

      case 'list_notes': {
        const { path: notePath = '', depth = 2 } = args;
        if (notePath.includes('..')) return { success: false, error: 'Invalid path' };
        const result = notes.buildTree(notePath, Math.min(depth, 8));
        if (result.error) return { success: false, error: result.error };
        return { success: true, data: result };
      }

      case 'get_note': {
        const { path: notePath } = args;
        if (!notePath) return { success: false, error: 'path is required' };
        if (notePath.includes('..')) return { success: false, error: 'Invalid path' };
        const result = notes.getNoteContent(notePath);
        if (result.error) return { success: false, error: result.error };
        return { success: true, data: result };
      }

      case 'notes_status': {
        return { success: true, data: notes.getStatus() };
      }

      case 'create_feed': {
        const { title, content, summary, source, url, tags = [] } = args;
        const result = db.prepare('INSERT INTO feeds (title, content, summary, source, url, tags) VALUES (?, ?, ?, ?, ?, ?)').run(title, content, summary || content.substring(0, 200), source || null, url || null, JSON.stringify(tags));
        return { success: true, data: { id: result.lastInsertRowid, title } };
      }
      case 'list_feeds': {
        const { page = 1, limit = 20 } = args;
        const offset = (page - 1) * limit;
        const feeds = db.prepare('SELECT * FROM feeds ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
        const total = db.prepare('SELECT COUNT(*) as count FROM feeds').get().count;
        return { success: true, data: { feeds, total, page, limit } };
      }
      case 'get_feed': {
        const feed = db.prepare('SELECT * FROM feeds WHERE id = ?').get(args.id);
        if (!feed) return { success: false, error: 'Feed not found' };
        return { success: true, data: feed };
      }
      case 'update_feed': {
        const { id, ...updates } = args;
        const feed = db.prepare('SELECT * FROM feeds WHERE id = ?').get(id);
        if (!feed) return { success: false, error: 'Feed not found' };
        const fields = [], values = [];
        Object.entries(updates).forEach(([key, value]) => { if (value !== undefined) { fields.push(`${key} = ?`); values.push(key === 'tags' ? JSON.stringify(value) : value); } });
        if (fields.length > 0) { fields.push('updated_at = CURRENT_TIMESTAMP'); values.push(id); db.prepare(`UPDATE feeds SET ${fields.join(', ')} WHERE id = ?`).run(...values); }
        return { success: true, data: { id, ...updates } };
      }
      case 'delete_feed': {
        db.prepare('DELETE FROM feeds WHERE id = ?').run(args.id);
        return { success: true, message: `Feed ${args.id} deleted` };
      }

      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// API 路由

// 列出所有工具
app.get('/tools', (req, res) => {
  res.json({
    tools: Object.entries(TOOLS).map(([name, config]) => ({
      name,
      ...config
    }))
  });
});

// 调用工具
app.post('/tools/:name', (req, res) => {
  const { name } = req.params;
  const args = req.body;

  if (!TOOLS[name]) {
    return res.status(404).json({ success: false, error: `Tool '${name}' not found` });
  }

  const result = executeTool(name, args);
  res.json(result);
});

// MCP 兼容格式调用
app.post('/call', (req, res) => {
  const { tool, arguments: args } = req.body;

  if (!tool || !TOOLS[tool]) {
    return res.status(400).json({ success: false, error: 'Invalid tool' });
  }

  const result = executeTool(tool, args || {});
  res.json(result);
});

app.listen(PORT, HOST, () => {
  const displayHost = HOST === '0.0.0.0' ? '0.0.0.0 (all interfaces)' : HOST;
  console.log(`WhaiBlog MCP HTTP Bridge running on ${displayHost}:${PORT}`);
  if (HOST === '0.0.0.0') {
    console.log(`Remote access: http://<your-server-ip>:${PORT}`);
  }
  console.log(`API Documentation:`);
  console.log(`  GET  /tools          - List all available tools`);
  console.log(`  POST /tools/:name    - Call a tool by name`);
  console.log(`  POST /call           - MCP-compatible call format`);
});
