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

if %ERRORLEVEL% NEQ 0 (
  echo Build failed!
  pause
  exit /b 1
)

echo Running npx cap sync android...
npx cap sync android

if %ERRORLEVEL% NEQ 0 (
  echo Capacitor sync failed!
  pause
  exit /b 1
)

cd android

echo Running gradlew assembleDebug...
call gradlew.bat assembleDebug

if %ERRORLEVEL% NEQ 0 (
  echo Gradle build failed!
  pause
  exit /b 1
)

cd ..

echo Installing APK to device...
C:/Users/45004/AppData/Local/Android/Sdk/platform-tools/adb.exe -s 4d942e4b install -r android/app/build/outputs/apk/debug/app-debug.apk

if %ERRORLEVEL% NEQ 0 (
  echo APK install failed!
  pause
  exit /b 1
)

echo All tasks completed successfully!
