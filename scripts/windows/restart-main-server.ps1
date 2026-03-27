param(
  [string]$RepoPath = "C:\dropshiping-win",
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

function Write-Log {
  param([Parameter(Mandatory = $true)][string]$Message)
  Write-Host ("[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message)
}

function Ensure-Command {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Message
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw $Message
  }
}

function Stop-StaleProcesses {
  Write-Log "Eski surecler kapatiliyor (node/ngrok/caddy)..."
  foreach ($processName in @("node", "ngrok", "caddy")) {
    try {
      & taskkill /IM "$processName.exe" /F /T | Out-Null
      Write-Log "Kapatildi: $processName.exe"
    } catch {
      Write-Log "Acilan kayit bulunamadi (normal): $processName.exe"
    }
  }
}

function Sync-MainBranch {
  Write-Log "main dali origin/main ile senkronlaniyor..."
  & git fetch origin
  & git checkout main
  & git reset --hard origin/main
  & git clean -fd
}

function Install-Dependencies {
  if ($SkipInstall) {
    Write-Log "SkipInstall aktif, pnpm install atlandi."
    return
  }

  Write-Log "Bagimliliklar yukleniyor (pnpm install)..."
  & pnpm.cmd install
}

function Start-ServiceWindows {
  param([Parameter(Mandatory = $true)][string]$ResolvedRepoPath)

  $apiCmd = "title Dropship API && cd /d `"$ResolvedRepoPath`" && set PATH=%PATH%;C:\Program Files\Git\bin && pnpm.cmd dev:api"
  $webCmd = "title Dropship Web && cd /d `"$ResolvedRepoPath`" && pnpm.cmd dev:web"
  $ngrokCmd = "title Dropship ngrok && cd /d `"$ResolvedRepoPath`" && ngrok http 5173"

  Write-Log "API penceresi aciliyor..."
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $apiCmd | Out-Null
  Wait-HttpEndpoint -Label "API" -Url "http://127.0.0.1:8787/health"

  Write-Log "WEB penceresi aciliyor..."
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $webCmd | Out-Null
  Wait-HttpEndpoint -Label "WEB" -Url "http://127.0.0.1:5173"

  Write-Log "ngrok penceresi aciliyor..."
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $ngrokCmd | Out-Null

  $publicUrl = Wait-NgrokPublicUrl
  Write-Log "ngrok public URL: $publicUrl"
}

function Wait-HttpEndpoint {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][string]$Url,
    [int]$TimeoutSeconds = 120
  )

  Write-Log "$Label hazirligi bekleniyor: $Url"
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $lastError = $null

  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 4 -ErrorAction Stop
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
        Write-Log "$Label hazir."
        return
      }
    } catch {
      $lastError = $_.Exception.Message
    }

    Start-Sleep -Seconds 1
  }

  throw "$Label hazir olmadi: $Url. Son hata: $lastError"
}

function Wait-NgrokPublicUrl {
  param([int]$TimeoutSeconds = 120)

  $statusUrl = "http://127.0.0.1:4040/api/tunnels"
  Write-Log "ngrok public URL bekleniyor: $statusUrl"
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $lastError = $null

  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-RestMethod -Uri $statusUrl -TimeoutSec 4 -ErrorAction Stop
      if ($response -and $response.tunnels) {
        $match = $response.tunnels | Where-Object { $_.public_url -like "https://*" } | Select-Object -First 1
        if ($match -and $match.public_url) {
          return $match.public_url
        }
      }
    } catch {
      $lastError = $_.Exception.Message
    }

    Start-Sleep -Seconds 1
  }

  throw "ngrok public URL alinamadi. Son hata: $lastError"
}

function Main {
  Ensure-Command -Name "git" -Message "git bulunamadi."
  Ensure-Command -Name "pnpm.cmd" -Message "pnpm.cmd bulunamadi."
  Ensure-Command -Name "powershell" -Message "powershell bulunamadi."

  if (-not (Test-Path -LiteralPath $RepoPath)) {
    throw "Repo yolu bulunamadi: $RepoPath"
  }

  $resolvedRepoPath = (Resolve-Path -LiteralPath $RepoPath).Path
  Set-Location -LiteralPath $resolvedRepoPath

  Write-Log "Repo: $resolvedRepoPath"
  Stop-StaleProcesses
  Sync-MainBranch
  Install-Dependencies
  Start-ServiceWindows -ResolvedRepoPath $resolvedRepoPath

  $head = (& git rev-parse --short HEAD).Trim()
  Write-Log "Tamamlandi. Aktif commit: $head"
  Write-Log "Web local: http://127.0.0.1:5173"
  Write-Log "API health: http://127.0.0.1:8787/health"
  Write-Log "ngrok penceresindeki Forwarding https://... linkini kullan."
}

Main
