# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

# WhaiBlog - 轻量级博客系统

WhaiBlog 是一个 AI 驱动的轻量级博客系统。前端为**只读展示**，所有内容管理通过 AI 工具完成（MCP、HTTP Bridge、Python SDK）。

## 技术栈

- **后端**: Node.js + Express + better-sqlite3（同步 API）
- **前端**: 原生 HTML/CSS/JS SPA + marked.js
- **数据库**: SQLite（WAL 模式，文件: `server/whaiblog.db`）

## 项目结构

```
MarkMe/
├── client/                 # 前端 SPA（原生 HTML/CSS/JS，无构建步骤）
│   ├── index.html          # 入口文件，加载所有 CSS 和 JS 模块
│   ├── js/                 # ES Modules（app.js, router.js, i18n.js, pages/, components/）
│   └── css/                # 模块化样式（base/layout/components 等）
├── server/                 # 后端服务
│   ├── index.js            # 主服务器（Express + 静态文件 + 只读 API + Bridge 路由）
│   ├── mcp-server.js       # MCP Stdio 服务器（供 Codex Desktop 使用）
│   ├── mcp-http-bridge.js  # MCP HTTP Bridge（可选，已挂载到主服务器 /bridge 路径）
│   ├── bridge-router.js    # Bridge 路由（挂载到主服务器的 /bridge 路径）
│   ├── rss-fetcher.js      # RSS 抓取器（定时任务）
│   ├── rss.js              # RSS XML 生成
│   ├── notes-sync.js       # 学习笔记同步（从 Git 仓库克隆/更新）
│   ├── notes-router.js     # 笔记 API 路由（/api/notes/*）
│   ├── db.js               # SQLite 数据库（WAL 模式）
│   ├── config.js           # 配置（环境变量 → 默认值）
│   ├── whaiblog-config.js  # 共享配置模块（读写 ~/.whaiblog/config.json）
│   ├── article-extractor.js # 文章正文提取（用于 RSS 内容过短时自动补充）
│   └── uploads/            # 上传文件存储
├── sdk/                    # Python SDK（whaiblog_client.py）
├── tools/                  # CLI 工具（call-mcp.js）
├── skills/                 # AI Skill 定义文件（Codex / OpenClaw）
├── docs/                   # 文档
└── whaiblog.js             # 服务管理脚本（启动/停止/重启/状态）
```

## 开发命令

### 后端服务
```bash
cd server
npm install
npm run dev          # 开发模式（node --watch index.js，文件变更自动重启）
npm start            # 生产模式（node index.js）
```

### 管理脚本
```bash
# 交互式菜单
node whaiblog.js

# 快速启动/停止
node whaiblog.js --start     # 启动主服务器
node whaiblog.js --stop      # 停止服务
node whaiblog.js --restart   # 重启服务（自动备份数据库 + git pull）
node whaiblog.js --status    # 查看运行状态
```

### 一键启动所有服务（主服务器 + MCP HTTP Bridge）
```bash
# Windows
start-all.bat
# Linux/Mac
./start-all.sh
```

### MCP 工具调用
```bash
# 通过 CLI 工具（连接独立 bridge，端口 8081）
node tools/call-mcp.js <tool_name> '<json_args>'

# 通过 curl 调用 HTTP Bridge（推荐，无需单独启动 bridge）
curl -X POST http://localhost:8080/bridge/tools/<tool_name> \
  -H "Content-Type: application/json" \
  -d '<json_params>'
```

## 架构

### ⚠️ 重要：部署说明

**本项目运行在本地机器上**，通过 FRP 反向代理或直接暴露端口对外提供服务。

- 本地机器：运行 WhaiBlog 服务（默认端口 8080）
- 部署命令：`node whaiblog.js --restart`（在本地执行）
- 客户端配置：通过 `~/.whaiblog/config.json` 或环境变量 `MARKME_HOST` 设置实际服务器地址
- 文档中的 `http://your-server:8080` 为占位符，部署时替换为实际地址

### 三层访问入口

1. **主服务器** (`server/index.js`, 默认端口 8080)
   - 提供前端静态文件服务（`../client/`）
   - 只读 REST API（`/api/*`）
   - 挂载 bridge-router 在 `/bridge` 路径下（与主服务器同端口，无需单独启动 bridge）

2. **MCP Stdio 服务器** (`server/mcp-server.js`)
   - 通过 stdin/stdout 通信，供 Codex Desktop 使用
   - 依赖 `@modelcontextprotocol/sdk`（注意：未在 package.json 中声明）

3. **MCP HTTP Bridge** (`server/mcp-http-bridge.js`, 默认端口 8081)
   - 独立 Express 服务，将 MCP 工具暴露为 HTTP 端点
   - 支持 Bearer token 认证（`MARKME_API_KEY` 环境变量）
   - 也可通过主服务器的 `/bridge/*` 路径访问（无需启动此独立服务）

