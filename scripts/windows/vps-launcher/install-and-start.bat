@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "BOOTSTRAP_SCRIPT=%SCRIPT_DIR%bootstrap-vps.ps1"
set "START_SCRIPT=%SCRIPT_DIR%start-vps.ps1"

if not exist "%BOOTSTRAP_SCRIPT%" (
  echo [ERROR] Script not found: "%BOOTSTRAP_SCRIPT%"
  exit /b 1
)

if not exist "%START_SCRIPT%" (
  echo [ERROR] Script not found: "%START_SCRIPT%"
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%BOOTSTRAP_SCRIPT%"
if errorlevel 1 exit /b %errorlevel%

powershell -NoProfile -ExecutionPolicy Bypass -File "%START_SCRIPT%"
exit /b %errorlevel%
