@echo off
title Amazon Traffic Generator - Public Host
echo ==========================================
echo Starting Traffic Generator with Public URL
echo ==========================================

cd server
call npm install
echo.
echo Launching Server and Tunnel...
node share.js

pause
