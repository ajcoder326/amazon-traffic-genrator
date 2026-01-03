@echo off
title Push Updates to GitHub
color 0B

echo.
echo ========================================================
echo          PUSH UPDATES TO GITHUB
echo ========================================================
echo.

cd /d "c:\Users\dj\Downloads\traffic-generator\deploy"

echo Current status:
echo --------------------------------------------------------
git status --short

echo.
echo --------------------------------------------------------
echo.
set /p commit_msg="Enter commit message (or press Enter for default): "

if "%commit_msg%"=="" set commit_msg=Update Traffic Generator

echo.
echo Adding all changes...
git add .

echo.
echo Committing changes...
git commit -m "%commit_msg%"

echo.
echo Pushing to GitHub...
git push

echo.
echo ========================================================
echo          ✅ UPDATE PUSHED TO GITHUB!
echo ========================================================
echo.
echo Repository: https://github.com/ajcoder326/amazon-traffic-genrator
echo.
echo Team members can now pull updates with:
echo   git pull
echo.
pause
