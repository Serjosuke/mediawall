@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop.ps1"
if errorlevel 1 (
    echo MediaWall could not stop. See the error above.
    pause
    exit /b 1
)
