@echo off
title eRPAS Cloudflare Tunnel Launcher
echo ==============================================================================
echo                eRPAS Database Bridge ^& Tunnel Launcher
echo ==============================================================================
echo.

cd /d "%~dp0"

:: 1. Ensure python server.py is running on port 8080
netstat -ano | findstr :8080 >nul 2>&1
if %errorLevel% neq 0 (
    echo [*] eRPAS local server (server.py) is not running. Starting it now...
    start "eRPAS Database Server (Port 8080)" /min cmd /c "python server.py"
    timeout /t 3 /nobreak >nul
    echo [OK] eRPAS local server started on port 8080.
) else (
    echo [OK] eRPAS local server is already active on port 8080.
)

:: 2. Check for cloudflared
where cloudflared >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] cloudflared not found. Installing via winget...
    winget install --id Cloudflare.cloudflared --silent --accept-source-agreements --accept-package-agreements
    echo [*] Installation finished. Starting tunnel...
)

echo.
echo ==============================================================================
echo [*] Launching Cloudflare Tunnel for eRPAS Server (Port 8080)...
echo [*] Copy the https://....trycloudflare.com URL shown below and paste it
echo     into the "Database Bridge" settings on your phone or Vercel website.
echo ==============================================================================
echo.
cloudflared tunnel --url http://127.0.0.1:8080
pause
