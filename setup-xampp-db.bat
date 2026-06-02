@echo off
title Academy SaaS - XAMPP Database Setup
echo.
echo Import schema.sql into XAMPP MySQL (shared + tenant_demo)
echo Make sure MySQL is STARTED in XAMPP Control Panel first.
echo.
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "scripts\setup-xampp-db.ps1"
pause
