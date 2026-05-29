# AGENTS.md

## Dev Commands

```bash
cd server
npm install
npm run dev          # node --watch index.js (auto-restart on change)
npm start            # node index.js (production)
```

No lint, test, typecheck, or formatter scripts exist. Verify changes manually.

CLI tool to call MCP tools via HTTP bridge:
```bash
node tools/call-mcp.js <tool_name> '<json_args>'
```

## Critical: Triple executeTool() Copies

Tool logic is duplicated in **three files**. When modifying tool behavior, update all three:

- `server/bridge-router.js` — returns `{success, data}` JSON
- `server/mcp-http-bridge.js` — returns `{success, data}` JSON
- `server/mcp-server.js` — returns MCP format `{content: [{type: "text", text: ...}]}`

The first two share the same return format. `mcp-server.js` wraps results differently for the MCP protocol.

## Architecture

- **Main server** (`server/index.js`, port 8080): static files for `client/`, read-only REST API at `/api/*`, bridge mounted at `/bridge/*`
- **MCP Stdio** (`server/mcp-server.js`): for Claude Desktop, communicates via stdin/stdout
- **MCP HTTP Bridge** (`server/mcp-http-bridge.js`, port 8081): standalone Express service; also reachable via main server's `/bridge/*` (no need to start separately)
- **Frontend**: native JS SPA (ES Modules), no build step, served directly by Express
- **Database**: SQLite via `better-sqlite3` (synchronous API), WAL mode, file at `server/markme.db`
- **Notes sync**: learning-notes repo auto-cloned from gitee on startup into `server/learning-notes/`

## Dependency Gotcha

`mcp-server.js` requires `@modelcontextprotocol/sdk` which is **not declared in package.json**. Install manually if needed:
```bash
cd server && npm install @modelcontextprotocol/sdk
```

## Frontend

- Entry: `client/index.html` → `client/js/app.js` (module system)
- Router: `client/js/router.js` uses `history.pushState`, listens for `data-link` attributes
- CSS modules in `client/css/`, loaded individually from `index.html`
- **Dead files**: `client/app.js` and `client/style.css` are legacy monoliths, NOT loaded by the current app
- Theme: `data-theme` attr on `<html>`, persisted in `localStorage` as `markme-theme`
- MathJax loaded from CDN, `$...$` inline, `$$...$$` block; call `typesetMath()` after rendering

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

Agent client config stored at `~/.markme/config.json` (read via `markme-config.js`).

## Database

SQLite schema created in `server/db.js`:
- `posts`: id, title, content, summary, tags (JSON text), status (published/draft), timestamps
- `files`: id, filename (stored name), original_name, mime_type, size, post_id (FK), created_at
- `folders`: defined but **unused** by any tool

## Known Issues

- `README.md` says port 3000 — actual default is 8080
- `test-mcp-bridge.js` has port hardcoded to 3001 (stale)
- `.gitignore` rules bypassed by already-tracked files (`*.db`, `server/.env`)
