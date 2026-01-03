@echo off
title Traffic Generator - Complete Setup
color 0A

echo.
echo ========================================================
echo     TRAFFIC GENERATOR - COMPLETE INSTALLATION
echo ========================================================
echo.
echo This will install everything needed to run the
echo Traffic Generator with Web Proxy TURBO Mode
echo.
echo Requirements:
echo   - Node.js 18+ installed
echo   - Internet connection
echo.
echo ========================================================
pause

cd /d "%~dp0server"

echo.
echo ========================================================
echo [1/5] Installing Node.js dependencies...
echo ========================================================
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm install failed!
    echo Please ensure Node.js is installed: https://nodejs.org/
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================================
echo [2/5] Installing Playwright Chromium Browser...
echo ========================================================
echo (Required for Web Proxy mode)
call npx playwright install chromium
if %errorlevel% neq 0 (
    echo [WARNING] Browser installation had issues.
    echo You may need to run this manually later.
)

echo.
echo ========================================================
echo [3/5] Installing Playwright system dependencies...
echo ========================================================
call npx playwright install-deps chromium
if %errorlevel% neq 0 (
    echo [WARNING] System dependencies installation had issues.
)

echo.
echo ========================================================
echo [4/5] Checking for Cloudflare Tunnel binary...
echo ========================================================
if not exist cloudflared.exe (
    echo Downloading cloudflared.exe...
    curl -L -o cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
    if exist cloudflared.exe (
        echo Download complete!
    ) else (
        echo [WARNING] Failed to download cloudflared.exe
        echo You can download manually from:
        echo https://github.com/cloudflare/cloudflared/releases
    )
) else (
    echo cloudflared.exe already exists - OK!
)

echo.
echo ========================================================
echo [5/5] Creating proxy configuration...
echo ========================================================
if not exist proxies.json (
    echo Creating default proxies.json...
    echo [] > proxies.json
    echo Default proxy file created.
) else (
    echo proxies.json already exists - OK!
)

echo.
echo ========================================================
echo                 SETUP COMPLETE!
echo ========================================================
echo.
echo You can now run the Traffic Generator:
echo.
echo   1. Local Access Only:
echo      Double-click: Run_Local.bat
echo.
echo   2. Public Access (Cloudflare Tunnel):
echo      Double-click: Run_Public_CF.bat
echo.
echo --------------------------------------------------------
echo WEB PROXY TURBO MODE FEATURES:
echo --------------------------------------------------------
echo   ✓ 3 Browsers × 5 Tabs = 15 Parallel Visits
echo   ✓ 5 Different Proxy Services (CroxyProxy, etc.)
echo   ✓ Each tab gets a different IP address
echo   ✓ FREE - No proxy list needed!
echo.
echo ========================================================
echo.
pause
