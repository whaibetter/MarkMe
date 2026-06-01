# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# WhaiBlog - 轻量级博客系统

WhaiBlog 是一个 AI 驱动的轻量级博客系统。前端为**只读展示**，所有内容管理通过 AI 工具完成（MCP、HTTP Bridge、Python SDK）。

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

CLI 工具调用 MCP（连接独立 bridge，端口 8081）：
```bash
node tools/call-mcp.js <tool_name> '<json_args>'
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

- **三处 `executeTool()` 副本**：`bridge-router.js`、`mcp-http-bridge.js`、`mcp-server.js` 各有一份工具定义和执行逻辑。前两处返回 `{success, data}` JSON，`mcp-server.js` 返回 MCP 格式 `content: [{type: "text", text: ...}]`。修改工具行为时需同步更新三处
- 前端 SPA 使用 `history.pushState` 路由，所有非 API/静态文件请求都返回 `index.html`
- SQLite 使用 WAL journal 模式 + 外键约束
- `folders` 表已定义但当前未被任何工具使用
- 文件上传存储在 `server/uploads/`，使用时间戳重命名
- `mcp-server.js` 依赖 `@modelcontextprotocol/sdk`，但该包未在 `package.json` 中声明，需手动安装
- `/api/profile` 端点从 GitHub 获取 `whaibetter` 的 README，服务端缓存 1 小时

### 前端

- 原生 JS SPA（ES Modules），无构建步骤，所有文件直接由 Express 静态服务
- 入口：`client/index.html` → `client/js/app.js`（模块系统）
- **遗留文件**：`client/app.js`（单体旧版）和 `client/style.css`（单体旧版 CSS）仍存在但**不再被加载**，当前使用 `client/js/` 模块 + `client/css/` 模块化样式
- 主题系统：`data-theme` 属性（dark/light/nord/dracula/forest/cyberpunk/retro），用 `localStorage` 持久化，`index.html` 内联脚本防止 FOUC
- Markdown 渲染：`marked.min.js`（本地 vendor），MathJax（CDN）用于 LaTeX 公式（`$...$` 行内，`$$...$$` 块级，手动触发 `typesetMath`）
- 字体：Google Fonts Outfit + Playfair Display
- 路由：`js/router.js` 监听 `popstate` 和链接点击（`data-link` 属性），根据 URL 路径切换视图
- 阅读时间计算支持中文（400 字/分钟）和非中文（200 词/分钟）
- 调试页面：`client/debug.html`（自动测试 API 和渲染）、`client/test.html`（基础连通性测试）

### 学习笔记系统

- `server/notes-sync.js` — 从 Git 仓库（默认 Gitee）克隆/同步学习笔记到 `server/data/notes/`
- `server/notes-router.js` — 只读 API 路由（`/api/notes/*`）
- `client/js/pages/notes.js` — 前端笔记浏览页面（Markdown 渲染 + 目录树）
- 笔记仓库地址可通过 `NOTES_REPO_URL` 环境变量配置

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
| NOTES_REPO_URL | `https://gitee.com/lkwhai/learning-notes.git` | 学习笔记 Git 仓库地址 |

### 客户端配置文件

所有 Agent 共享统一配置文件 `~/.markme/config.json`：

```json
{
  "server_url": "http://117.72.196.45:8080",
  "api_key": "your-secret-key"
}
```

**配置优先级**：环境变量 > 配置文件 > 默认值

Agent 首次使用时会通过 `get_markme_config` 检查配置，未配置时询问用户并调用 `set_markme_config` 保存。

相关文件：
- `server/markme-config.js` — 共享配置模块（读写配置文件）
- `tools/call-mcp.js` — CLI 工具读取配置
- `sdk/markme_client.py` — Python SDK 读取配置

## MCP 工具

26 个工具，通过 MCP stdio 或 HTTP Bridge 均可调用：

- **配置**: `get_markme_config` (获取配置), `set_markme_config` (设置服务器地址和 API Key)
- **文章**: `create_post`, `update_post`, `delete_post`, `list_posts`, `get_post`
- **信息流**: `create_feed`, `update_feed`, `delete_feed`, `list_feeds`, `get_feed`
- **文件**: `upload_file`, `upload_folder`, `upload_content` (内容直接写入), `list_files`, `get_file`, `update_file`, `replace_file`, `replace_file_content`, `delete_file`
- **统计**: `get_stats`
- **系统监控**: `get_system_info` (返回 CPU、内存、磁盘、运行时间等系统资源使用情况)
- **学习笔记**: `list_notes` (列出笔记目录树), `get_note` (获取笔记内容), `notes_status` (同步状态)

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
| Python SDK | Python Agent | `sdk/markme_client.py`（`WhaiBlogClient` 同步 HTTP + `WhaiBlogMCPClient` 异步 MCP，`create_client()` 工厂函数） |
| Claude Code Skill | Claude Code | `skills/markme-manager.json` |
| OpenClaw Skill | OpenClaw | `skills/markme-openclaw.yaml` |
| WhaiBlog Skill | OpenClaw | `skills/openclaw/whaiblog/SKILL.md` |

## 启动脚本

| 脚本 | 作用 |
|------|------|
| `start.bat` / `start.sh` | 仅启动主服务器（`server/index.js`） |
| `start-all.bat` / `start-all.sh` | 启动主服务器 + MCP HTTP Bridge（双进程） |

## 文档

- `docs/adding-posts.md` — 添加文章教程（CLI、curl、AI Agent、文件上传）
- `docs/agent-configuration.md` — 7 种 Agent 集成方式的详细对比和故障排除

## 测试

无正式测试框架。可用的测试工具：
- `test-mcp-bridge.js` — 手动 Bridge 测试脚本（注意：端口硬编码为 3001，已过时）
- `client/debug.html` — 浏览器内诊断页面
- `test_screenshot.py` — Playwright 截图测试（桌面 1280x900 + 移动端 390x844）

## 已知问题

- `.gitignore` 规则被已跟踪文件绕过（`*.db`、`server/.env` 等在 .gitignore 添加前已提交）

## 安全

- 默认无认证，`bridge-router.js` 和 `mcp-http-bridge.js` 支持可选的 API key 认证
- 有路径遍历保护（`isPathSafe`）和文件扩展名白名单
- 仅适用于本地/可信网络环境
