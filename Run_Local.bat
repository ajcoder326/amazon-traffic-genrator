@echo off
title Traffic Generator - Local Server
color 0B

echo.
echo ========================================================
echo     TRAFFIC GENERATOR - LOCAL MODE
echo ========================================================
echo.
echo Starting server on: http://localhost:3000
echo.
echo Access from this PC only - No public access
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

echo Starting server...
echo.
echo --------------------------------------------------------
echo READY! Open your browser and go to:
echo.
echo     http://localhost:3000
echo.
echo --------------------------------------------------------
echo.
echo Press Ctrl+C to stop the server
echo.

node server.js

pause
