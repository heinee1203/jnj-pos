@echo off
title JNJ POS - Dev Servers
echo Starting JNJ POS...
echo.

cd /d "%~dp0"

start "JNJ API (port 3005)" cmd /k "pnpm dev"
start "JNJ Web (port 3011)" cmd /k "pnpm web:dev"

echo.
echo API  → http://192.168.100.22:3005
echo Web  → http://192.168.100.22:3011
echo.
echo Login: admin@jnj.com / admin12345
pause
