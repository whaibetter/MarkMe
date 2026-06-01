---
name: whaiblog
description: WhaiBlog 博客系统管理工具 - 通过 HTTP Bridge API 管理文章、信息流、文件和系统监控
---

这是 WhaiBlog 博客系统的管理工具，通过 HTTP Bridge API 操作博客。

## 配置信息

配置文件路径: `C:\Users\whai\.whaiblog\config.json`

**调用前必须先读取配置文件获取 server_url 和 api_key：**

```bash
cat C:\Users\whai\.whaiblog\config.json
```

配置文件格式:
```json
{
  "server_url": "http://<your-server>:<port>",
  "api_key": "<your-api-key>"
}
```

认证方式: `Authorization: Bearer <api_key>`

## API 调用方式

所有工具调用都通过 POST 请求到 `<server_url>/bridge/tools/<tool_name>` 端点。

```
POST <server_url>/bridge/tools/<tool_name>
Content-Type: application/json
Authorization: Bearer <api_key>

{"参数名": "参数值"}
```

## 可用工具

### 文章管理

#### create_post - 创建文章
```json
POST /bridge/tools/create_post
{
  "title": "文章标题",
  "content": "Markdown 内容",
  "tags": ["标签1", "标签2"],
  "status": "published"
}
```

#### update_post - 更新文章
```json
POST /bridge/tools/update_post
{
  "id": 1,
  "title": "新标题",
  "content": "新内容",
  "tags": ["新标签"],
  "status": "draft"
}
```

#### delete_post - 删除文章
```json
POST /bridge/tools/delete_post
{"id": 1}
```

#### list_posts - 列出文章
```json
POST /bridge/tools/list_posts
{"page": 1, "limit": 10, "status": "published"}
```

#### get_post - 获取文章详情
```json
POST /bridge/tools/get_post
{"id": 1}
```

### 信息流管理

#### create_feed - 创建信息流
```json
POST /bridge/tools/create_feed
{
  "title": "标题",
  "content": "Markdown 内容",
  "summary": "摘要",
  "source": "来源网站",
  "url": "https://原文链接",
  "tags": ["标签1", "标签2"]
}
```

#### list_feeds - 列出信息流
```json
POST /bridge/tools/list_feeds
{"page": 1, "limit": 20}
```

#### get_feed - 获取信息流详情
```json
POST /bridge/tools/get_feed
{"id": 1}
```

#### update_feed - 更新信息流
```json
POST /bridge/tools/update_feed
{
  "id": 1,
  "title": "新标题",
  "content": "新内容",
  "source": "新来源",
  "tags": ["新标签"]
}
```

#### delete_feed - 删除信息流
```json
POST /bridge/tools/delete_feed
{"id": 1}
```

### 文件管理

#### upload_content - 上传文件内容（base64）
```json
POST /bridge/tools/upload_content
{
  "filename": "test.txt",
  "content": "base64编码的内容",
  "post_id": 1
}
```

#### list_files - 列出文件
```json
POST /bridge/tools/list_files
{}
```

#### delete_file - 删除文件
```json
POST /bridge/tools/delete_file
{"id": 1}
```

### 系统监控

#### get_stats - 获取统计
```json
POST /bridge/tools/get_stats
{}
```

#### get_system_info - 获取系统信息
```json
POST /bridge/tools/get_system_info
{}
```

### 学习笔记（只读）

#### list_notes - 列出笔记目录树
```json
POST /bridge/tools/list_notes
{"path": "", "depth": 2}
```

#### get_note - 获取笔记内容
```json
POST /bridge/tools/get_note
{"path": "Java开发/Java基础.md"}
```

## 使用示例

调用前先读取配置:
```bash
# 读取配置
config=$(cat C:\Users\whai\.whaiblog\config.json)
server=$(echo $config | jq -r '.server_url')
key=$(echo $config | jq -r '.api_key')

# 创建文章
curl -X POST "$server/bridge/tools/create_post" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $key" \
  -d '{"title":"AI技术入门","content":"# AI技术入门\n\n人工智能...","tags":["AI","技术"]}'
```
