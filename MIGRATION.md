# MarkMe 迁移到 Linux 指南

## 兼容性总结

| 组件 | Windows | Linux/macOS | 说明 |
|------|---------|-------------|------|
| Node.js 代码 | ✅ | ✅ | 使用 `path.join`，完全跨平台 |
| SQLite 数据库 | ✅ | ✅ | 文件格式兼容 |
| 启动脚本 | `.bat` | `.sh` | 需要使用对应的脚本 |
| 文件路径 | `\` 或 `/` | `/` | 代码中已处理 |

## 迁移步骤

### 1. 复制项目文件

```bash
# 在 Windows 上打包
cd C:\Users\whai\Documents\Project
tar -czf markme.tar.gz MarkMe/

# 传输到 Linux
scp markme.tar.gz user@linux-server:/home/user/

# 在 Linux 上解压
tar -xzf markme.tar.gz
```

### 2. 安装依赖

```bash
cd MarkMe/server
npm install
```

**注意**: `better-sqlite3` 是原生模块，会在安装时自动编译。确保系统已安装：
- Node.js (v18+)
- npm
- build-essential (Ubuntu/Debian) 或 Development Tools (CentOS/RHEL)

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm build-essential python3

# CentOS/RHEL
sudo yum install -y nodejs npm gcc-c++ make python3
```

### 3. 启动服务

```bash
# 方式一：只启动主服务器
./start.sh

# 方式二：启动所有服务（包括 MCP Bridge）
./start-all.sh

# 方式三：后台运行
nohup ./start-all.sh > markme.log 2>&1 &
```

### 4. 配置防火墙

```bash
# 如果使用 ufw (Ubuntu)
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp

# 如果使用 firewalld (CentOS)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

## 需要修改的配置

### 1. MCP 配置路径

将配置中的 Windows 路径改为 Linux 路径：

```json
{
  "mcpServers": {
    "markme": {
      "command": "node",
      "args": ["/home/user/MarkMe/server/mcp-server.js"],
      "cwd": "/home/user/MarkMe/server"
    }
  }
}
```

### 2. Claude Code Skill

更新 `skills/markme-manager.json` 中的路径说明。

### 3. Python SDK

更新 `sdk/markme_client.py` 中的默认服务器地址（如果部署在远程服务器）。

## 使用 systemd 管理服务（推荐）

创建服务文件 `/etc/systemd/system/markme.service`：

```ini
[Unit]
Description=MarkMe Blog System
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/home/user/MarkMe/server
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
Environment=PORT=3000
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

创建 MCP Bridge 服务 `/etc/systemd/system/markme-bridge.service`：

```ini
[Unit]
Description=MarkMe MCP HTTP Bridge
After=network.target markme.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/home/user/MarkMe/server
ExecStart=/usr/bin/node mcp-http-bridge.js
Restart=always
RestartSec=10
Environment=MCP_BRIDGE_PORT=3001

[Install]
WantedBy=multi-user.target
```

启用并启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable markme markme-bridge
sudo systemctl start markme markme-bridge

# 查看状态
sudo systemctl status markme
sudo systemctl status markme-bridge
```

## 使用 Nginx 反向代理（推荐）

```nginx
server {
    listen 80;
    server_name blog.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/mcp/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

## 常见问题

### Q: 数据库需要重新创建吗？

A: 不需要。SQLite 数据库文件 (`markme.db`) 是跨平台的，直接复制即可。

### Q: 上传的文件需要迁移吗？

A: 需要。`server/uploads/` 目录中的文件需要一起复制。

### Q: 编码问题会存在吗？

A: Linux 默认使用 UTF-8，Windows 上的编码问题在 Linux 上不会出现。

### Q: 如何备份？

```bash
# 备份脚本
tar -czf markme-backup-$(date +%Y%m%d).tar.gz \
    MarkMe/server/markme.db \
    MarkMe/server/uploads/ \
    MarkMe/client/ \
    MarkMe/skills/
```
