@echo off
title eRPAS Cloudflare Tunnel Launcher
echo ==============================================================================
echo                eRPAS Database Bridge ^& Tunnel Launcher
echo ==============================================================================
echo.
echo [*] Checking for cloudflared...
where cloudflared >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] cloudflared not found. Installing via winget...
    winget install --id Cloudflare.cloudflared --silent --accept-source-agreements --accept-package-agreements
    echo [*] Installation finished. Starting tunnel...
)

echo [*] Starting Cloudflare Tunnel for eRPAS Server (Port 8080)...
echo [*] Copy the https://....trycloudflare.com URL shown below and paste it
echo     into the "Database Bridge" settings on your phone or Vercel website.
echo ==============================================================================
echo.
cloudflared tunnel --url http://localhost:8080
pause
