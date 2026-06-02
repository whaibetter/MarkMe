# WhaiBlog - 轻量级博客系统

一个轻量级的博客系统，支持通过 MCP、Claude Code Skill 和 OpenClaw Skill 进行 AI 驱动的内容管理。

## 功能特点

- **前后端分离**：前端纯 HTML/CSS/JS，后端 Node.js + Express
- **轻量数据库**：使用 SQLite，无需额外数据库服务
- **AI 驱动管理**：通过 MCP、Claude Code Skill、OpenClaw Skill 管理内容
- **完整文件 CRUD**：支持文件的创建、读取、更新、删除操作
- **只读前端**：页面仅用于展示，数据管理完全由 AI 控制

## 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 启动服务器

```bash
npm start
```

服务器将在 `http://localhost:3000` 启动。

### 3. 配置 MCP

在 Claude Desktop 配置文件中添加：

```json
{
  "mcpServers": {
    "whaiblog": {
      "command": "node",
      "args": ["C:/Users/whai/Documents/Project/MarkMe/server/mcp-server.js"]
    }
  }
}
```

配置文件位置：
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

### 4. 使用 Skills

- **Claude Code Skill**: 将 `skills/whaiblog-manager.json` 复制到 Claude Code 的 skills 目录
- **OpenClaw Skill**: 将 `skills/whaiblog-openclaw.yaml` 复制到 OpenClaw 的 skills 目录

## API 接口

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/posts` | GET | 获取文章列表 |
| `/api/posts/:id` | GET | 获取单篇文章 |
| `/api/files` | GET | 获取文件列表 |
| `/api/files/:id` | GET | 获取单个文件详情 |
| `/api/tags` | GET | 获取所有标签 |
| `/api/stats` | GET | 获取统计信息 |

## MCP 工具

### 文章管理
- `create_post` - 创建文章
- `update_post` - 更新文章
- `delete_post` - 删除文章
- `list_posts` - 列出文章
- `get_post` - 获取文章详情

### 文件管理 (完整 CRUD)
- `upload_file` - 上传单个文件
- `upload_folder` - 上传整个文件夹
- `list_files` - 列出所有文件
- `get_file` - 获取文件详情
- `update_file` - 更新文件元数据（名称、关联文章）
- `replace_file` - 替换文件内容
- `delete_file` - 删除文件

### 统计
- `get_stats` - 获取博客统计数据

## 使用示例

### 通过 MCP 创建文章

在 Claude Desktop 中：

```
请帮我创建一篇标题为"Hello World"的博客文章，内容是：
# Hello World

这是我的第一篇博客文章。
```

### 通过 MCP 上传文件夹

```
请将 C:\Users\whai\Documents\my-project 这个文件夹上传到博客系统
```

### 通过 MCP 更新文件

```
请将文件 ID 1 的名称改为 "my-document.txt"
```

## 项目结构

```
WhaiBlog/
├── server/           # 后端
│   ├── index.js      # Express 服务器
│   ├── db.js         # SQLite 数据库
│   ├── mcp-server.js # MCP 服务器
│   └── package.json
├── client/           # 前端
│   ├── index.html
│   ├── style.css
│   └── app.js
├── skills/           # AI Skills
│   ├── whaiblog-manager.json    # Claude Code Skill
│   └── whaiblog-openclaw.yaml   # OpenClaw Skill
└── uploads/          # 上传的文件
```

## 技术栈

- **后端**: Node.js, Express, better-sqlite3
- **前端**: 原生 HTML/CSS/JS, marked.js
- **AI 集成**: MCP (Model Context Protocol), Claude Code Skill, OpenClaw Skill
