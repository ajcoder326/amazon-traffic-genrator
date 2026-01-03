@echo off
title Traffic Generator - Initial Setup
echo ==========================================
echo Setting up Traffic Generator Server...
echo ==========================================

cd /d "%~dp0server"

echo.
echo [1/3] Installing Node.js dependencies...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm install failed. Please ensure Node.js is installed.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Installing Browsers (Firefox + Chromium for VPN mode)...
call npx playwright install firefox
call npx playwright install chromium
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install browsers. You might need to run this manually.
    pause
)

echo.
echo [3/3] Checking for Cloudflare Tunnel binary...
if not exist cloudflared.exe (
    echo Downloading Cloudflare...
    curl -L -o cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
    if exist cloudflared.exe (
        echo Download complete.
    ) else (
        echo [ERROR] Failed to download cloudflared.exe. Please check your internet connection.
    )
) else (
    echo cloudflared.exe already exists.
)

echo.
echo ==========================================
echo Setup Complete!
echo.
echo NEXT STEPS FOR VPN MODE:
echo 1. Install Planet VPN in Chrome
echo 2. Run: node download_extension.js
echo 3. Run the app and enable VPN mode
echo ==========================================
pause
