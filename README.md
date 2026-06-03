# WhaiBlog

一个 AI 驱动的轻量级博客系统。前端为只读展示，所有内容管理通过 AI 工具完成。

## 功能特点

- **AI 驱动管理** — 通过 MCP、HTTP Bridge、Python SDK、Claude Code Skill、OpenClaw Skill 管理内容
- **信息流** — 支持多来源信息聚合，按来源筛选
- **RSS 阅读器** — 外部 RSS 源订阅、自动抓取、内容过短时自动提取全文
- **学习笔记** — 从 Git 仓库同步学习笔记，支持目录树浏览
- **文件管理** — 完整的文件 CRUD，支持上传文件夹和 base64 内容
- **主题系统** — 7 种主题（dark/light/nord/dracula/forest/cyberpunk/retro）
- **国际化** — 中英文切换
- **轻量部署** — SQLite 数据库，无需额外服务

## 技术栈

- **后端**: Node.js + Express + better-sqlite3
- **前端**: 原生 HTML/CSS/JS SPA + marked.js + MathJax
- **数据库**: SQLite（WAL 模式）
- **AI 集成**: MCP (Model Context Protocol) + HTTP Bridge + Python SDK

## 快速开始

```bash
cd server
npm install
npm start            # 生产模式（端口 8080）
npm run dev          # 开发模式（文件变更自动重启）
```

或使用管理脚本：

```bash
node whaiblog.js --start     # 启动
node whaiblog.js --stop      # 停止
node whaiblog.js --restart   # 重启（自动备份数据库 + git pull）
node whaiblog.js --status    # 查看状态
```

## Agent 集成

| 方式 | 适用场景 | 协议 |
|------|----------|------|
| MCP Stdio | Claude Desktop | stdin/stdout |
| Claude Code Skill | Claude Code | HTTP |
| OpenClaw Skill | OpenClaw | HTTP |
| Python SDK | Python Agent | HTTP / MCP |
| HTTP Bridge | 任意 HTTP 客户端 | HTTP |
| CLI 工具 | 脚本 / 手动 | HTTP |

配置文件 `~/.whaiblog/config.json`：

```json
{
  "server_url": "http://your-server:8080",
  "api_key": "your-secret-key"
}
```

详见 [Agent 配置指南](docs/agent-configuration.md)。

## API 接口

只读 API（GET）：

| 端点 | 描述 |
|------|------|
| `/api/posts` | 文章列表 |
| `/api/posts/:id` | 文章详情 |
| `/api/feeds` | 信息流列表（支持 `?source=xxx` 筛选） |
| `/api/feeds/sources` | 所有来源列表 |
| `/api/files` | 文件列表 |
| `/api/tags` | 标签列表 |
| `/api/stats` | 统计信息 |
| `/api/notes/*` | 学习笔记 |
| `/api/rss/*` | RSS 源管理 |
| `/rss/posts.xml` | 文章 RSS 输出 |
| `/rss/feeds.xml` | 信息流 RSS 输出 |

写操作通过 Bridge 调用：

```bash
curl -X POST http://localhost:8080/bridge/tools/create_post \
  -H "Content-Type: application/json" \
  -d '{"title":"标题","content":"内容","tags":["标签"]}'
```

## 项目结构

```
MarkMe/
├── client/                 # 前端 SPA
│   ├── index.html
│   ├── js/                 # ES Modules（app.js, router.js, i18n.js, pages/, components/）
│   └── css/                # 模块化样式
├── server/                 # 后端
│   ├── index.js            # 主服务器（Express + 静态文件 + API + Bridge）
│   ├── mcp-server.js       # MCP Stdio 服务器
│   ├── mcp-http-bridge.js  # MCP HTTP Bridge（可选，已挂载到主服务器）
│   ├── bridge-router.js    # Bridge 路由（挂载到 /bridge）
│   ├── rss-fetcher.js      # RSS 抓取器（定时任务）
│   ├── rss.js              # RSS XML 生成
│   ├── notes-sync.js       # 学习笔记同步
│   ├── notes-router.js     # 笔记 API 路由
│   ├── db.js               # SQLite 数据库
│   ├── config.js           # 配置（环境变量）
│   ├── article-extractor.js # 文章正文提取
│   └── uploads/            # 上传文件存储
├── sdk/                    # Python SDK
├── tools/                  # CLI 工具
├── skills/                 # AI Skill 定义文件
├── docs/                   # 文档
└── whaiblog.js             # 服务管理脚本
```

## 文档

- [Agent 配置指南](docs/agent-configuration.md) — 7 种 Agent 集成方式的详细配置
- [添加文章教程](docs/adding-posts.md) — 4 种添加文章的方式
- [CLAUDE.md](CLAUDE.md) — Claude Code 开发指南

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 8080 | 主服务器端口 |
| `MCP_BRIDGE_PORT` | 8081 | MCP HTTP Bridge 端口 |
| `API_KEY` | (空) | Bearer token 认证 |
| `MAX_FILE_SIZE` | 50MB | 文件大小限制 |
| `NOTES_REPO_URL` | Gitee 仓库 | 学习笔记 Git 仓库地址 |

## License

MIT
