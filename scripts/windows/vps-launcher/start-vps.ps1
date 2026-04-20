param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot "server-config.json")
)

$ErrorActionPreference = "Stop"
$LauncherStartSkipMain = [bool]$LauncherStartSkipMain
$script:DefaultHealthTimeoutSeconds = 180

$sharedScriptPath = Join-Path $PSScriptRoot "shared.ps1"
if (-not (Test-Path -LiteralPath $sharedScriptPath)) {
  throw "shared.ps1 bulunamadi: $sharedScriptPath"
}
. $sharedScriptPath

function Start-LauncherServices {
  param(
    [Parameter(Mandatory = $true)][string]$RepoDir,
    [Parameter(Mandatory = $true)][string]$RuntimeRoot,
    [bool]$AutoOpenBrowser,
    [int]$HealthTimeoutSeconds = $script:DefaultHealthTimeoutSeconds,
    [string]$PidsDir,
    [string]$LogsDir
  )

  if ([string]::IsNullOrWhiteSpace($PidsDir)) {
    $PidsDir = Join-Path $RuntimeRoot "pids"
  }
  if ([string]::IsNullOrWhiteSpace($LogsDir)) {
    $LogsDir = Join-Path $RuntimeRoot "logs"
  }

  Ensure-DirectoryPath -Path $RuntimeRoot
  if (-not [string]::IsNullOrWhiteSpace($PidsDir)) {
    Ensure-DirectoryPath -Path $PidsDir
  }
  if (-not [string]::IsNullOrWhiteSpace($LogsDir)) {
    Ensure-DirectoryPath -Path $LogsDir
  }

  $startedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
  $connectorHealthUrl = "http://127.0.0.1:4317/health"
  $apiHealthUrl = "http://127.0.0.1:8787/health"
  $webLocalUrl = "http://127.0.0.1:5173"

  Start-LoggedServiceWindow -Title "Dropship Launcher Connector" -Command "pnpm --filter @trendyol-etsy/connector dev" -RepoDir $RepoDir -PidFile (Join-Path $PidsDir "connector.pid") -LogFile (Join-Path $LogsDir "connector.log")
  Wait-HttpEndpoint -Url $connectorHealthUrl -Label "Connector" -TimeoutSeconds $HealthTimeoutSeconds

  Start-LoggedServiceWindow -Title "Dropship Launcher API" -Command "pnpm --filter @trendyol-etsy/api dev" -RepoDir $RepoDir -PidFile (Join-Path $PidsDir "api.pid") -LogFile (Join-Path $LogsDir "api.log")
  Wait-HttpEndpoint -Url $apiHealthUrl -Label "API" -TimeoutSeconds $HealthTimeoutSeconds

  Start-LoggedServiceWindow -Title "Dropship Launcher Web" -Command "pnpm --filter @trendyol-etsy/web dev" -RepoDir $RepoDir -PidFile (Join-Path $PidsDir "web.pid") -LogFile (Join-Path $LogsDir "web.log")
  Wait-HttpEndpoint -Url $webLocalUrl -Label "Web" -TimeoutSeconds $HealthTimeoutSeconds

  Start-LoggedServiceWindow -Title "Dropship Launcher ngrok" -Command "ngrok http 5173" -RepoDir $RepoDir -PidFile (Join-Path $PidsDir "ngrok.pid") -LogFile (Join-Path $LogsDir "ngrok.log")
  $publicUrl = Wait-NgrokPublicUrl -TimeoutSeconds $HealthTimeoutSeconds

  Set-Content -LiteralPath (Join-Path $RuntimeRoot "latest-url.txt") -Value $publicUrl
  Set-Content -LiteralPath (Join-Path $RuntimeRoot "status.txt") -Value @(
    "commit=$((Get-HeadCommit -RepoDir $RepoDir))"
    "startedAt=$startedAt"
    "connector=$connectorHealthUrl"
    "api=$apiHealthUrl"
    "web=$webLocalUrl"
    "publicUrl=$publicUrl"
    "connectorHealth=ok"
    "apiHealth=ok"
    "webHealth=ok"
  )

  if ($AutoOpenBrowser) {
    Start-Process -FilePath $publicUrl | Out-Null
  }

  return [pscustomobject]@{
    PublicUrl = $publicUrl
    RuntimeRoot = $RuntimeRoot
    StartedAt = $startedAt
  }
}

function Main {
  param([Parameter(Mandatory = $true)][string]$ConfigPath)

  $config = Read-LauncherConfig -ConfigPath $ConfigPath
  if (-not $config.paths -or [string]::IsNullOrWhiteSpace($config.paths.repoDir)) {
    throw "Config icinde paths.repoDir zorunludur."
  }

  $runtimePaths = Get-LauncherRuntimePaths -InstallRoot $config.paths.installRoot
  Ensure-DirectoryPath -Path $runtimePaths.StateRoot
  Ensure-DirectoryPath -Path $runtimePaths.LogsDir
  Ensure-DirectoryPath -Path $runtimePaths.PidsDir
  Ensure-DirectoryPath -Path $runtimePaths.RuntimeDir

  $startupLog = Join-Path $runtimePaths.LogsDir "startup.log"
  Write-LauncherLog -Message "Launcher baslatma basladi." -LogPath $startupLog

  $autoOpenBrowser = $false
  if ($config.startup -and $null -ne $config.startup.autoOpenBrowser) {
    $autoOpenBrowser = [bool]$config.startup.autoOpenBrowser
  }

  $healthTimeoutSeconds = $script:DefaultHealthTimeoutSeconds
  if ($config.startup -and $null -ne $config.startup.healthTimeoutSeconds) {
    $healthTimeoutSeconds = [int]$config.startup.healthTimeoutSeconds
  }

  $result = Start-LauncherServices `
    -RepoDir ([string]$config.paths.repoDir) `
    -RuntimeRoot $runtimePaths.RuntimeDir `
    -AutoOpenBrowser:$autoOpenBrowser `
    -HealthTimeoutSeconds $healthTimeoutSeconds `
    -PidsDir $runtimePaths.PidsDir `
    -LogsDir $runtimePaths.LogsDir

  Write-LauncherLog -Message "Launcher baslatma tamamlandi. Public URL: $($result.PublicUrl)" -LogPath $startupLog
}

if (-not $LauncherStartSkipMain) {
  Main -ConfigPath $ConfigPath
}
