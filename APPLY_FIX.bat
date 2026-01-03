@echo off
title Applying Server Fixes...
echo ==========================================
echo Applying Resource and Browser Fixes
echo ==========================================

echo.
echo [1/2] Updating Code Files...
node patch_files.js
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to update files. Is Node.js installed?
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Installing Firefox Browser...
call setup.bat

echo.
echo ==========================================
echo Fixes Applied! 
echo You can now run your app normally.
echo ==========================================
pause
