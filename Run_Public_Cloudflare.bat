@echo off
title Traffic Generator - Cloudflare Public Access
color 0E

echo.
echo ========================================================
echo     TRAFFIC GENERATOR - PUBLIC ACCESS
echo             (via Cloudflare Tunnel)
echo ========================================================
echo.
echo This will:
echo   1. Start the server on localhost:3000
echo   2. Create a public HTTPS URL via Cloudflare
echo   3. Share the URL so you can access from anywhere
echo.
echo ========================================================
echo.

cd /d "%~dp0server"

:: Check if node_modules exists
if not exist node_modules (
    echo [ERROR] Dependencies not installed!
    echo Please run SETUP_COMPLETE.bat first
    echo.
    pause
    exit /b 1
)

:: Check if cloudflared.exe exists
if not exist cloudflared.exe (
    echo.
    echo Cloudflare binary not found. Downloading...
    curl -L -o cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
    if not exist cloudflared.exe (
        echo [ERROR] Failed to download cloudflared.exe
        echo Please download manually from:
        echo https://github.com/cloudflare/cloudflared/releases
        pause
        exit /b 1
    )
)

echo.
echo Starting Cloudflare Tunnel...
echo.
echo --------------------------------------------------------
echo Please wait... Your public URL will appear below
echo --------------------------------------------------------
echo.

node share_cf.js

pause
