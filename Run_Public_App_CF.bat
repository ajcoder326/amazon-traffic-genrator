@echo off
title Amazon Traffic Generator - Cloudflare Public Host
echo ==========================================
echo Starting via Cloudflare Tunnel (No Password Needed)
echo ==========================================

cd /d "%~dp0server"

if not exist cloudflared.exe (
    echo Downloading Cloudflare...
    curl -L -o cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
)

echo.
echo Launching...
node share_cf.js

pause