### 关键设计

- **三处 `executeTool()` 副本**：`bridge-router.js`、`mcp-http-bridge.js`、`mcp-server.js` 各有一份工具定义和执行逻辑。前两处返回 `{success, data}` JSON，`mcp-server.js` 返回 MCP 格式 `content: [{type: "text", text: ...}]`。修改工具行为时需同步更新三处
- 前端 SPA 使用 `history.pushState` 路由，所有非 API/静态文件请求都返回 `index.html`
- 请求体解析：自定义 UTF-8 解析中间件，自动检测 GBK/GB18030 编码并转换为 UTF-8（依赖 `iconv-lite`）
- 信息流支持按来源筛选：`/api/feeds?source=xxx`，`/api/feeds/sources` 返回所有来源列表
- 国际化：`js/i18n.js` 提供 `t(key)` 翻译函数，支持 zh/en 切换，偏好存储在 `localStorage('whaiblog-lang')`
- 模态框：`js/components/modal.js` 提供 `openModal(title, html)` 和 `openMarkdownModal(title, md)` 复用 `.preview-modal` CSS
- SQLite 使用 WAL journal 模式 + 外键约束
- 文件上传存储在 `server/uploads/`，使用时间戳重命名
- `mcp-server.js` 依赖 `@modelcontextprotocol/sdk`（已在 package.json 中声明）
- `/api/profile` 端点从 GitHub 获取 `whaibetter` 的 README，服务端缓存 1 小时
- **服务管理**：`whaiblog.js` 提供交互式和命令行方式管理服务（启动/停止/重启/状态），PID 和日志文件存储在 `.whaiblog.pid` 和 `.whaiblog.log`

### 前端

- 原生 JS SPA（ES Modules），无构建步骤，所有文件直接由 Express 静态服务
- 入口：`client/index.html` → `client/js/app.js`（模块系统）
- **遗留文件**：`client/app.js`（单体旧版）和 `client/style.css`（单体旧版 CSS）仍存在但**不再被加载**，当前使用 `client/js/` 模块 + `client/css/` 模块化样式
- 主题系统：`data-theme` 属性（dark/light/nord/dracula/forest/cyberpunk/retro），用 `localStorage` 持久化，`index.html` 内联脚本防止 FOUC
- CSS 模块化：`client/css/` 下按职责拆分（base/layout/components/hero/post-card/post-detail/toc/tags/modal/profile/notes/feed/rss-reader/responsive），在 `index.html` 中按顺序加载
- Markdown 渲染：`marked.min.js`（本地 vendor），MathJax（CDN）用于 LaTeX 公式（`$...$` 行内，`$$...$$` 块级，手动触发 `typesetMath`）
- 字体：Google Fonts Outfit + Playfair Display
- 路由：`js/router.js` 监听 `popstate` 和链接点击（`data-link` 属性），根据 URL 路径切换视图
  - 默认页面：`/?section=feed`（信息流）
  - 其他页面：`/?section=blogs`、`/?section=notes`、`/?section=about`、`/?section=rss`
  - 文章详情：`/post/:id`
  - 标签过滤：`/?section=blogs&tag=xxx`
- 阅读时间计算支持中文（400 字/分钟）和非中文（200 词/分钟）
- 调试页面：`client/debug.html`（自动测试 API 和渲染）、`client/test.html`（基础连通性测试）

### 学习笔记系统

- `server/notes-sync.js` — 从 Git 仓库（默认 Gitee）克隆/同步学习笔记到 `server/data/notes/`
- `server/notes-router.js` — 只读 API 路由（`/api/notes/*`）
- `client/js/pages/notes.js` — 前端笔记浏览页面（Markdown 渲染 + 目录树）
- 笔记仓库地址可通过 `NOTES_REPO_URL` 环境变量配置

### RSS 阅读器系统

- `server/rss.js` — RSS XML 生成（`/rss/posts.xml`、`/rss/feeds.xml`、`/rss/all.xml`）
- `server/rss-fetcher.js` — 外部 RSS 源抓取，支持定时任务（`/api/rss/sources`、`/api/rss/fetch`）
- `client/js/pages/rss-reader.js` — 前端 RSS 阅读页面（`/?section=rss`）
- **权限控制**：GET 端点公开，POST/PUT/DELETE 端点需 `API_KEY` 认证（`Authorization: Bearer <key>`）。未配置 `API_KEY` 时全部开放。前端通过 `/api/rss/auth` 检查是否需要认证，API Key 存储在 `localStorage('whaiblog-rss-key')`

### 数据库表

