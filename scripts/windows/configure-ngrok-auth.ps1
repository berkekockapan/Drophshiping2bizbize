param(
  [string]$RepoPath = "C:\dropshipingtakip2",
  [string]$NgrokAuthToken = $env:NGROK_AUTHTOKEN,
  [string]$NgrokConfigPath = "scripts\windows\.ngrok.project.yml",
  [int]$NgrokWebPort = 4041
)

$ErrorActionPreference = "Stop"

function Write-ConfigLog {
  param([Parameter(Mandatory = $true)][string]$Message)
  Write-Host ("[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message)
}

if (-not (Test-Path -LiteralPath $RepoPath)) {
  throw "Repo yolu bulunamadi: $RepoPath"
}

if ([string]::IsNullOrWhiteSpace($NgrokAuthToken)) {
  throw "Ngrok token zorunlu. -NgrokAuthToken veya NGROK_AUTHTOKEN verin."
}

$resolvedRepoPath = (Resolve-Path -LiteralPath $RepoPath).Path
$localScriptPath = Join-Path $resolvedRepoPath "scripts\windows\.ngrok.local.ps1"
$resolvedNgrokConfigPath = if ([System.IO.Path]::IsPathRooted($NgrokConfigPath)) { $NgrokConfigPath } else { Join-Path $resolvedRepoPath $NgrokConfigPath }
$excludePath = Join-Path $resolvedRepoPath ".git\info\exclude"

Write-ConfigLog "Ngrok local config yaziliyor: $localScriptPath"
$localScriptContent = @(
  "# Bu dosya secret icerir, commit etmeyin."
  ('$env:NGROK_AUTHTOKEN="{0}"' -f $NgrokAuthToken.Trim())
)
Set-Content -LiteralPath $localScriptPath -Value $localScriptContent -Encoding ASCII

Write-ConfigLog "Projeye ozel ngrok config yaziliyor: $resolvedNgrokConfigPath"
$ngrokConfigDir = Split-Path -Parent $resolvedNgrokConfigPath
if (-not [string]::IsNullOrWhiteSpace($ngrokConfigDir)) {
  New-Item -ItemType Directory -Path $ngrokConfigDir -Force | Out-Null
}

$ngrokConfigContent = @(
  "version: `"2`"",
  ("authtoken: {0}" -f $NgrokAuthToken.Trim()),
  ("web_addr: 127.0.0.1:{0}" -f $NgrokWebPort)
)
Set-Content -LiteralPath $resolvedNgrokConfigPath -Value $ngrokConfigContent -Encoding ASCII

if (-not (Test-Path -LiteralPath $excludePath)) {
  New-Item -ItemType File -Path $excludePath -Force | Out-Null
}

$excludeRule = "scripts/windows/.ngrok.local.ps1"
$existingExclude = Get-Content -LiteralPath $excludePath -ErrorAction SilentlyContinue
if (-not ($existingExclude | Where-Object { $_.Trim() -eq $excludeRule })) {
  Add-Content -LiteralPath $excludePath -Value $excludeRule
  Write-ConfigLog ".git/info/exclude guncellendi: $excludeRule"
}

$ngrokConfigExcludeRule = "scripts/windows/.ngrok.project.yml"
if (-not ($existingExclude | Where-Object { $_.Trim() -eq $ngrokConfigExcludeRule })) {
  Add-Content -LiteralPath $excludePath -Value $ngrokConfigExcludeRule
  Write-ConfigLog ".git/info/exclude guncellendi: $ngrokConfigExcludeRule"
}

if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
  throw "ngrok bulunamadi. PATH veya ngrok kurulumu kontrol edilmeli."
}

Write-ConfigLog "ngrok config dogrulamasi yapiliyor..."
& ngrok config check --config $resolvedNgrokConfigPath
if ($LASTEXITCODE -ne 0) {
  throw "ngrok config dogrulamasi basarisiz oldu (exit code: $LASTEXITCODE)."
}

Write-ConfigLog "ngrok proje config hazir."
