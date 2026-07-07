chcp 65001 > nul

npm run build:app

if %ERRORLEVEL% NEQ 0 (
  echo Build failed!
  pause
  exit /b 1
)

npx cap sync android

if %ERRORLEVEL% NEQ 0 (
  echo Capacitor sync failed!
  pause
  exit /b 1
)

cd android

call gradlew.bat assembleDebug

if %ERRORLEVEL% NEQ 0 (
  echo Gradle build failed!
  pause
  exit /b 1
)

cd ..

C:/Users/45004/AppData/Local/Android/Sdk/platform-tools/adb.exe -s 4d942e4b install -r android/app/build/outputs/apk/debug/app-debug.apk

if %ERRORLEVEL% NEQ 0 (
  echo APK install failed!
  pause
  exit /b 1
)

echo All tasks completed successfully!

C:/Users/45004/AppData/Local/Android/Sdk/platform-tools/adb.exe -s 4d942e4b shell am start -n com.yueting.music/.MainActivity