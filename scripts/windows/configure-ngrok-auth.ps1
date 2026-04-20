param(
  [string]$RepoPath = "C:\dropshipingtakip2",
  [string]$NgrokAuthToken = $env:NGROK_AUTHTOKEN
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
$excludePath = Join-Path $resolvedRepoPath ".git\info\exclude"

Write-ConfigLog "Ngrok local config yaziliyor: $localScriptPath"
$localScriptContent = @(
  "# Bu dosya secret icerir, commit etmeyin."
  ('$env:NGROK_AUTHTOKEN="{0}"' -f $NgrokAuthToken.Trim())
)
Set-Content -LiteralPath $localScriptPath -Value $localScriptContent -Encoding ASCII

if (-not (Test-Path -LiteralPath $excludePath)) {
  New-Item -ItemType File -Path $excludePath -Force | Out-Null
}

$excludeRule = "scripts/windows/.ngrok.local.ps1"
$existingExclude = Get-Content -LiteralPath $excludePath -ErrorAction SilentlyContinue
if (-not ($existingExclude | Where-Object { $_.Trim() -eq $excludeRule })) {
  Add-Content -LiteralPath $excludePath -Value $excludeRule
  Write-ConfigLog ".git/info/exclude guncellendi: $excludeRule"
}

if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
  throw "ngrok bulunamadi. PATH veya ngrok kurulumu kontrol edilmeli."
}

Write-ConfigLog "ngrok auth token uygulaniyor..."
& ngrok config add-authtoken $NgrokAuthToken.Trim()
if ($LASTEXITCODE -ne 0) {
  throw "ngrok auth token uygulanamadi (exit code: $LASTEXITCODE)."
}

Write-ConfigLog "ngrok auth token guncellendi."
& ngrok config check
