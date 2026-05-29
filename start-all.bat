@echo off
echo ========================================
echo  WhaiBlog Blog System - Full Launch
echo ========================================
echo.

cd /d "%~dp0server"

if not exist node_modules (
    echo [1/3] Installing dependencies...
    call npm install
    echo.
)

echo [2/3] Starting Main Server (port %PORT%)...
start "WhaiBlog Server" cmd /c "node index.js"
timeout /t 2 /nobreak > nul

echo [3/3] Starting MCP HTTP Bridge (port %MCP_BRIDGE_PORT%)...
start "WhaiBlog MCP Bridge" cmd /c "node mcp-http-bridge.js"
timeout /t 2 /nobreak > nul

echo.
echo ========================================
echo  WhaiBlog is running!
echo ========================================
echo.
echo  Frontend:        http://localhost:%PORT%
echo  API:             http://localhost:%PORT%/api
echo  MCP HTTP Bridge: http://localhost:%MCP_BRIDGE_PORT%
echo.
echo  Press any key to stop all servers...
pause > nul

taskkill /FI "WindowTitle eq WhaiBlog Server*" /F > nul 2>&1
taskkill /FI "WindowTitle eq WhaiBlog MCP Bridge*" /F > nul 2>&1
echo Servers stopped.
