@echo off
title Academy SaaS - Unified Monolith Backend
echo.
echo ===================================================
echo   ACADEMY SAAS - UNIFIED MONOLITH BACKEND LAUNCHER
echo ===================================================
echo.
echo Starting unified monolithic backend server on Port 3000...
echo.
echo Requires XAMPP MySQL running (port 3306).
echo   phpMyAdmin: http://localhost/phpmyadmin
echo   First-time DB setup: setup-xampp-db.bat  or  npm run db:setup
echo.

cd /d "%~dp0"

npm run db:check >nul 2>&1
if errorlevel 1 (
  echo [WARN] XAMPP databases not ready. Run setup-xampp-db.bat first.
  echo.
)

REM Run only the gateway workspace (which mounts all sub-service routes natively)
npm run dev --workspace=@academy-saas/gateway

echo.
pause
