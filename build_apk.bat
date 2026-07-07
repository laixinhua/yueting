@echo off
chcp 65001 > nul
cd /d d:\yueting-main\yueting-main

if not exist package.json (
  echo Error: package.json not found!
  pause
  exit /b 1
)

echo Running npm run build:app...
npm run build:app
