chcp 65001

echo 1. Build app
call npm run build:app

if %ERRORLEVEL% NEQ 0 (
  echo Build failed!
  pause
  exit /b 1
)

echo 2. Capacitor sync
call npx cap sync android

if %ERRORLEVEL% NEQ 0 (
  echo Cap sync failed!
  pause
  exit /b 1
)

echo 3. Build APK
cd android
call gradlew.bat assembleDebug

if %ERRORLEVEL% NEQ 0 (
  echo Gradle build failed!
  pause
  exit /b 1
)

echo 4. Install APK
cd ..
C:/Users/45004/AppData/Local/Android/Sdk/platform-tools/adb.exe -s 4d942e4b install -r android/app/build/outputs/apk/debug/app-debug.apk

echo 5. Launch app
C:/Users/45004/AppData/Local/Android/Sdk/platform-tools/adb.exe -s 4d942e4b shell am start -n com.yueting.music/.MainActivity

echo Done!
pause