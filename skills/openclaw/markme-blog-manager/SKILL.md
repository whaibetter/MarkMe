---
name: markme-blog-manager
description: MarkMe 博客系统管理工具 - 通过 HTTP Bridge API 管理文章、文件和系统监控
---

这是 MarkMe 博客系统的管理工具，通过 HTTP Bridge API 操作博客。

## 配置信息

- 服务器地址: `http://117.72.196.45:12151`
- API Key: `Zjox+mYkDw+Bcmbr22GiQ2rJf15yYgEc`
- 认证方式: `Authorization: Bearer <API_KEY>`

## API 调用方式

所有工具调用都通过 POST 请求到 `/bridge/tools/<tool_name>` 端点。

```
POST http://117.72.196.45:12151/bridge/tools/<tool_name>
Content-Type: application/json
Authorization: Bearer Zjox+mYkDw+Bcmbr22GiQ2rJf15yYgEc

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

## 使用示例

用户说"帮我创建一篇关于AI的文章"时，执行：
```bash
curl -X POST http://117.72.196.45:12151/bridge/tools/create_post \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer Zjox+mYkDw+Bcmbr22GiQ2rJf15yYgEc" \
  -d '{"title":"AI技术入门","content":"# AI技术入门\n\n人工智能...","tags":["AI","技术"]}'
```

用户说"列出所有文章"时，执行：
```bash
curl -X POST http://117.72.196.45:12151/bridge/tools/list_posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer Zjox+mYkDw+Bcmbr22GiQ2rJf15yYgEc" \
  -d '{"limit": 20}'
```

## 前端页面

博客前端访问地址: http://117.72.196.45:12151
