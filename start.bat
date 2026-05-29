@echo off
echo ========================================
echo  WhaiBlog Blog System
echo ========================================
echo.

cd /d "%~dp0server"

if not exist node_modules (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting WhaiBlog...
echo   Frontend: http://localhost:%PORT%
echo   MCP Bridge: http://localhost:%MCP_BRIDGE_PORT%
echo.

node index.js
