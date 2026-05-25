@echo off
echo Starting JNJ POS...
docker compose up -d
timeout /t 3
pnpm dev