- `posts`: id, title, content, summary, tags (JSON text), status (published/draft), created_at, updated_at
- `feeds`: id, title, content, summary, source, url, tags (JSON text), format (markdown/html/text), status (published/draft), created_at, updated_at
- `files`: id, filename (存储名), original_name, mime_type, size, post_id (FK), created_at
- `folders`: id, name, path (UNIQUE), parent_id (自引用 FK CASCADE), created_at — 已定义但当前未被任何工具使用
- `rss_sources`: id, url (UNIQUE), title, description, last_fetched, fetch_interval, enabled, error_count, last_error, created_at, updated_at

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

所有 Agent 共享统一配置文件 `~/.whaiblog/config.json`：

```json
{
  "server_url": "http://your-server:8080",
  "api_key": "your-secret-key"
}
```

**配置优先级**：环境变量 > 配置文件 > 默认值

Agent 首次使用时会通过 `get_whaiblog_config` 检查配置，未配置时询问用户并调用 `set_whaiblog_config` 保存。

相关文件：
- `server/whaiblog-config.js` — 共享配置模块（读写配置文件）
- `tools/call-mcp.js` — CLI 工具读取配置
- `sdk/whaiblog_client.py` — Python SDK 读取配置

## MCP 工具

31 个工具，通过 MCP stdio 或 HTTP Bridge 均可调用：

- **配置**: `get_whaiblog_config` (获取配置), `set_whaiblog_config` (设置服务器地址和 API Key)
- **文章**: `create_post`, `update_post`, `delete_post`, `list_posts`, `get_post`
- **信息流**: `create_feed`, `update_feed`, `delete_feed`, `list_feeds`, `get_feed`（支持 `format` 字段：markdown/html/text）
- **文件**: `upload_file`, `upload_folder`, `upload_content` (内容直接写入), `list_files`, `get_file`, `update_file`, `replace_file`, `replace_file_content`, `delete_file`
- **统计**: `get_stats`
- **系统监控**: `get_system_info` (返回 CPU、内存、磁盘、运行时间等系统资源使用情况)
- **学习笔记**: `list_notes` (列出笔记目录树), `get_note` (获取笔记内容), `notes_status` (同步状态)
- **RSS**: `add_rss_source` (添加源), `list_rss_sources` (列出源), `remove_rss_source` (删除源), `fetch_rss` (抓取), `get_rss_status` (状态) — 写操作需 API Key

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
| MCP Stdio | Codex Desktop | `server/mcp-server.js` |
| HTTP Bridge | 自定义 Agent | `server/mcp-http-bridge.js` 或 `/bridge` 路由 |
| Python SDK | Python Agent | `sdk/whaiblog_client.py`（`WhaiBlogClient` 同步 HTTP + `WhaiBlogMCPClient` 异步 MCP，`create_client()` 工厂函数） |
| Codex Skill | Codex | `skills/whaiblog-manager.json` |
| OpenClaw Skill | OpenClaw | `skills/whaiblog-openclaw.yaml` |
| WhaiBlog Skill | OpenClaw | `skills/openclaw/whaiblog/SKILL.md` |

## 启动脚本

| 脚本 | 作用 |
|------|------|
| `whaiblog.js` | 交互式服务管理（启动/停止/重启/状态） |
| `start.bat` / `start.sh` | 仅启动主服务器（`server/index.js`） |
| `start-all.bat` / `start-all.sh` | 启动主服务器 + MCP HTTP Bridge（双进程） |

`whaiblog.js` 用法：
```bash
node whaiblog.js              # 交互式菜单
node whaiblog.js --start      # 启动服务
node whaiblog.js --stop       # 停止服务
node whaiblog.js --restart    # 重启服务
node whaiblog.js --status     # 查看状态
```

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
- **注意**：`mcp-server.js` **缺少** `isPathSafe()` / `isAllowedFile()` 安全检查，其他两个入口都有
- `multer` 在 `index.js` 中配置但**未被工具使用**，所有文件操作使用原生 `fs`
- 仅适用于本地/可信网络环境

API key 认证（`MARKME_API_KEY` 环境变量）在各入口的表现：

| 入口 | 写操作认证 | 读操作认证 |
|------|-----------|-----------|
| `bridge-router.js` (`/bridge/*`) | ✅ Bearer token | ✅ Bearer token |
| `mcp-http-bridge.js` (端口 8081) | ✅ Bearer token | ✅ Bearer token |
| `mcp-server.js` (stdio) | ✅ `api_key` 参数 | ❌ 无认证 |
| `index.js` `/api/rss/*` | ✅ Bearer token | ❌ 无认证 |
| `index.js` `/api/*` GET | N/A | ❌ 公开 |

`call-mcp.js` 和 Python SDK 会自动读取 `~/.whaiblog/config.json` 并发送 Bearer token。
