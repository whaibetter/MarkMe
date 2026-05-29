# WhaiBlog 添加文章教程

WhaiBlog 的前端页面是只读的，所有数据管理通过 MCP 或 API 进行。以下是添加文章的几种方式。

## 前置信息

| 项目 | 值 |
|------|-----|
| 服务器地址 | `http://117.72.196.45:8080` |
| Bridge 地址 | `http://117.72.196.45:8080/bridge/tools/:name` |
| API Key | 服务器 `.env` 中配置的 `MARKME_API_KEY` |

---

## 方式一：使用 call-mcp.js 命令行工具

### 创建文章

```bash
# 设置环境变量
export MARKME_HOST=117.72.196.45
export MCP_BRIDGE_PORT=8080
export MARKME_API_KEY=your-api-key

# 创建简单文章
node tools/call-mcp.js create_post '{"title":"我的第一篇文章","content":"# 你好世界\n\n这是正文内容，支持 **Markdown** 格式。","tags":["入门","教程"]}'
```

### 创建带摘要和草稿状态的文章

```bash
node tools/call-mcp.js create_post '{
  "title": "深入理解 Node.js",
  "content": "# 深入理解 Node.js\n\n## 事件循环\n\nNode.js 的事件循环是...",
  "summary": "一篇关于 Node.js 核心机制的文章",
  "tags": ["Node.js", "后端"],
  "status": "draft"
}'
```

### 查看文章列表

```bash
node tools/call-mcp.js list_posts '{"limit":10}'
```

### 查看单篇文章

```bash
node tools/call-mcp.js get_post '{"id":1}'
```

### 更新文章

```bash
node tools/call-mcp.js update_post '{"id":1,"title":"新标题","tags":["新标签"]}'
```

### 删除文章

```bash
node tools/call-mcp.js delete_post '{"id":1}'
```

---

## 方式二：使用 curl

```bash
# 创建文章
curl -X POST http://117.72.196.45:8080/bridge/tools/create_post \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "curl 创建的文章",
    "content": "# 标题\n\n正文内容",
    "tags": ["curl", "测试"]
  }'

# 查看文章
curl -X POST http://117.72.196.45:8080/bridge/tools/list_posts \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"limit":5}'
```

---

## 方式三：通过 Claude Code / OpenClaw 操作

在 Claude Code 或 OpenClaw 中，直接用自然语言告诉 AI：

> "帮我在 WhaiBlog 上创建一篇文章，标题是《xxx》，内容是 xxx，标签是 xxx"

AI 会自动调用 MCP 工具完成操作。

---

## 方式四：上传文件作为文章附件

### 上传单个文件

```bash
# 上传服务器本地文件
node tools/call-mcp.js upload_file '{"file_path":"/path/to/file.md"}'

# 上传内容（base64，适合远程客户端）
CONTENT=$(base64 -w0 /path/to/file.md)
node tools/call-mcp.js upload_content "{\"filename\":\"file.md\",\"content\":\"$CONTENT\"}"
```

### 上传整个文件夹

```bash
node tools/call-mcp.js upload_folder '{"folder_path":"/path/to/folder"}'
```

### 关联文件到文章

```bash
# 上传时关联
node tools/call-mcp.js upload_content '{"filename":"附件.md","content":"base64...","post_id":1}'

# 事后关联
node tools/call-mcp.js update_file '{"id":1,"post_id":1}'
```

---

## 文章字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 文章标题 |
| content | string | 是 | 文章正文，支持 Markdown |
| summary | string | 否 | 摘要，默认取 content 前 200 字符 |
| tags | string[] | 否 | 标签数组，如 `["标签1","标签2"]` |
| status | string | 否 | `published`（默认）或 `draft` |

## Markdown 语法速查

```markdown
# 一级标题
## 二级标题

**加粗** *斜体* ~~删除线~~

- 无序列表
1. 有序列表

> 引用

[链接](url)
![图片](url)

​```js
代码块
​```
```
