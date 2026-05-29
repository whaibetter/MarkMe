#!/bin/bash

# WhaiBlog 博客系统 - 完整启动脚本 (Linux/macOS)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/server"

# 加载环境变量
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# 默认端口
export PORT=${PORT:-8080}
export MCP_BRIDGE_PORT=${MCP_BRIDGE_PORT:-8081}

# 颜色
GREEN='\033[0;32m'
NC='\033[0m'

echo "========================================"
echo " WhaiBlog Blog System - Full Launch"
echo "========================================"
echo ""

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "[1/3] Installing dependencies..."
    npm install
    echo ""
fi

# 启动主服务器
echo -e "${GREEN}[2/3]${NC} Starting Main Server (port ${PORT})..."
node index.js &
MAIN_PID=$!
sleep 2

# 启动 MCP HTTP Bridge
echo -e "${GREEN}[3/3]${NC} Starting MCP HTTP Bridge (port ${MCP_BRIDGE_PORT})..."
node mcp-http-bridge.js &
BRIDGE_PID=$!
sleep 2

echo ""
echo "========================================"
echo -e " ${GREEN}WhaiBlog is running!${NC}"
echo "========================================"
echo ""
echo "  Frontend:        http://localhost:${PORT}"
echo "  API:             http://localhost:${PORT}/api"
echo "  MCP HTTP Bridge: http://localhost:${MCP_BRIDGE_PORT}"
echo ""
echo "  PIDs: Main=$MAIN_PID, Bridge=$BRIDGE_PID"
echo ""
echo "  Press Ctrl+C to stop all servers"
echo ""

# 捕获退出信号
trap "echo 'Stopping servers...'; kill $MAIN_PID $BRIDGE_PID 2>/dev/null; exit" INT TERM

# 等待
wait
