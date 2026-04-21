@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%deploy-server.ps1"

if not exist "%PS_SCRIPT%" (
  echo [ERROR] Script not found: "%PS_SCRIPT%"
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" %*
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" exit /b %EXIT_CODE%

echo [OK] One-click deploy command completed.
exit /b 0
