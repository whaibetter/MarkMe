# MarkMe (WhaiBlog) Pre-Launch Code Review Report

**Reviewer**: gstack-product-reviewer  
**Date**: 2026-06-09  
**Scope**: Full codebase static analysis (server + client)  
**Verdict**: **Conditional GO** — 有 2 个 P0 必须修复后才能上线，其余问题可上线后迭代

---

## Executive Summary

WhaiBlog 是一个功能完整的轻量级博客系统，架构清晰、代码可读性好。核心 API 使用了参数化查询（SQL 注入防护良好），有基本的安全头和认证机制。但存在 **2 个关键安全漏洞**（HTML 内容 XSS 和 update 动态列名注入）必须在上线前修复，以及若干生产就绪性缺失项需要关注。

---

## 🔴 严重 (P0) — 必须修复后才能上线

### P0-1: HTML Feed 内容直接渲染导致 XSS

**位置**: `server/index.js:28` (RSS fetcher 存储), `client/js/components/modal.js:78` (渲染)  
**问题**: `openHtmlModal()` 直接将 `bodyContent` 设置为 `wrapper.innerHTML`（第78行），而 feed 内容来自外部 RSS 源。攻击者可通过 RSS 源注入恶意 `<script>` 或事件处理器。虽然样式通过 `createElement('style')` 注入，但 HTML body 直接 `innerHTML` 无任何净化。  
**攻击路径**: 添加恶意 RSS 源 → RSS fetcher 抓取并存储恶意 HTML → 用户浏览 feed → `openHtmlModal()` 渲染 → XSS 执行  
**建议修复**: 
1. 引入 DOMPurify 或 sanitize-html 对 HTML feed 内容做白名单净化
2. 在 `rss-fetcher.js` 的 `fetchSource()` 存储前净化内容
3. 在 `openHtmlModal()` 渲染前再次净化（纵深防御）

### P0-2: update_post / update_feed 动态列名注入

**位置**: `server/bridge-router.js:85`, `server/mcp-http-bridge.js:339`, `server/mcp-server.js:436`  
**问题**: `update_post` 和 `update_feed` 的实现中，直接将用户传入的对象 key 拼接为 SQL 列名：
```js
fields.push(`${key} = ?`);
```
攻击者可传入 `{"id": 1, "title": "test", "status = 'x' OR 1=1 --": "y"}` 构造注入。虽然 better-sqlite3 的参数化查询对**值**做了保护，但**列名**部分是字符串拼接，不受参数化保护。  
**攻击路径**: 通过 MCP bridge / HTTP bridge / MCP server 传入恶意 key 名 → SQL 注入  
**建议修复**: 
1. 维护允许更新的列名白名单：`const ALLOWED_POST_FIELDS = new Set(['title', 'content', 'summary', 'tags', 'status'])`
2. 过滤 `Object.entries(updates)` 只保留白名单中的 key
3. 三处实现（bridge-router、mcp-http-bridge、mcp-server）都需要修复

---

## 🟠 高 (P1) — 强烈建议上线前修复

### P1-1: 全局无 Rate Limiting

**位置**: `server/index.js` 全局  
**问题**: 所有 API 端点无请求频率限制。虽然 `express-rate-limit` 已作为 `@modelcontextprotocol/sdk` 的依赖安装，但应用代码未使用。攻击者可暴力枚举、DDoS 或大量抓取内容。  
**建议修复**: 
```js
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);
```

### P1-2: 主服务器缺乏写操作认证

**位置**: `server/index.js:94-266`  
**问题**: 主服务器（8080端口）的 API 路由没有任何认证。POST/PUT/DELETE 操作（虽然 index.js 中未暴露写操作路由，但 bridge-router 的写操作在 `/bridge/` 路径下需要认证）均可被任意访问。当前 index.js 中只有读操作和 RSS 管理需要认证，但 `app.post('/api/rss/sources', rssAuth, ...)` 之外的 RSS 操作依赖 `rssAuth` 中间件——如果 `API_KEY` 为空则跳过认证。  
**建议修复**: 至少确保生产环境强制要求 `MARKME_API_KEY` 环境变量

### P1-3: 无全局错误处理 / 无 uncaughtException 处理

**位置**: `server/index.js` 全局  
**问题**: 无 `process.on('uncaughtException')` 或 `process.on('unhandledRejection')` 处理。async 路由中的未捕获异常会导致进程崩溃。  
**建议修复**: 
```js
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
```

