# WhaiBlog Agent 配置指南

本教程介绍如何为各种 AI Agent 配置 WhaiBlog 博客系统的操作能力。配置完成后，Agent 可以通过自然语言管理你的博客文章和文件。

## 前置条件

确保 WhaiBlog 服务已启动：

```bash
cd server
npm install    # 首次需要
npm start      # 启动主服务器（端口 8080）
```

如需使用 MCP Stdio 或 CLI 工具，还需启动 MCP HTTP Bridge：

```bash
# 或者直接一键启动全部服务
start-all.bat      # Windows
./start-all.sh     # Linux/Mac
```

## 端口说明

| 服务 | 默认端口 | 用途 |
|------|----------|------|
| 主服务器 | 8080 | 前端页面 + 只读 API + Bridge 路由 |
| MCP HTTP Bridge | 8081 | 独立 MCP 工具端点（可选，主服务器已挂载 `/bridge` 路由） |

---

## 统一配置文件

所有 Agent（Claude Code、Claude Desktop、OpenClaw、Python SDK、CLI 工具）共享一个统一配置文件，存储服务器地址和 API Key。

### 配置文件位置

```
~/.whaiblog/config.json
```

### 配置文件格式

```json
{
  "server_url": "http://your-server:8080",
  "api_key": "your-secret-key"
}
```

### 自动配置流程

所有 Agent 首次使用时会自动检测配置：

1. 调用 `get_whaiblog_config` 检查是否已配置
2. 如果未配置，询问用户 WhaiBlog 服务器地址
3. 调用 `set_whaiblog_config` 保存配置
4. 后续调用自动使用已保存的配置

### 手动配置

也可以通过 CLI 工具或 curl 手动配置：

```bash
# 使用 CLI 工具
node tools/call-mcp.js set_whaiblog_config '{"server_url":"http://your-server:8080","api_key":"your-key"}'

# 使用 curl
curl -X POST http://localhost:8080/bridge/tools/set_whaiblog_config \
  -H "Content-Type: application/json" \
  -d '{"server_url":"http://your-server:8080","api_key":"your-key"}'

# 直接编辑文件
echo '{"server_url":"http://your-server:8080","api_key":"your-key"}' > ~/.whaiblog/config.json
```

### 配置优先级

**环境变量 > 配置文件 > 默认值**

| 入口 | 环境变量（最高优先级） |
|------|----------------------|
| CLI 工具 | `MARKME_HOST`, `MARKME_API_KEY` |
| Python SDK | 构造函数参数 `base_url`, `api_key` |
| MCP Server | 通过 `set_whaiblog_config` 工具配置 |

---

## 一、Claude Desktop（MCP Stdio 协议）

Claude Desktop 通过 MCP（Model Context Protocol）Stdio 协议与 WhaiBlog 通信，这是最推荐的方式。

### 步骤

1. 找到 Claude Desktop 配置文件：
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

2. 编辑配置文件，添加 `whaiblog` 服务：

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

> 如果已有其他 MCP 服务，把 `whaiblog` 添加到 `mcpServers` 对象中即可。

3. 重启 Claude Desktop。

4. 验证：在对话框中输入 "帮我创建一篇博客文章"，Claude 会自动调用 WhaiBlog 工具。

### 工作原理

Claude Desktop 启动时会以子进程方式运行 `mcp-server.js`，通过 stdin/stdout 通信。无需手动启动服务器或 bridge，MCP Server 内部直接操作数据库。

### 可选：远程服务器

如果 WhaiBlog 部署在远程服务器，MCP Server 需要通过 HTTP Bridge 通信。修改 `mcp-server.js` 中的连接配置，或使用 HTTP Bridge 方式（见下文）。

---

## 二、Claude Code（Skill 文件）

Claude Code 通过 skill 文件识别可用工具。

### 步骤

1. 复制 skill 文件到 Claude Code 的 skills 目录：

```bash
# 创建目录（如不存在）
mkdir -p ~/.claude/skills

# 复制 skill 文件
cp skills/whaiblog-manager.json ~/.claude/skills/
```

2. 在 Claude Code 中直接使用自然语言操作：

```
使用 whaiblog-manager 创建一篇标题为"Hello World"的博客文章
```

### 工作原理

Claude Code 读取 `~/.claude/skills/` 目录下的 JSON 文件，识别其中定义的工具。当用户提到相关操作时，Claude Code 会通过 HTTP Bridge（`/bridge/tools/:name`）调用 WhaiBlog。

> 注意：此方式需要 WhaiBlog 主服务器运行中（`npm start`），Claude Code 通过 HTTP 连接 `localhost:8080`。

---

## 三、OpenClaw（YAML Skill 文件）

OpenClaw 使用 YAML 格式的 skill 定义。

### 步骤

1. 复制 skill 文件：

