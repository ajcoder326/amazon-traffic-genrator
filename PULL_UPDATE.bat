@echo off
title Pull Updates from GitHub
color 0E

echo.
echo ========================================================
echo          PULL UPDATES FROM GITHUB
echo ========================================================
echo.

cd /d "%~dp0"

echo Checking for updates...
echo --------------------------------------------------------
git fetch

echo.
echo Current branch:
git branch --show-current

echo.
echo Pulling latest changes...
git pull

echo.
echo ========================================================
echo          ✅ UPDATES PULLED!
echo ========================================================
echo.
echo If package.json changed, re-run setup:
echo   .\SETUP_COMPLETE.bat
echo.
pause
