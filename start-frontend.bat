@echo off
title Academy SaaS - Admin Frontend
echo.
echo ===================================================
echo   ACADEMY SAAS - ADMIN FRONTEND LAUNCHER
echo ===================================================
echo.
echo Starting Admin Frontend (Vite + React)...
echo   URL: http://localhost:5173
echo.
echo Make sure backend services are running first!
echo Run start-backend.bat in a separate window.
echo.
cd /d "%~dp0"
npm run dev:frontend
pause
