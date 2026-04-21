@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%restart-main-server.ps1"
for %%I in ("%SCRIPT_DIR%..\..") do set "REPO_PATH=%%~fI"

if not exist "%PS_SCRIPT%" (
  echo [ERROR] Script not found: "%PS_SCRIPT%"
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" ^
  -RepoPath "%REPO_PATH%" ^
  -Mode "Cloud" ^
  -CloudWranglerConfigPath "apps/api/wrangler.toml" ^
  -CloudD1ProdName "dropshiping2bizbize-prod" ^
  -CloudAuthEnvPath "apps/api/.cloudflare.env" ^
  -NgrokLocalScriptPath "scripts/windows/.ngrok.local.ps1" ^
  -NgrokConfigPath "scripts/windows/.ngrok.project.yml" ^
  -NgrokWebPort 4041

set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" exit /b %EXIT_CODE%

echo [OK] Server start command completed.
exit /b 0

