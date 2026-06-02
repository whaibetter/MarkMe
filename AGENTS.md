# AGENTS.md

## Dev Commands

```bash
cd server
npm install
npm run dev          # node --watch index.js (auto-restart on change)
npm start            # node index.js (production)
```

No lint, test, typecheck, or formatter scripts exist. Verify changes manually.

CLI tool defaults to port **8081** (standalone bridge), not 8080:
```bash
node tools/call-mcp.js <tool_name> '<json_args>'   # → port 8081
# Use MARKME_HOST/MCP_BRIDGE_PORT env vars or ~/.whaiblog/config.json to redirect
```

Start scripts: `start.bat` / `start.sh` (main server only), `start-all.bat` / `start-all.sh` (+ HTTP bridge).

## Critical: Triple executeTool() Copies

Tool logic is duplicated in **three files**. When modifying tool behavior, update all three:

- `server/bridge-router.js` — returns `{success, data}` JSON
- `server/mcp-http-bridge.js` — returns `{success, data}` JSON
- `server/mcp-server.js` — returns MCP format `{content: [{type: "text", text: ...}]}`

`mcp-server.js` also **lacks** `isPathSafe()` / `isAllowedFile()` security checks that the other two have.

## Dependency Gotcha

`mcp-server.js` requires `@modelcontextprotocol/sdk` which is **not declared in package.json**:
```bash
cd server && npm install @modelcontextprotocol/sdk
```

## Architecture

- **Main server** (`server/index.js`, port 8080): static files for `client/`, read-only REST API at `/api/*`, bridge mounted at `/bridge/*`
- **MCP Stdio** (`server/mcp-server.js`): for Claude Desktop, communicates via stdin/stdout
- **MCP HTTP Bridge** (`server/mcp-http-bridge.js`, port 8081): standalone Express service; also reachable via main server's `/bridge/*` (no need to start separately)
- **Frontend**: native JS SPA (ES Modules), no build step, served directly by Express
- **Database**: SQLite via `better-sqlite3` (synchronous API), WAL mode + foreign_keys ON, file at `server/whaiblog.db`
- **Notes sync**: learning-notes repo auto-cloned from gitee **asynchronously** on startup into `server/learning-notes/`
- **RSS cron**: `node-cron` fetches external RSS sources every 30 min

## Security

API key is optional (`MARKME_API_KEY` env var). When set:

| Location | Modification auth | Read auth |
|----------|-----------------|-----------|
| `bridge-router.js` (`/bridge/*` on main server) | ✅ Bearer token required | ✅ Bearer token required |
| `mcp-http-bridge.js` (standalone port 8081) | ✅ Bearer token required | ✅ Bearer token required |
| `mcp-server.js` (stdio) | ✅ `api_key` arg validated per call | ❌ No auth |
| `index.js` `/api/rss/*` | ✅ Bearer token required | ❌ No auth |
| `index.js` `/api/*` GET routes | N/A | ❌ No auth (public) |

`call-mcp.js` and Python SDK both read `~/.whaiblog/config.json` and send the Bearer token automatically.

For `mcp-server.js`, pass `api_key` in tool arguments (e.g. `create_post({"title":"...","content":"...","api_key":"your-key"})`).

## MCP Tools (26 total)

- **Config**: `get_whaiblog_config`, `set_whaiblog_config`
- **Posts**: `create_post`, `update_post`, `delete_post`, `list_posts`, `get_post`
- **Feeds**: `create_feed`, `update_feed`, `delete_feed`, `list_feeds`, `get_feed`
- **Files**: `upload_file`, `upload_content` (base64), `upload_folder`, `list_files`, `get_file`, `update_file`, `replace_file` (multipart), `replace_file_content` (base64), `delete_file`
- **Stats**: `get_stats`
- **System**: `get_system_info`
- **Notes**: `list_notes`, `get_note`, `notes_status`

`multer` is setup in `index.js` but **unused** by tools — all file ops use raw `fs` operations.

## Config

`server/.env` overrides defaults (see `server/.env.example`). `server/config.js` reads env vars:

| Variable | Default | Purpose |
|----------|---------|---------|
| PORT | 8080 | Main server |
| MCP_BRIDGE_PORT | 8081 | HTTP bridge |
| MARKME_HOST | 0.0.0.0 | Listen address |
| MARKME_API_KEY | (empty) | Bearer token auth (optional) |
| DATA_DIR | `__dirname` | Data root (DB, uploads, notes) |
| NOTES_REPO_URL | gitee repo URL | Learning notes source |

Agent client config stored at `~/.whaiblog/config.json` (read via `whaiblog-config.js`).
Config priority: env vars > `~/.whaiblog/config.json` > defaults.

## Database

Created in `server/db.js`. 5 tables:

- `posts`: id, title, content, summary, tags (JSON text), status (published/draft), timestamps
- `feeds`: id, title, content, summary, source, url, tags (JSON text), format (markdown/html/text), status, timestamps
- `files`: id, filename (stored name), original_name, mime_type, size, post_id (FK), created_at
- `folders`: id, name, path (UNIQUE), parent_id (self-ref FK), created_at — **defined but unused by any tool**
- `rss_sources`: id, url (UNIQUE), title, description, last_fetched, fetch_interval, enabled, error_count, last_error, timestamps

## Frontend

- Entry: `client/index.html` → `client/js/app.js` (module system)
- Router: `client/js/router.js` uses `history.pushState`, listens for `data-link` attributes
- CSS modules in `client/css/`, loaded individually from `index.html`
- **Dead files**: `client/app.js` and `client/style.css` are legacy monoliths, NOT loaded by the current app
- Theme: `data-theme` attr on `<html>`, persisted in `localStorage` as `whaiblog-theme`
- MathJax loaded from CDN, `$...$` inline, `$$...$$` block; call `typesetMath()` after rendering

## Known Issues

- `README.md` says port 3000 — actual default is 8080
- `test-mcp-bridge.js` has port hardcoded to 3001 (stale)
- `.gitignore` rules bypassed by already-tracked files (`server/.env`)
- Docker maps host port 17111 → container 8080 (doc mismatch)
