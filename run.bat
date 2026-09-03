@echo off
title Launching Real Property Assessment System (eRPAS)
cd /d "C:\eGaps\rpas-ui"
netstat -ano | findstr :8080 >nul
if %errorlevel% neq 0 (
    start "" /b python server.py
    timeout /t 2 /nobreak >nul
)
start "" "http://localhost:8080"
