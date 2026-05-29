#!/bin/bash

# WhaiBlog 博客系统启动脚本 (Linux/macOS)

cd "$(dirname "$0")/server"

# 加载环境变量
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# 默认端口
export PORT=${PORT:-8080}
export MCP_BRIDGE_PORT=${MCP_BRIDGE_PORT:-8081}

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# 启动服务器
echo "Starting WhaiBlog server on http://localhost:${PORT}"
node index.js
