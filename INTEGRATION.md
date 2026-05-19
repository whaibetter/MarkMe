# MarkMe 博客系统集成指南

## 方式一：MCP 集成 (推荐用于 Claude Desktop)

### 配置 Claude Desktop

编辑配置文件：
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "markme": {
      "command": "node",
      "args": ["C:/Users/whai/Documents/Project/MarkMe/server/mcp-server.js"]
    }
  }
}
```

重启 Claude Desktop 后，你可以说：
- "帮我创建一篇博客文章，标题是..."
- "把 C:\my-project 文件夹上传到博客"
- "列出所有已上传的文件"

---

## 方式二：OpenClaw 集成

### 1. 复制 Skill 文件

```bash
cp skills/markme-openclaw.yaml ~/.openclaw/skills/
```

### 2. 在 OpenClaw Agent 中使用

```python
from openclaw import Agent

agent = Agent(
    name="blog-manager",
    skills=["markme-blog-manager"]
)

# Agent 现在可以管理博客了
agent.run("帮我创建一篇关于AI的博客文章")
```

### 3. 自定义 OpenClaw Tool 实现

如果你想自己实现 tool 调用逻辑：

```python
import requests
from openclaw import Tool

class MarkMeTool(Tool):
    BASE_URL = "http://localhost:3000/api"

    def create_post(self, title: str, content: str, tags: list = None):
        return requests.post(f"{self.BASE_URL}/posts", json={
            "title": title,
            "content": content,
            "tags": tags or []
        }).json()

    def upload_file(self, file_path: str, post_id: int = None):
        # 需要通过 MCP 或直接文件系统操作
        pass

    def list_files(self):
        return requests.get(f"{self.BASE_URL}/files").json()

    def get_file(self, id: int):
        return requests.get(f"{self.BASE_URL}/files/{id}").json()
```

---

## 方式三：Claude Code Skill 集成

### 1. 复制 Skill 文件

```bash
cp skills/markme-manager.json ~/.claude/skills/
```

### 2. 在 Claude Code 中使用

直接在 Claude Code 中说：
- "使用 markme-manager 创建博客文章"
- "上传文件到 MarkMe 博客"

---

## 方式四：自定义 AI Agent 集成 (HTTP API)

### Python 示例

```python
import requests
from typing import Optional

class MarkMeClient:
    def __init__(self, base_url: str = "http://localhost:3000/api"):
        self.base_url = base_url

    def create_post(self, title: str, content: str, summary: str = None,
                    tags: list = None, status: str = "published"):
        return requests.post(f"{self.base_url}/posts", json={
            "title": title,
            "content": content,
            "summary": summary,
            "tags": tags or [],
            "status": status
        }).json()

    def get_posts(self, page: int = 1, limit: int = 10):
        return requests.get(f"{self.base_url}/posts", params={
            "page": page, "limit": limit
        }).json()

    def get_post(self, id: int):
        return requests.get(f"{self.base_url}/posts/{id}").json()

    def get_files(self):
        return requests.get(f"{self.base_url}/files").json()

    def get_file(self, id: int):
        return requests.get(f"{self.base_url}/files/{id}").json()

    def get_stats(self):
        return requests.get(f"{self.base_url}/stats").json()

# 使用示例
client = MarkMeClient()

# 创建文章
client.create_post(
    title="我的第一篇博客",
    content="# Hello\n\n这是内容",
    tags=["测试", "博客"]
)

# 获取文章列表
posts = client.get_posts()
print(posts)
```

### Node.js 示例

```javascript
const axios = require('axios');

class MarkMeClient {
  constructor(baseUrl = 'http://localhost:3000/api') {
    this.baseUrl = baseUrl;
  }

  async createPost(title, content, tags = []) {
    const res = await axios.post(`${this.baseUrl}/posts`, {
      title, content, tags
    });
    return res.data;
  }

  async getPosts(page = 1, limit = 10) {
    const res = await axios.get(`${this.baseUrl}/posts`, {
      params: { page, limit }
    });
    return res.data;
  }

  async uploadFile(filePath, postId = null) {
    // 需要通过 MCP 或文件系统操作
  }
}

module.exports = MarkMeClient;
```

---

## 方式五：MCP SDK 直接调用

### Python MCP Client

```python
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    server_params = StdioServerParameters(
        command="node",
        args=["C:/Users/whai/Documents/Project/MarkMe/server/mcp-server.js"]
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # 列出可用工具
            tools = await session.list_tools()
            print("Available tools:", [t.name for t in tools.tools])

            # 创建文章
            result = await session.call_tool("create_post", {
                "title": "MCP 测试文章",
                "content": "# 测试\n\n通过 MCP 创建的文章",
                "tags": ["mcp", "test"]
            })
            print("Created:", result)

            # 上传文件
            result = await session.call_tool("upload_file", {
                "file_path": "C:/path/to/file.txt"
            })
            print("Uploaded:", result)

            # 列出文件
            files = await session.call_tool("list_files", {})
            print("Files:", files)

asyncio.run(main())
```

---

## 完整工作流示例

### AI Agent 自动发布博客

```python
class BlogAgent:
    def __init__(self):
        self.client = MarkMeClient()

    def publish_article(self, topic: str, content: str, files: list = None):
        """AI Agent 自动发布文章流程"""

        # 1. 创建文章
        post = self.client.create_post(
            title=f"AI生成：{topic}",
            content=content,
            tags=["ai-generated", topic.lower()]
        )

        # 2. 上传关联文件
        if files:
            for file_path in files:
                # 通过 MCP 调用上传
                pass

        # 3. 返回结果
        return {
            "post_id": post["id"],
            "url": f"http://localhost:3000/post/{post['id']}"
        }

# 使用
agent = BlogAgent()
result = agent.publish_article(
    topic="Python 入门教程",
    content="# Python 入门\n\n...",
    files=["C:/docs/python-cheatsheet.pdf"]
)
print(f"文章已发布: {result['url']}")
```
