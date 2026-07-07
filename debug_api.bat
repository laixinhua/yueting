@echo off
C:/Users/45004/AppData/Local/Android/Sdk/platform-tools/adb.exe -s 4d942e4b logcat -c
C:/Users/45004/AppData/Local/Android/Sdk/platform-tools/adb.exe -s 4d942e4b shell am start -n com.yueting.music/.MainActivity
timeout /t 5 > nul
C:/Users/45004/AppData/Local/Android/Sdk/platform-tools/adb.exe -s 4d942e4b logcat -v time -d | findstr /i "search error 抓取 聚合"