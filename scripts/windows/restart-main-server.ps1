param(
  [string]$RepoPath = "C:\dropshiping-win",
  [switch]$SkipInstall,
  [switch]$SkipCloudDeploy,
  [ValidateSet("Cloud", "Local")][string]$Mode = "Cloud",
  [string]$CloudApiBaseUrl = $env:DROPSHIP_CLOUD_API_BASE_URL
)

$ErrorActionPreference = "Stop"

$CloudPreviewPort = 4174
$LocalWebPort = 5173
$LocalApiPort = 8787

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

function Resolve-BashExecutable {
  $bashCommand = Get-Command bash -ErrorAction SilentlyContinue
  if ($bashCommand -and (Test-Path -LiteralPath $bashCommand.Source)) {
    return $bashCommand.Source
  }

  $candidateDirs = @(
    "C:\Program Files\Git\bin",
    "C:\Program Files\Git\usr\bin",
    "$env:ProgramFiles\Git\bin",
    "$env:ProgramFiles\Git\usr\bin",
    "$env:ProgramW6432\Git\bin",
    "$env:ProgramW6432\Git\usr\bin",
    "$env:LOCALAPPDATA\Programs\Git\bin",
    "$env:LOCALAPPDATA\Programs\Git\usr\bin"
  ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique

  foreach ($dir in $candidateDirs) {
    $candidate = Join-Path $dir "bash.exe"
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  throw "bash.exe bulunamadi. Git for Windows kurulu olmali."
}

function Get-DefaultCloudApiBaseUrl {
  param([Parameter(Mandatory = $true)][string]$ResolvedRepoPath)

  $wranglerToml = Join-Path $ResolvedRepoPath "apps\api\wrangler.toml"
  if (-not (Test-Path -LiteralPath $wranglerToml)) {
    return $null
  }

  $nameLine = Select-String -Path $wranglerToml -Pattern '^\s*name\s*=\s*"([^"]+)"\s*$' | Select-Object -First 1
  if (-not $nameLine) {
    return $null
  }

  $serviceName = $nameLine.Matches[0].Groups[1].Value.Trim()
  if ([string]::IsNullOrWhiteSpace($serviceName)) {
    return $null
  }

  return "https://$serviceName.workers.dev"
}

function Resolve-CloudApiBaseUrl {
  param(
    [string]$ProvidedCloudApiBaseUrl,
    [Parameter(Mandatory = $true)][string]$ResolvedRepoPath
  )

  $resolved = $ProvidedCloudApiBaseUrl
  if ([string]::IsNullOrWhiteSpace($resolved)) {
    $resolved = Get-DefaultCloudApiBaseUrl -ResolvedRepoPath $ResolvedRepoPath
  }

  if ([string]::IsNullOrWhiteSpace($resolved)) {
    throw "Cloud API URL bulunamadi. DROPSHIP_CLOUD_API_BASE_URL tanimlayin veya -CloudApiBaseUrl parametresi verin."
  }

  if (-not [System.Uri]::TryCreate($resolved, [System.UriKind]::Absolute, [ref]$null)) {
    throw "Cloud API URL gecersiz: $resolved"
  }

  return $resolved.TrimEnd("/")
}

function Stop-StaleProcesses {
  Write-Log "Eski surecler kapatiliyor (node/ngrok/caddy)..."
  foreach ($processName in @("node", "ngrok", "caddy")) {
    $running = Get-Process -Name $processName -ErrorAction SilentlyContinue
    if (-not $running) {
      Write-Log "Acilan kayit bulunamadi (normal): $processName.exe"
      continue
    }

    & taskkill /IM "$processName.exe" /F /T *> $null
    if ($LASTEXITCODE -eq 0) {
      Write-Log "Kapatildi: $processName.exe"
    } else {
      Write-Log "Kapatma denemesi basarisiz oldu (exit=$LASTEXITCODE): $processName.exe"
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

function Deploy-CloudApi {
  param(
    [Parameter(Mandatory = $true)][string]$ResolvedRepoPath
  )

  if ($SkipCloudDeploy) {
    Write-Log "SkipCloudDeploy aktif, Cloud API deploy atlandi."
    return
  }

  $cloudflareToken = $env:CLOUDFLARE_API_TOKEN
  if ([string]::IsNullOrWhiteSpace($cloudflareToken)) {
    $cloudflareToken = $env:CF_API_TOKEN
  }

  if ([string]::IsNullOrWhiteSpace($cloudflareToken)) {
    Write-Log "CLOUDFLARE_API_TOKEN/CF_API_TOKEN tanimli degil; Cloud migration + deploy atlandi. Mevcut Worker surumu kullanilacak."
    return
  }

  Write-Log "Cloud D1 migrationlari uygulaniyor (trendyol-etsy-prod)..."
  Push-Location -LiteralPath $ResolvedRepoPath
  try {
    & pnpm.cmd --filter @trendyol-etsy/api exec wrangler d1 migrations apply trendyol-etsy-prod --remote
    if ($LASTEXITCODE -ne 0) {
      throw "Cloud D1 migration uygulamasi basarisiz oldu (exit code: $LASTEXITCODE)."
    }

    Write-Log "Cloud API deploy baslatiliyor (wrangler deploy)..."
    & pnpm.cmd --filter @trendyol-etsy/api deploy
    if ($LASTEXITCODE -ne 0) {
      throw "Cloud API deploy basarisiz oldu (exit code: $LASTEXITCODE)."
    }
  } finally {
    Pop-Location
  }
}
function Start-ServiceWindows {
  param(
    [Parameter(Mandatory = $true)][string]$ResolvedRepoPath,
    [Parameter(Mandatory = $true)][string]$BashExecutable
  )

  $apiHealthUrl = "http://127.0.0.1:$LocalApiPort/health"
  $webLocalUrl = "http://127.0.0.1:$LocalWebPort"
  $apiCmd = "title Dropship API && cd /d `"$ResolvedRepoPath`" && `"$BashExecutable`" ./apps/api/scripts/ensure-local-d1.sh && pnpm.cmd --filter @trendyol-etsy/api exec wrangler dev --port $LocalApiPort"
  $webCmd = "title Dropship Web && cd /d `"$ResolvedRepoPath`" && pnpm.cmd dev:web"
  $ngrokCmd = "title Dropship ngrok && cd /d `"$ResolvedRepoPath`" && ngrok http $LocalWebPort"

  Write-Log "API penceresi aciliyor..."
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $apiCmd | Out-Null
  if ((Wait-HttpEndpoint -Label "API" -Url $apiHealthUrl) -eq $false) {
    throw "API hazir olmadi: $apiHealthUrl"
  }

  Write-Log "WEB penceresi aciliyor..."
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $webCmd | Out-Null
  if ((Wait-HttpEndpoint -Label "WEB" -Url $webLocalUrl) -eq $false) {
    throw "WEB hazir olmadi: $webLocalUrl"
  }

  Write-Log "ngrok penceresi aciliyor..."
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $ngrokCmd | Out-Null

  $publicUrl = Wait-NgrokPublicUrl
  Write-Log "ngrok public URL: $publicUrl"

  return [pscustomobject]@{
    Mode = "Local"
    WebLocalUrl = $webLocalUrl
    ApiHealthUrl = $apiHealthUrl
    PublicUrl = $publicUrl
  }
}

function Start-ServiceWindowsCloud {
  param(
    [Parameter(Mandatory = $true)][string]$ResolvedRepoPath,
    [Parameter(Mandatory = $true)][string]$ResolvedCloudApiBaseUrl
  )

  $apiHealthUrl = "$ResolvedCloudApiBaseUrl/health"
  $webLocalUrl = "http://127.0.0.1:$CloudPreviewPort"
  $webCmd = "title Dropship Web (Cloud Preview) && cd /d `"$ResolvedRepoPath`" && set `"VITE_API_BASE_URL=$ResolvedCloudApiBaseUrl`" && pnpm.cmd --filter @trendyol-etsy/web build && pnpm.cmd --filter @trendyol-etsy/web exec vite preview --host 0.0.0.0 --port $CloudPreviewPort --strictPort"
  $ngrokCmd = "title Dropship ngrok && cd /d `"$ResolvedRepoPath`" && ngrok http $CloudPreviewPort"

  Write-Log "Cloud API saglik kontrolu yapiliyor..."
  if ((Wait-HttpEndpoint -Label "Cloud API" -Url $apiHealthUrl) -eq $false) {
    throw "Cloud API hazir olmadi: $apiHealthUrl"
  }

  Write-Log "WEB preview penceresi aciliyor (VITE_API_BASE_URL=$ResolvedCloudApiBaseUrl)..."
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $webCmd | Out-Null
  if ((Wait-HttpEndpoint -Label "WEB Preview" -Url $webLocalUrl) -eq $false) {
    throw "WEB Preview hazir olmadi: $webLocalUrl"
  }

  Write-Log "ngrok penceresi aciliyor..."
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $ngrokCmd | Out-Null

  $publicUrl = Wait-NgrokPublicUrl
  Write-Log "ngrok public URL: $publicUrl"

  return [pscustomobject]@{
    Mode = "Cloud"
    WebLocalUrl = $webLocalUrl
    ApiHealthUrl = $apiHealthUrl
    PublicUrl = $publicUrl
  }
}

function Write-RestartSummary {
  param(
    [Parameter(Mandatory = $true)][string]$HeadCommit,
    [Parameter(Mandatory = $true)][psobject]$Runtime
  )

  Write-Log "Tamamlandi. Aktif commit: $HeadCommit"
  Write-Log "Calisma modu: $($Runtime.Mode)"
  Write-Log "Web local: $($Runtime.WebLocalUrl)"
  Write-Log "API health: $($Runtime.ApiHealthUrl)"
  Write-Log "ngrok public URL: $($Runtime.PublicUrl)"
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
  Write-Log "Calisma modu: $Mode"
  Stop-StaleProcesses
  Sync-MainBranch
  Install-Dependencies

  $runtime = if ($Mode -eq "Local") {
    $bashExecutable = Resolve-BashExecutable
    Write-Log "bash: $bashExecutable"
    Start-ServiceWindows -ResolvedRepoPath $resolvedRepoPath -BashExecutable $bashExecutable
  } else {
    Deploy-CloudApi -ResolvedRepoPath $resolvedRepoPath
    $resolvedCloudApiBaseUrl = Resolve-CloudApiBaseUrl -ProvidedCloudApiBaseUrl $CloudApiBaseUrl -ResolvedRepoPath $resolvedRepoPath
    Write-Log "Cloud API: $resolvedCloudApiBaseUrl"
    Start-ServiceWindowsCloud -ResolvedRepoPath $resolvedRepoPath -ResolvedCloudApiBaseUrl $resolvedCloudApiBaseUrl
  }

  $head = (& git rev-parse --short HEAD).Trim()
  Write-RestartSummary -HeadCommit $head -Runtime $runtime
}

if (-not $RestartMainServerSkipMain) {
  Main
}
