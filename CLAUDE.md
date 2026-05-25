# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# MarkMe - 轻量级博客系统

MarkMe 是一个 AI 驱动的轻量级博客系统。前端为**只读展示**，所有内容管理通过 AI 工具完成（MCP、HTTP Bridge、Python SDK）。

## 技术栈

- **后端**: Node.js + Express + better-sqlite3（同步 API）
- **前端**: 原生 HTML/CSS/JS SPA + marked.js
- **数据库**: SQLite（WAL 模式，文件: `server/markme.db`）

## 开发命令

```bash
cd server
npm install
npm run dev          # node --watch index.js（开发模式，文件变更自动重启）
npm start            # node index.js（生产模式）
```

启动所有服务（主服务器 + MCP Bridge）：
```bash
# Windows
start-all.bat
# Linux/Mac
./start-all.sh
```

## 架构

### 三层访问入口

1. **主服务器** (`server/index.js`, 默认端口 8080)
   - 提供前端静态文件服务（`../client/`）
   - 只读 REST API（`/api/*`）
   - 挂载 bridge-router 在 `/bridge` 路径下（与主服务器同端口，无需单独启动 bridge）

2. **MCP Stdio 服务器** (`server/mcp-server.js`)
   - 通过 stdin/stdout 通信，供 Claude Desktop 使用
   - 依赖 `@modelcontextprotocol/sdk`（注意：未在 package.json 中声明）

3. **MCP HTTP Bridge** (`server/mcp-http-bridge.js`, 默认端口 8081)
   - 独立 Express 服务，将 MCP 工具暴露为 HTTP 端点
   - 支持 Bearer token 认证（`MARKME_API_KEY` 环境变量）
   - 也可通过主服务器的 `/bridge/*` 路径访问（无需启动此独立服务）

### 关键设计

- `bridge-router.js` 和 `mcp-http-bridge.js` 包含重复的工具定义和 `executeTool` 逻辑，修改工具行为时需同步更新两处
- 前端 SPA 使用 `history.pushState` 路由，所有非 API/静态文件请求都返回 `index.html`
- SQLite 使用 WAL journal 模式 + 外键约束
- `folders` 表已定义但当前未被任何工具使用
- 文件上传存储在 `server/uploads/`，使用时间戳重命名

### 数据库表

- `posts`: id, title, content, summary, tags (JSON text), status (published/draft), created_at, updated_at
- `files`: id, filename (存储名), original_name, mime_type, size, post_id (FK), created_at
- `folders`: id, name, path (UNIQUE), parent_id (自引用 FK CASCADE), created_at

### 配置

`server/config.js` 从环境变量读取配置，`server/.env` 覆盖默认值：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 8080 | 主服务器端口 |
| MCP_BRIDGE_PORT | 8081 | MCP HTTP Bridge 端口 |
| HOST | 0.0.0.0 | 监听地址 |
| API_KEY | (空) | Bearer token 认证 |
| MAX_FILE_SIZE | 50MB | 文件大小限制 |

## MCP 工具

16 个工具，通过 MCP stdio 或 HTTP Bridge 均可调用：

- **文章**: `create_post`, `update_post`, `delete_post`, `list_posts`, `get_post`
- **文件**: `upload_file`, `upload_folder`, `upload_content` (内容直接写入), `list_files`, `get_file`, `update_file`, `replace_file`, `replace_file_content`, `delete_file`
- **统计**: `get_stats`
- **系统监控**: `get_system_info` (返回 CPU、内存、磁盘、运行时间等系统资源使用情况)

## HTTP Bridge 调用示例

```bash
# 通过主服务器的 bridge 路由（推荐，无需单独启动 bridge）
curl -X POST http://localhost:8080/bridge/tools/create_post \
  -H "Content-Type: application/json" \
  -d '{"title":"标题","content":"内容","tags":["标签"]}'

# 查询系统资源使用情况
curl -X POST http://localhost:8080/bridge/tools/get_system_info \
  -H "Content-Type: application/json" \
  -d '{}'

# CLI 工具
node tools/call-mcp.js create_post '{"title":"标题","content":"内容"}'
```

## AI Agent 集成

| 方式 | 适用场景 | 文件 |
|------|----------|------|
| MCP Stdio | Claude Desktop | `server/mcp-server.js` |
| HTTP Bridge | 自定义 Agent | `server/mcp-http-bridge.js` 或 `/bridge` 路由 |
| Python SDK | Python Agent | `sdk/markme_client.py` |
| Claude Code Skill | Claude Code | `skills/markme-manager.json` |
| OpenClaw Skill | OpenClaw | `skills/markme-openclaw.yaml` |

## 安全

- 默认无认证，`bridge-router.js` 和 `mcp-http-bridge.js` 支持可选的 API key 认证
- 有路径遍历保护（`isPathSafe`）和文件扩展名白名单
- 仅适用于本地/可信网络环境
