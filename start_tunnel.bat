@echo off
setlocal EnableDelayedExpansion
title eRPAS Cloudflare Tunnel Launcher
echo ==============================================================================
echo                eRPAS Database Bridge and Tunnel Launcher
echo ==============================================================================
echo.

cd /d "%~dp0"

REM 1. Ensure local server (server.py) is running on port 8080
netstat -ano | findstr :8080 >nul 2>&1
if errorlevel 1 (
    echo [*] Local server is not running. Starting python server.py...
    start "eRPAS Server" /min cmd /c "python server.py"
    ping -n 3 127.0.0.1 >nul 2>&1
    echo [OK] Local server started on port 8080.
) else (
    echo [OK] Local server is already active on port 8080.
)

REM 2. Locate cloudflared.exe
set "CF_EXE="
if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" set "CF_EXE=C:\Program Files (x86)\cloudflared\cloudflared.exe"
if not defined CF_EXE if exist "C:\Program Files\cloudflared\cloudflared.exe" set "CF_EXE=C:\Program Files\cloudflared\cloudflared.exe"
if not defined CF_EXE set "CF_EXE=cloudflared"

echo.
echo ==============================================================================
echo [*] Starting Cloudflare Tunnel for eRPAS Server...
echo [*] Copy the https://....trycloudflare.com link shown below and paste it
echo     into the "Database Bridge" settings on your phone or Vercel website.
echo ==============================================================================
echo.
"%CF_EXE%" tunnel --url http://127.0.0.1:8080
pause
