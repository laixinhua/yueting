@echo off
chcp 65001 > nul

cd /d d:\yueting-main\yueting-main\android
if not exist gradlew.bat (
  echo Error: gradlew.bat not found in android directory!
  pause
  exit /b 1
)

echo Running gradlew assembleDebug...
call gradlew.bat assembleDebug