### P1-4: 自定义 Body Parser 无大小限制

**位置**: `server/index.js:24-62`, `server/mcp-http-bridge.js:24-56`  
**问题**: 自定义 UTF-8 body parser 通过 `req.on('data')` 收集 chunks 但没有大小限制。攻击者可发送超大请求体耗尽内存。`express.urlencoded` 有 50MB 限制，但 JSON 路径没有。  
**建议修复**: 在 body parser 中添加 `buf.length > MAX_FILE_SIZE` 检查

### P1-5: MCP upload_file 缺少文件扩展名/大小检查

**位置**: `server/mcp-server.js:482-519`  
**问题**: MCP server 的 `upload_file` 工具没有 `isAllowedFile()` 和文件大小检查（bridge-router 和 mcp-http-bridge 都有）。任何文件类型（包括 .exe、.sh 等）都可上传。  
**建议修复**: 复用 `isAllowedFile()` 和 `MAX_FILE_SIZE` 检查

---

## 🟡 中 (P2) — 建议修复

### P2-1: 大量代码重复（DRY 违反）

**位置**: `server/bridge-router.js`, `server/mcp-http-bridge.js`, `server/mcp-server.js`  
**问题**: 三个文件中的 `executeTool()` 函数几乎完全相同（~300 行重复代码）。TOOLS 定义也重复了三次。维护时极易出现不一致（如 P1-5 就是不一致的直接后果）。  
**建议修复**: 抽取 `server/tool-executor.js` 共享模块，三个入口点共用

### P2-2: tags LIKE 查询效率低

**位置**: `server/index.js:104`, `server/index.js:163`  
**问题**: `tags LIKE '%${tag}%'` 使用全表扫描。当 posts/feeds 表增长后会显著变慢。且 LIKE 模糊匹配可能匹配到非预期标签（如搜索 "js" 会匹配 "json"）。  
**建议修复**: 
1. 短期：用 `json_each()` 或精确匹配 `'"tag"'`
2. 长期：考虑 tags 独立表或 FTS5 全文索引

### P2-3: feed COUNT 查询缺少 tag 过滤

**位置**: `server/index.js:179-191`  
**问题**: feeds 的分页 count 查询只考虑了 `source` 过滤，没有考虑 `tag` 过滤。如果有 tag 参数，返回的 total 不准确，导致分页显示错误。  
**建议修复**: 将 tag 过滤条件也加入 totalQuery

### P2-4: FRONTEND: escapeHtml 重复定义

**位置**: `client/js/utils.js:43`, `client/js/pages/notes.js:389`, `client/js/components/modal.js:125`  
**问题**: `escapeHtml` 函数在三个文件中分别定义，逻辑相同但实现略有不同（notes.js 用 `String(str)` 包装，utils.js 不用）。  
**建议修复**: 统一使用 `utils.js` 的导出版本

### P2-5: FRONTEND: onclick 内联事件与 CSP 不兼容

**位置**: `client/js/pages/home.js:61,67,86-91`, `client/js/pages/feed.js:91-95`  
**问题**: 大量使用 `onclick="goTag(...)"` 和 `onclick="window._homePage(...)"` 内联事件处理器。如果未来启用 CSP（Content-Security-Policy）头，这些会被阻止。  
**建议修复**: 改用 `addEventListener` 绑定（feed.js 中部分已使用此模式，保持一致）

### P2-6: FRONTEND: openHtmlModal 的 style 注入风险

**位置**: `client/js/components/modal.js:46-51`  
**问题**: 从 HTML 内容中提取 `<style>` 标签直接注入，可能包含 `@import url(...)` 加载外部 CSS 或利用 CSS 进行数据泄露。  
**建议修复**: 对提取的 CSS 进行净化（移除 @import、url() 等）

### P2-7: notes-sync execSync 同步阻塞

**位置**: `server/notes-sync.js:97`  
**问题**: `syncNotes()` 使用 `execSync('git pull')`，会阻塞事件循环。在生产环境中如果 git pull 耗时较长（网络问题），会冻结整个服务器 60 秒。  
**建议修复**: 改用异步 `exec()` + Promise

### P2-8: RSS fetch 并发控制缺失

