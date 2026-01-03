@echo off
title Traffic Generator - Main Menu
color 0B
mode con: cols=70 lines=30

:MENU
cls
echo.
echo ========================================================================
echo                    TRAFFIC GENERATOR - MAIN MENU
echo ========================================================================
echo.
echo                        Web Proxy TURBO Mode
echo              3 Browsers x 5 Tabs = 15 Parallel Visits!
echo.
echo ========================================================================
echo.
echo   [1] First Time Setup (Install Everything)
echo.
echo   [2] Run Server - LOCAL Access Only
echo       (Access: http://localhost:3000)
echo.
echo   [3] Run Server - PUBLIC Access (Cloudflare Tunnel)
echo       (Get public HTTPS URL)
echo.
echo   [4] Open Quick Start Guide (HTML)
echo.
echo   [5] View Installation Guide (README)
echo.
echo   [6] Check System Requirements
echo.
echo   [7] Kill All Node Processes
echo.
echo   [0] Exit
echo.
echo ========================================================================
echo.
set /p choice="Enter your choice (0-7): "

if "%choice%"=="1" goto SETUP
if "%choice%"=="2" goto LOCAL
if "%choice%"=="3" goto CLOUDFLARE
if "%choice%"=="4" goto QUICKSTART
if "%choice%"=="5" goto README
if "%choice%"=="6" goto SYSCHECK
if "%choice%"=="7" goto KILLNODE
if "%choice%"=="0" goto EXIT

echo Invalid choice! Please try again.
timeout /t 2 >nul
goto MENU

:SETUP
cls
echo.
echo ========================================================================
echo                    RUNNING FIRST TIME SETUP
echo ========================================================================
echo.
call SETUP_COMPLETE.bat
echo.
echo Setup completed! Press any key to return to menu...
pause >nul
goto MENU

:LOCAL
cls
echo.
echo ========================================================================
echo                    STARTING LOCAL SERVER
echo ========================================================================
echo.
cd /d "%~dp0"
call Run_Local.bat
goto MENU

:CLOUDFLARE
cls
echo.
echo ========================================================================
echo                STARTING CLOUDFLARE TUNNEL (PUBLIC)
echo ========================================================================
echo.
cd /d "%~dp0"
call Run_Public_Cloudflare.bat
goto MENU

:QUICKSTART
cls
echo.
echo Opening Quick Start Guide in browser...
start "" "%~dp0QUICK_START_GUIDE.html"
echo.
echo Guide opened! Press any key to return to menu...
pause >nul
goto MENU

:README
cls
echo.
echo Opening Installation Guide...
start "" "%~dp0INSTALLATION_GUIDE.md"
echo.
echo Guide opened! Press any key to return to menu...
pause >nul
goto MENU

:SYSCHECK
cls
echo.
echo ========================================================================
echo                    SYSTEM REQUIREMENTS CHECK
echo ========================================================================
echo.
echo Checking installed software...
echo.

echo [1] Node.js:
where node >nul 2>&1
if %errorlevel%==0 (
    echo     ✓ FOUND
    node --version
) else (
    echo     ✗ NOT FOUND - Install from https://nodejs.org/
)

echo.
echo [2] NPM:
where npm >nul 2>&1
if %errorlevel%==0 (
    echo     ✓ FOUND
    npm --version
) else (
    echo     ✗ NOT FOUND - Comes with Node.js
)

echo.
echo [3] Dependencies:
if exist "%~dp0server\node_modules" (
    echo     ✓ INSTALLED
) else (
    echo     ✗ NOT INSTALLED - Run option 1 (Setup)
)

echo.
echo [4] Chromium Browser:
cd /d "%~dp0server"
call npx playwright list-files chromium >nul 2>&1
if %errorlevel%==0 (
    echo     ✓ INSTALLED
) else (
    echo     ✗ NOT INSTALLED - Run option 1 (Setup)
)

echo.
echo [5] Cloudflare Binary:
if exist "%~dp0server\cloudflared.exe" (
    echo     ✓ FOUND
) else (
    echo     ✗ NOT FOUND - Run option 1 (Setup) or option 3
)

echo.
echo ========================================================================
echo.
echo System Requirements:
echo   - Windows 10/11 (64-bit)
echo   - 8GB RAM minimum (16GB recommended)
echo   - 5GB free disk space
echo   - Internet connection
echo.
echo ========================================================================
echo.
pause
goto MENU

:KILLNODE
cls
echo.
echo ========================================================================
echo                    KILLING NODE.JS PROCESSES
echo ========================================================================
echo.
taskkill /F /IM node.exe 2>nul
if %errorlevel%==0 (
    echo ✓ Node.js processes killed successfully!
) else (
    echo No Node.js processes found running.
)
echo.
echo Press any key to return to menu...
pause >nul
goto MENU

:EXIT
cls
echo.
echo Thank you for using Traffic Generator!
echo.
timeout /t 2 >nul
exit

