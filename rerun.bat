echo Cleaning and rebuilding...
echo 1. Clean previous build
rmdir /s /q dist
rmdir /s /q android\app\build

echo 2. Force rebuild
call npm run build:app

if %ERRORLEVEL% NEQ 0 (
  echo Build failed!
  pause
  exit /b 1
)

echo 3. Capacitor sync
call npx cap sync android

if %ERRORLEVEL% NEQ 0 (
  echo Cap sync failed!
  pause
  exit /b 1
)

echo 4. Build APK
cd android
call gradlew.bat clean
call gradlew.bat assembleDebug

if %ERRORLEVEL% NEQ 0 (
  echo Gradle failed!
  pause
  exit /b 1
)

echo 5. Install APK
cd ..
C:/Users/45004/AppData/Local/Android/Sdk/platform-tools/adb.exe -s 4d942e4b uninstall com.yueting.music
C:/Users/45004/AppData/Local/Android/Sdk/platform-tools/adb.exe -s 4d942e4b install android/app/build/outputs/apk/debug/app-debug.apk

echo 6. Launch app
C:/Users/45004/AppData/Local/Android/Sdk/platform-tools/adb.exe -s 4d942e4b shell am start -n com.yueting.music/.MainActivity

echo Done!
pause