**位置**: `server/rss-fetcher.js:112-122`  
**问题**: `fetchAllSources()` 顺序执行所有源的抓取。如果有大量源，总耗时可能很长。同时 cron job 每 30 分钟触发，如果上次还没执行完会重叠。  
**建议修复**: 添加执行锁（如 `let isFetching = false`），防止重叠执行

---

## 🟢 低 (P3) — 可上线后迭代

### P3-1: 无请求日志

**问题**: 没有使用 morgan 或任何 HTTP 请求日志中间件。生产环境无法追踪请求。  
**建议**: `npm i morgan`，添加 `app.use(morgan('combined'))`

### P3-2: 缺少健康检查端点

**问题**: 无 `/health` 或 `/ready` 端点，Docker/K8s 部署时无法做健康检查。  
**建议**: `app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }))`

### P3-3: Dockerfile 缺少非 root 用户

**位置**: `Dockerfile`  
**问题**: 容器以 root 运行，安全最佳实践应使用非 root 用户。  
**建议**: `RUN addgroup -g 1001 -S app && adduser -S app -u 1001`，`USER app`

### P3-4: Docker Compose 缺少 MCP Bridge 端口

**位置**: `docker-compose.yml`  
**问题**: 只暴露了 8080 端口，MCP HTTP Bridge (8081) 未暴露。  
**建议**: 添加 `"8081:8081"` 端口映射

### P3-5: .env.example 缺失

**问题**: 没有 `.env.example` 文件说明可配置的环境变量。新开发者需要阅读 `config.js` 才能知道有哪些选项。  
**建议**: 创建 `.env.example` 列出所有配置项及默认值

### P3-6: 无自动化测试

**问题**: 没有任何测试文件或测试框架。  
**建议**: 考虑添加基本的 API 集成测试（至少覆盖 CRUD 操作）

### P3-7: package.json 无 devDependencies

**问题**: 所有依赖都在 `dependencies` 中，`@modelcontextprotocol/sdk` 和 `jsdom` 可能仅在特定场景使用。  
**建议**: 区分 runtime 和 dev 依赖

### P3-8: FRONTEND: 无 404 页面

**问题**: catch-all 路由（`index.js:328`）对所有未匹配路径返回 `index.html`，但前端 router 没有处理无效路由的逻辑（会默认显示 feed 页面）。  
**建议**: 在 router.js 中添加 fallback 404 处理

---

## 架构亮点（做得好的部分）

1. **SQL 注入防护扎实**: 所有 CRUD 操作使用 better-sqlite3 的参数化查询（`?` 占位符），基础防护到位
2. **WAL 模式**: 数据库使用 WAL 日志模式，支持并发读写
3. **Foreign Keys ON**: 启用了外键约束，数据完整性有保障
4. **路径遍历防护**: `isPathSafe()` 检查 `..` 和 `fullPath.startsWith(NOTES_DIR)` 双重防护
5. **前端 ES Modules**: 使用原生 ES Modules，无打包依赖，加载清晰
6. **CSS 模块化**: CSS 按功能拆分为独立文件，维护性好
7. **i18n 支持**: 内置中英文切换，国际化考虑周到
8. **XSS 基础防护**: 前端有 `escapeHtml()` 对用户输入转义
9. **UTF-8 兼容**: 自定义 body parser 处理 GBK/GB18030 编码，兼容性好
10. **Git 仓库路径安全**: notes-sync 使用 `fullPath.startsWith(NOTES_DIR)` 防止目录穿越

---

## 上线检查清单

| # | 项目 | 状态 | 优先级 |
|---|------|------|--------|
| 1 | 修复 HTML feed XSS | ❌ 待修 | P0 |
| 2 | 修复 update 动态列名注入 | ❌ 待修 | P0 |
| 3 | 添加 Rate Limiting | ❌ 待修 | P1 |
| 4 | 确保生产环境 API_KEY 必须设置 | ❌ 待修 | P1 |
| 5 | 添加 uncaughtException 处理 | ❌ 待修 | P1 |
| 6 | Body parser 大小限制 | ❌ 待修 | P1 |
| 7 | MCP upload_file 安全检查 | ❌ 待修 | P1 |
| 8 | 添加 /health 端点 | ❌ 待修 | P3 |
| 9 | 创建 .env.example | ❌ 待修 | P3 |
| 10 | Dockerfile 非 root 用户 | ❌ 待修 | P3 |

**结论**: 修复 P0-1 和 P0-2 后可以上线。P1 项强烈建议在上线后一周内完成。