```bash
mkdir -p ~/.openclaw/skills
cp skills/whaiblog-openclaw.yaml ~/.openclaw/skills/
```

2. 在 OpenClaw Agent 代码中引用：

```python
from openclaw import Agent

agent = Agent(
    name="blog-manager",
    skills=["whaiblog-blog-manager"]  # 对应 yaml 中的 name 字段
)

agent.run("帮我创建一篇关于AI的博客文章")
```

### 自定义 Tool 实现

如果需要更细粒度的控制，可以直接实现 Tool 类：

```python
import requests
from openclaw import Tool

class WhaiBlogTool(Tool):
    BASE_URL = "http://localhost:8080/bridge/tools"

    def create_post(self, title: str, content: str, tags: list = None):
        return requests.post(f"{self.BASE_URL}/create_post", json={
            "title": title,
            "content": content,
            "tags": tags or []
        }).json()

    def list_posts(self, limit: int = 10):
        return requests.post(f"{self.BASE_URL}/list_posts", json={
            "limit": limit
        }).json()

    def upload_content(self, filename: str, content_base64: str):
        return requests.post(f"{self.BASE_URL}/upload_content", json={
            "filename": filename,
            "content": content_base64
        }).json()
```

---

## 四、Python Agent（SDK）

适用于自定义 Python 脚本或框架集成。

### 安装

```bash
pip install requests
# 如需 MCP 协议支持
pip install mcp
```

### 方式 A：HTTP REST API（只读）

```python
from sdk.whaiblog_client import WhaiBlogClient

client = WhaiBlogClient("http://localhost:8080/api")

# 只支持 GET 操作
posts = client.get_posts(limit=5)
post = client.get_post(1)
files = client.list_files()
tags = client.get_tags()
stats = client.get_stats()
```

### 方式 B：MCP 协议（完整 CRUD）

```python
import asyncio
from sdk.whaiblog_client import WhaiBlogMCPClient

async def main():
    client = WhaiBlogMCPClient(
        server_path="C:/Users/whai/Documents/Project/MarkMe/server/mcp-server.js"
    )
    await client.connect()

    # 创建文章
    await client.create_post("标题", "内容", tags=["test"])

    # 上传文件
    await client.upload_file("C:/path/to/file.md")

    # 上传文件夹
    await client.upload_folder("C:/path/to/folder")

    # 列出文件
    files = await client.list_files()

    await client.disconnect()

asyncio.run(main())
```

### 方式 C：HTTP Bridge（完整 CRUD，无需 MCP 依赖）

```python
import requests

BRIDGE = "http://localhost:8080/bridge/tools"

# 创建文章
requests.post(f"{BRIDGE}/create_post", json={
    "title": "标题",
    "content": "内容",
    "tags": ["tag1"]
}).json()

# 上传内容（base64）
import base64
content = base64.b64encode(b"# Hello\n\nContent here").decode()
requests.post(f"{BRIDGE}/upload_content", json={
    "filename": "hello.md",
    "content": content
}).json()

# 列出文章
requests.post(f"{BRIDGE}/list_posts", json={"limit": 10}).json()
```

---

## 五、Node.js Agent（HTTP Bridge）

```javascript
const BRIDGE = 'http://localhost:8080/bridge/tools';

async function callTool(name, args = {}) {
  const res = await fetch(`${BRIDGE}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  return res.json();
}

// 创建文章
await callTool('create_post', {
  title: '标题',
  content: '内容',
  tags: ['tag1']
});

// 列出文章
const posts = await callTool('list_posts', { limit: 10 });

// 上传内容
const content = Buffer.from('# Hello').toString('base64');
await callTool('upload_content', {
  filename: 'hello.md',
  content: content
});
```

---

## 六、通用 HTTP 客户端（curl / 任何语言）

任何能发送 HTTP 请求的工具都可以操作 WhaiBlog。

### 端点格式

```
POST http://localhost:8080/bridge/tools/{工具名}
Content-Type: application/json

{参数}
```

### 常用示例

```bash
# 创建文章
curl -X POST http://localhost:8080/bridge/tools/create_post \
  -H "Content-Type: application/json" \
  -d '{"title":"标题","content":"内容","tags":["标签"]}'

# 列出文章
curl -X POST http://localhost:8080/bridge/tools/list_posts \
  -H "Content-Type: application/json" \
  -d '{"limit":10}'

# 上传文件内容（base64）
echo '{"filename":"test.md","content":"SGVsbG8gV29ybGQ="}' | \
  curl -X POST http://localhost:8080/bridge/tools/upload_content \
  -H "Content-Type: application/json" -d @-

# 查看系统状态
curl -X POST http://localhost:8080/bridge/tools/get_system_info \
  -H "Content-Type: application/json" -d '{}'
```

### 远程服务器 + API Key

```bash
export MARKME_HOST=your-server
export MARKME_API_KEY=your-api-key

