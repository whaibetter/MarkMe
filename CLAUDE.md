# MarkMe - 轻量级博客系统

## 项目概述

MarkMe 是一个轻量级的博客系统，支持通过 MCP、Claude Code Skill 和 OpenClaw Skill 进行 AI 驱动的内容管理。

## 技术栈

- **后端**: Node.js + Express + better-sqlite3
- **前端**: 原生 HTML/CSS/JS + marked.js
- **数据库**: SQLite
- **AI 集成**: MCP (Model Context Protocol), Claude Code Skill, OpenClaw Skill

## 项目结构

```
MarkMe/
├── server/                  # 后端服务
│   ├── index.js             # Express 服务器 (端口 3000)
│   ├── db.js                # SQLite 数据库配置
│   ├── mcp-server.js        # MCP 服务器 (stdio)
│   ├── mcp-http-bridge.js   # MCP HTTP Bridge (端口 3001)
│   └── package.json
├── client/                  # 前端页面
│   ├── index.html
│   ├── style.css
│   └── app.js
├── skills/                  # AI Skills
│   ├── markme-manager.json  # Claude Code Skill
│   └── markme-openclaw.yaml # OpenClaw Skill
├── sdk/                     # Python SDK
│   └── markme_client.py
├── examples/                # 集成示例
│   └── agent_example.py
├── uploads/                 # 上传的文件
├── start.bat                # 启动主服务器
└── start-all.bat            # 启动所有服务
```

## 端口配置

默认端口（可在 `server/.env` 中修改）：
- 主服务器（前端 + API）: **8080**
- MCP HTTP Bridge: **8081**

## 启动命令

```bash
cd server
npm install

# 方式一：只启动主服务器
node index.js

# 方式二：启动所有服务
node index.js &
node mcp-http-bridge.js &

# 方式三：使用启动脚本
# Windows
start-all.bat

# Linux/Mac
chmod +x start-all.sh && ./start-all.sh
```

## API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `http://localhost:8080/api/posts` | GET | 获取文章列表 |
| `http://localhost:8080/api/posts/:id` | GET | 获取单篇文章 |
| `http://localhost:8080/api/files` | GET | 获取文件列表 |
| `http://localhost:8080/api/files/:id` | GET | 获取单个文件 |
| `http://localhost:8080/api/tags` | GET | 获取所有标签 |
| `http://localhost:8080/api/stats` | GET | 获取统计信息 |
| `http://localhost:8081/tools` | GET | MCP 工具列表 |
| `http://localhost:8081/tools/:name` | POST | 调用 MCP 工具 |

## MCP 工具

### 文章管理
- `create_post` - 创建文章
- `update_post` - 更新文章
- `delete_post` - 删除文章
- `list_posts` - 列出文章
- `get_post` - 获取文章

### 文件管理 (完整 CRUD)
- `upload_file` - 上传文件
- `upload_folder` - 上传文件夹
- `list_files` - 列出文件
- `get_file` - 获取文件详情
- `update_file` - 更新文件元数据
- `replace_file` - 替换文件内容
- `delete_file` - 删除文件

### 统计
- `get_stats` - 获取博客统计数据

## Claude Desktop MCP 配置

```json
{
  "mcpServers": {
    "markme": {
      "command": "node",
      "args": ["C:/Users/whai/Documents/Project/MarkMe/server/mcp-server.js"],
      "cwd": "C:/Users/whai/Documents/Project/MarkMe/server"
    }
  }
}
```

## MCP HTTP Bridge 调用示例

```bash
# 创建文章
curl -X POST http://localhost:8081/tools/create_post \
  -H "Content-Type: application/json" \
  -d '{"title":"标题","content":"内容","tags":["标签"]}'

# 上传文件
curl -X POST http://localhost:8081/tools/upload_file \
  -H "Content-Type: application/json" \
  -d '{"file_path":"C:/path/to/file.md"}'

# 获取统计
curl -X POST http://localhost:8081/tools/get_stats \
  -H "Content-Type: application/json" \
  -d '{}'
```

## AI Agent 集成方式

### 方式一：MCP (Claude Desktop)
直接在 Claude Desktop 中配置 MCP 服务器即可使用。

### 方式二：MCP HTTP Bridge (推荐用于自定义 Agent)
启动 MCP HTTP Bridge 后，通过 HTTP 调用工具：

```bash
# 启动
node server/mcp-http-bridge.js

# 调用示例
curl -X POST http://localhost:3001/tools/create_post \
  -H "Content-Type: application/json" \
  -d '{"title":"测试","content":"内容"}'
```

### 方式三：Python SDK
```python
from sdk.markme_client import MarkMeClient
client = MarkMeClient()
client.create_post("标题", "内容", tags=["test"])
```

### 方式四：OpenClaw Skill
复制 `skills/markme-openclaw.yaml` 到 OpenClaw skills 目录。

### 方式五：Claude Code Skill
复制 `skills/markme-manager.json` 到 Claude Code skills 目录。

## 注意事项

- 前端为只读展示，所有数据管理通过 MCP 或 API 进行
- 文件上传后存储在 `server/uploads/` 目录
- 数据库文件为 `server/markme.db`
- MCP HTTP Bridge 默认端口 3001，可通过 MCP_BRIDGE_PORT 环境变量修改
