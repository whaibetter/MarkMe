#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const db = require('./db');
const path = require('path');
const fs = require('fs');
const markmeConfig = require('./markme-config');
const notes = require('./notes-sync');

const server = new Server(
  { name: 'markme-blog', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'create_post',
      description: 'Create a new blog post',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Post title' },
          content: { type: 'string', description: 'Post content (markdown)' },
          summary: { type: 'string', description: 'Post summary' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Post tags' },
          status: { type: 'string', enum: ['published', 'draft'], description: 'Post status' }
        },
        required: ['title', 'content']
      }
    },
    {
      name: 'update_post',
      description: 'Update an existing blog post',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Post ID' },
          title: { type: 'string' },
          content: { type: 'string' },
          summary: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['published', 'draft'] }
        },
        required: ['id']
      }
    },
    {
      name: 'delete_post',
      description: 'Delete a blog post',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Post ID' }
        },
        required: ['id']
      }
    },
    {
      name: 'list_posts',
      description: 'List all blog posts',
      inputSchema: {
        type: 'object',
        properties: {
          page: { type: 'number' },
          limit: { type: 'number' },
          status: { type: 'string', enum: ['published', 'draft', 'all'] }
        }
      }
    },
    {
      name: 'get_post',
      description: 'Get a specific blog post',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Post ID' }
        },
        required: ['id']
      }
    },
    {
      name: 'upload_file',
      description: 'Upload a file to the blog',
      inputSchema: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Absolute path to the file' },
          post_id: { type: 'number', description: 'Associated post ID (optional)' }
        },
        required: ['file_path']
      }
    },
    {
      name: 'upload_folder',
      description: 'Upload all files from a folder to the blog',
      inputSchema: {
        type: 'object',
        properties: {
          folder_path: { type: 'string', description: 'Absolute path to the folder' },
          post_id: { type: 'number', description: 'Associated post ID (optional)' }
        },
        required: ['folder_path']
      }
    },
    {
      name: 'list_files',
      description: 'List all uploaded files',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'get_stats',
      description: 'Get blog statistics (post count, file count)',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'get_file',
      description: 'Get file details by ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'File ID' }
        },
        required: ['id']
      }
    },
    {
      name: 'update_file',
      description: 'Update file metadata (original_name, post_id)',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'File ID' },
          original_name: { type: 'string', description: 'New display name' },
          post_id: { type: 'number', description: 'Associate with post (null to unlink)' }
        },
        required: ['id']
      }
    },
    {
      name: 'replace_file',
      description: 'Replace file content with a new file (server-side path)',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'File ID' },
          file_path: { type: 'string', description: 'Path to new file' }
        },
        required: ['id', 'file_path']
      }
    },
    {
      name: 'upload_content',
      description: 'Upload a file by content (base64) - for remote clients',
      inputSchema: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'File name with extension' },
          content: { type: 'string', description: 'File content as base64 encoded string' },
          post_id: { type: 'number', description: 'Associated post ID (optional)' }
        },
        required: ['filename', 'content']
      }
    },
    {
      name: 'replace_file_content',
      description: 'Replace file content by base64 content - for remote clients',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'File ID' },
          content: { type: 'string', description: 'New file content as base64 encoded string' }
        },
        required: ['id', 'content']
      }
    },
    {
      name: 'delete_file',
      description: 'Delete an uploaded file',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'File ID' }
        },
        required: ['id']
      }
    }
  , {
    name: 'get_system_info',
    description: 'Get system resource usage of the WhaiBlog application (CPU, memory, disk, uptime)',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_markme_config',
    description: 'Get WhaiBlog client configuration (server URL, API key status)',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'set_markme_config',
    description: 'Set WhaiBlog client configuration (server URL and optional API key)',
    inputSchema: {
      type: 'object',
      properties: {
        server_url: { type: 'string', description: 'WhaiBlog server URL, e.g. http://117.72.196.45:8080' },
        api_key: { type: 'string', description: 'API key for authentication (optional)' }
      },
      required: ['server_url']
    }
  },
  {
    name: 'list_notes',
    description: 'List notes directory tree from the learning-notes repository (read-only)',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path within repo, default root' },
        depth: { type: 'number', description: 'Tree depth, default 2' }
      }
    }
  },
  {
    name: 'get_note',
    description: 'Get the content of a specific note file (read-only)',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the file' }
      },
      required: ['path']
    }
  },
  {
    name: 'notes_status',
    description: 'Get notes repository sync status (cloning/ready/error)',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'create_post': {
        const { title, content, summary, tags = [], status = 'published' } = args;
        const stmt = db.prepare(
          'INSERT INTO posts (title, content, summary, tags, status) VALUES (?, ?, ?, ?, ?)'
        );
        const result = stmt.run(title, content, summary || content.substring(0, 200), JSON.stringify(tags), status);
        return { content: [{ type: 'text', text: JSON.stringify({ id: result.lastInsertRowid, title, status }) }] };
      }

      case 'update_post': {
        const { id, ...updates } = args;
        const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
        if (!post) return { content: [{ type: 'text', text: 'Post not found' }], isError: true };

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

        return { content: [{ type: 'text', text: JSON.stringify({ id, ...updates }) }] };
      }

      case 'delete_post': {
        db.prepare('DELETE FROM posts WHERE id = ?').run(args.id);
        return { content: [{ type: 'text', text: `Post ${args.id} deleted` }] };
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

        const posts = db.prepare(query).all(...params);
        return { content: [{ type: 'text', text: JSON.stringify(posts, null, 2) }] };
      }

      case 'get_post': {
        const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(args.id);
        if (!post) return { content: [{ type: 'text', text: 'Post not found' }], isError: true };
        const files = db.prepare('SELECT * FROM files WHERE post_id = ?').all(args.id);
        return { content: [{ type: 'text', text: JSON.stringify({ ...post, files }, null, 2) }] };
      }

      case 'upload_file': {
        const { file_path, post_id } = args;
        if (!fs.existsSync(file_path)) {
          return { content: [{ type: 'text', text: 'File not found' }], isError: true };
        }

        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        const originalName = path.basename(file_path);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(originalName);
        const filename = uniqueSuffix + ext;
        const destPath = path.join(uploadsDir, filename);

        fs.copyFileSync(file_path, destPath);
        const stats = fs.statSync(destPath);

        const stmt = db.prepare(
          'INSERT INTO files (filename, original_name, mime_type, size, post_id) VALUES (?, ?, ?, ?, ?)'
        );
        const mime = require('mime-types');
        const mimeType = mime.lookup(ext) || 'application/octet-stream';
        const result = stmt.run(filename, originalName, mimeType, stats.size, post_id || null);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              id: result.lastInsertRowid,
              filename,
              original_name: originalName,
              url: `/uploads/${filename}`
            })
          }]
        };
      }

      case 'upload_folder': {
        const { folder_path, post_id } = args;
        if (!fs.existsSync(folder_path)) {
          return { content: [{ type: 'text', text: 'Folder not found' }], isError: true };
        }

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
              const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
              const ext = path.extname(item);
              const filename = uniqueSuffix + ext;
              const destPath = path.join(uploadsDir, filename);

              fs.copyFileSync(fullPath, destPath);
              const mimeType = mime.lookup(ext) || 'application/octet-stream';

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
        return { content: [{ type: 'text', text: JSON.stringify(uploaded, null, 2) }] };
      }

      case 'list_files': {
        const files = db.prepare('SELECT * FROM files ORDER BY created_at DESC').all();
        return { content: [{ type: 'text', text: JSON.stringify(files, null, 2) }] };
      }

      case 'get_stats': {
        const posts = db.prepare('SELECT COUNT(*) as count FROM posts').get();
        const published = db.prepare('SELECT COUNT(*) as count FROM posts WHERE status = ?').get('published');
        const drafts = db.prepare('SELECT COUNT(*) as count FROM posts WHERE status = ?').get('draft');
        const files = db.prepare('SELECT COUNT(*) as count FROM files').get();
        const totalSize = db.prepare('SELECT COALESCE(SUM(size), 0) as total FROM files').get();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              posts: { total: posts.count, published: published.count, drafts: drafts.count },
              files: { count: files.count, totalSize: totalSize.total }
            }, null, 2)
          }]
        };
      }

      case 'get_file': {
        const file = db.prepare('SELECT * FROM files WHERE id = ?').get(args.id);
        if (!file) return { content: [{ type: 'text', text: 'File not found' }], isError: true };
        return { content: [{ type: 'text', text: JSON.stringify(file, null, 2) }] };
      }

      case 'update_file': {
        const { id, original_name, post_id } = args;
        const file = db.prepare('SELECT * FROM files WHERE id = ?').get(id);
        if (!file) return { content: [{ type: 'text', text: 'File not found' }], isError: true };

        if (original_name !== undefined) {
          db.prepare('UPDATE files SET original_name = ? WHERE id = ?').run(original_name, id);
        }
        if (post_id !== undefined) {
          db.prepare('UPDATE files SET post_id = ? WHERE id = ?').run(post_id, id);
        }

        const updated = db.prepare('SELECT * FROM files WHERE id = ?').get(id);
        return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
      }

      case 'replace_file': {
        const { id, file_path } = args;
        const file = db.prepare('SELECT * FROM files WHERE id = ?').get(id);
        if (!file) return { content: [{ type: 'text', text: 'File not found' }], isError: true };
        if (!fs.existsSync(file_path)) return { content: [{ type: 'text', text: 'Source file not found' }], isError: true };

        const oldPath = path.join(__dirname, 'uploads', file.filename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

        const ext = path.extname(file_path);
        const filename = file.filename;
        const destPath = path.join(__dirname, 'uploads', filename);
        fs.copyFileSync(file_path, destPath);

        const stats = fs.statSync(destPath);
        const mime = require('mime-types');
        const mimeType = mime.lookup(ext) || 'application/octet-stream';

        db.prepare('UPDATE files SET mime_type = ?, size = ? WHERE id = ?').run(mimeType, stats.size, id);

        const updated = db.prepare('SELECT * FROM files WHERE id = ?').get(id);
        return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
      }

      case 'upload_content': {
        const { filename, content, post_id } = args;
        if (!filename || !content) return { content: [{ type: 'text', text: 'filename and content required' }], isError: true };

        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        const buf = Buffer.from(content, 'base64');
        const ext = path.extname(filename);
        const storedName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
        fs.writeFileSync(path.join(uploadsDir, storedName), buf);

        const mime = require('mime-types');
        const mimeType = mime.lookup(ext) || 'application/octet-stream';
        const stmt = db.prepare('INSERT INTO files (filename, original_name, mime_type, size, post_id) VALUES (?, ?, ?, ?, ?)');
        const result = stmt.run(storedName, filename, mimeType, buf.length, post_id || null);

        return { content: [{ type: 'text', text: JSON.stringify({ id: result.lastInsertRowid, filename: storedName, original_name: filename, url: '/uploads/' + storedName }) }] };
      }

      case 'replace_file_content': {
        const { id, content } = args;
        const file = db.prepare('SELECT * FROM files WHERE id = ?').get(id);
        if (!file) return { content: [{ type: 'text', text: 'File not found' }], isError: true };

        const buf = Buffer.from(content, 'base64');
        const filePath = path.join(__dirname, 'uploads', file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        fs.writeFileSync(filePath, buf);

        const mime = require('mime-types');
        const mimeType = mime.lookup(path.extname(file.original_name)) || 'application/octet-stream';
        db.prepare('UPDATE files SET mime_type = ?, size = ? WHERE id = ?').run(mimeType, buf.length, id);

        const updated = db.prepare('SELECT * FROM files WHERE id = ?').get(id);
        return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
      }

      case 'delete_file': {
        const file = db.prepare('SELECT * FROM files WHERE id = ?').get(args.id);
        if (!file) return { content: [{ type: 'text', text: 'File not found' }], isError: true };

        const filePath = path.join(__dirname, 'uploads', file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        db.prepare('DELETE FROM files WHERE id = ?').run(args.id);

        return { content: [{ type: 'text', text: `File ${args.id} deleted` }] };
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

        return { content: [{ type: 'text', text: JSON.stringify({
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
        }, null, 2) }] };
      }

      case 'get_markme_config': {
        const config = markmeConfig.getConfig();
        if (!config || !config.server_url) {
          return { content: [{ type: 'text', text: JSON.stringify({ configured: false, message: 'WhaiBlog server URL not configured. Use set_markme_config to set the server URL.' }) }] };
        }
        return { content: [{ type: 'text', text: JSON.stringify({ configured: true, server_url: config.server_url, api_key_set: !!config.api_key }) }] };
      }

      case 'set_markme_config': {
        const { server_url, api_key } = args;
        markmeConfig.setConfig(server_url, api_key || '');
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, server_url, message: 'Configuration saved to ' + markmeConfig.getConfigPath() }) }] };
      }

      case 'list_notes': {
        const { path: notePath = '', depth = 2 } = args;
        if (notePath.includes('..')) return { content: [{ type: 'text', text: 'Invalid path' }], isError: true };
        const result = notes.buildTree(notePath, Math.min(depth, 8));
        if (result.error) return { content: [{ type: 'text', text: result.error }], isError: true };
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'get_note': {
        const { path: notePath } = args;
        if (!notePath) return { content: [{ type: 'text', text: 'path is required' }], isError: true };
        if (notePath.includes('..')) return { content: [{ type: 'text', text: 'Invalid path' }], isError: true };
        const result = notes.getNoteContent(notePath);
        if (result.error) return { content: [{ type: 'text', text: result.error }], isError: true };
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'notes_status': {
        return { content: [{ type: 'text', text: JSON.stringify(notes.getStatus(), null, 2) }] };
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('WhaiBlog MCP server running on stdio');
}

main().catch(console.error);