curl -X POST http://$MARKME_HOST:8080/bridge/tools/list_posts \
  -H "Authorization: Bearer $MARKME_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit":5}'
```

---

## 七、CLI 命令行工具（call-mcp.js）

适合脚本自动化和快速测试。

### 前置条件

需要启动 MCP HTTP Bridge（端口 8081）：

```bash
# 一键启动全部
start-all.bat      # Windows
./start-all.sh     # Linux/Mac

# 或单独启动 bridge
node server/mcp-http-bridge.js
```

### 用法

```bash
node tools/call-mcp.js <工具名> '<JSON参数>'
```

### 常用命令

```bash
# 查看统计
node tools/call-mcp.js get_stats

# 创建文章
node tools/call-mcp.js create_post '{"title":"标题","content":"内容","tags":["标签"]}'

# 列出文章
node tools/call-mcp.js list_posts '{"limit":10}'

# 上传文件
node tools/call-mcp.js upload_file '{"file_path":"C:/path/to/file.txt"}'

# 上传内容（base64）
node tools/call-mcp.js upload_content '{"filename":"test.md","content":"SGVsbG8="}'

# 上传文件夹
node tools/call-mcp.js upload_folder '{"folder_path":"C:/path/to/folder"}'

# 查看系统信息
node tools/call-mcp.js get_system_info
```

### 远程调用

```bash
MARKME_HOST=your-server MARKME_API_KEY=your_key node tools/call-mcp.js get_stats
```

---

## 方式对比

| 方式 | 适用 Agent | 协议 | 需要启动的服务 | 支持的操作 |
|------|-----------|------|---------------|-----------|
| Claude Desktop MCP | Claude Desktop | Stdio | 无需额外启动 | 完整 CRUD |
| Claude Code Skill | Claude Code | HTTP | 主服务器 (8080) | 完整 CRUD |
| OpenClaw Skill | OpenClaw | HTTP | 主服务器 (8080) | 完整 CRUD |
| Python SDK (REST) | 自定义 Python | HTTP | 主服务器 (8080) | 只读 |
| Python SDK (MCP) | 自定义 Python | Stdio | 无需额外启动 | 完整 CRUD |
| HTTP Bridge | 任意 HTTP 客户端 | HTTP | 主服务器 (8080) | 完整 CRUD |
| CLI (call-mcp.js) | 脚本 / 手动 | HTTP | Bridge (8081) | 完整 CRUD |

---

## 可用工具列表

### 文章管理

| 工具 | 必填参数 | 说明 |
|------|---------|------|
| `create_post` | `title`, `content` | 创建文章，可选 `summary`, `tags`, `status` |
| `update_post` | `id` | 更新文章，可选 `title`, `content`, `summary`, `tags`, `status` |
| `delete_post` | `id` | 删除文章 |
| `list_posts` | 无 | 列出文章，可选 `page`, `limit`, `status` |
| `get_post` | `id` | 获取文章详情（含关联文件） |

### 文件管理

| 工具 | 必填参数 | 说明 |
|------|---------|------|
| `upload_file` | `file_path` | 上传服务器本地文件 |
| `upload_content` | `filename`, `content` | 通过 base64 上传（远程客户端用） |
| `upload_folder` | `folder_path` | 上传整个文件夹 |
| `list_files` | 无 | 列出所有文件 |
| `get_file` | `id` | 获取文件详情 |
| `update_file` | `id` | 更新文件元数据（名称、关联文章） |
| `replace_file` | `id`, `file_path` | 替换文件内容（服务器本地） |
| `replace_file_content` | `id`, `content` | 替换文件内容（base64） |
| `delete_file` | `id` | 删除文件 |

### 系统

| 工具 | 参数 | 说明 |
|------|------|------|
| `get_stats` | 无 | 获取文章数、文件数统计 |
| `get_system_info` | 无 | 获取 CPU、内存、磁盘、运行时间 |

---

## 常见问题

### Claude Desktop 连接失败

- 确认 `mcp-server.js` 路径正确（使用绝对路径）
- 确认 Node.js 已安装（`node --version`）
- 查看 Claude Desktop 的日志输出

### Claude Code 无法调用工具

- 确认 WhaiBlog 主服务器正在运行（`npm start`）
- 确认 `whaiblog-manager.json` 已复制到 `~/.claude/skills/`
- 尝试用 curl 手动测试：`curl http://localhost:8080/bridge/tools`

### 远程访问 401 错误

- 检查服务器 `.env` 中的 `MARKME_API_KEY` 配置
- 请求头中添加：`Authorization: Bearer your-api-key`

### call-mcp.js 连接失败

- 确认 MCP HTTP Bridge 正在运行（端口 8081）
- 或改用主服务器的 bridge 路由（端口 8080，用 curl）
