@echo off
echo ========================================
echo    SafeHer - APK Build Script
echo ========================================
echo.

cd android

echo Cleaning previous builds...
call gradlew clean

echo.
echo Building Release APK...
echo This may take 5-15 minutes...
echo.

call gradlew assembleRelease

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo    BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo Your APK is located at:
    echo app\build\outputs\apk\release\app-release.apk
    echo.
    echo You can now share this APK file with others!
    echo.
) else (
    echo.
    echo ========================================
    echo    BUILD FAILED!
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo.
)

pause




