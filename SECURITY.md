# MarkMe 安全指南

## 当前安全风险

### 1. 无认证保护
所有 MCP 工具和 API 都没有认证，任何人都可以：
- 创建/修改/删除文章
- 上传/删除文件
- 读取所有数据

### 2. 路径遍历漏洞
`upload_file` 和 `upload_folder` 的 `file_path` 参数可以访问服务器上的任意文件，例如：
- `file_path: "/etc/passwd"`
- `file_path: "C:\Windows\System32\config\sam"`

### 3. 文件上传风险
- 无文件类型限制，可上传 `.exe`, `.sh`, `.php` 等危险文件
- 无文件大小限制，可耗尽磁盘空间

## 建议修复方案

### 方案一：添加 API Key 认证（推荐）

在环境变量中设置 API Key：
```bash
export MARKME_API_KEY="your-secret-key-here"
```

MCP 调用时携带：
```bash
curl -H "Authorization: Bearer your-secret-key-here" \
  -X POST http://localhost:3001/tools/create_post ...
```

### 方案二：限制文件访问路径

只允许访问指定目录下的文件：
```javascript
const ALLOWED_PATHS = [
  'C:/Users/whai/Documents/',
  '/home/user/documents/'
];

function isPathAllowed(filePath) {
  return ALLOWED_PATHS.some(p => filePath.startsWith(p));
}
```

### 方案三：文件上传白名单

只允许安全的文件类型：
```javascript
const ALLOWED_EXTENSIONS = [
  '.md', '.txt', '.json', '.csv',
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.pdf', '.doc', '.docx',
  '.zip', '.tar', '.gz'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
```

### 方案四：仅本地访问

MCP HTTP Bridge 只监听 localhost：
```javascript
app.listen(PORT, '127.0.0.1', () => {
  console.log(`MCP Bridge running on http://127.0.0.1:${PORT}`);
});
```

## 当前适用场景

本系统设计用于：
- **本地开发环境**
- **受信任的内网环境**
- **个人使用**

**不建议**直接暴露到公网。

## 生产环境部署建议

如果需要公网访问：

1. **使用反向代理**（Nginx）添加认证
2. **配置 HTTPS**
3. **添加 Rate Limiting**
4. **使用防火墙限制访问 IP**
5. **定期备份数据**
