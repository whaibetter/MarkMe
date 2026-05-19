@echo off
echo ========================================
echo  MarkMe Blog System
echo ========================================
echo.

cd /d "%~dp0server"

if not exist node_modules (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting MarkMe...
echo   Frontend: http://localhost:%PORT%
echo   MCP Bridge: http://localhost:%MCP_BRIDGE_PORT%
echo.

node index.js
