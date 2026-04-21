param(
  [string]$RepoPath = "C:\dropshipingtakip2",
  [switch]$SkipGitSync,
  [switch]$SkipInstall,
  [switch]$SkipCloudDeploy,
  [ValidateSet("Cloud", "Local")][string]$Mode = "Cloud",
  [string]$CloudApiBaseUrl = $env:DROPSHIP_CLOUD_API_BASE_URL,
  [string]$CloudWranglerConfigPath = $env:DROPSHIP_CLOUD_WRANGLER_CONFIG_PATH,
  [string]$CloudD1ProdName = $env:DROPSHIP_CLOUD_D1_PROD_NAME,
  [string]$NgrokAuthToken = $env:NGROK_AUTHTOKEN,
  [string]$NgrokLocalScriptPath = $env:DROPSHIP_NGROK_LOCAL_SCRIPT_PATH,
  [string]$NgrokConfigPath = $env:DROPSHIP_NGROK_CONFIG_PATH,
  [int]$NgrokWebPort = 4041
)

$ErrorActionPreference = "Stop"

$CloudPreviewPort = 4174
$LocalWebPort = 5173
$LocalApiPort = 8787
$CloudWebWindowTitle = "DropshipTakip2 Web (Cloud Preview)"
$LocalWebWindowTitle = "DropshipTakip2 Web"
$LocalApiWindowTitle = "DropshipTakip2 API"
$NgrokWindowTitle = "DropshipTakip2 ngrok"

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

function Resolve-CloudApiBaseUrl {
  param([string]$ProvidedCloudApiBaseUrl)

  if ([string]::IsNullOrWhiteSpace($ProvidedCloudApiBaseUrl)) {
    throw "Cloud API URL zorunlu. -CloudApiBaseUrl veya DROPSHIP_CLOUD_API_BASE_URL verin."
  }

  $resolved = $ProvidedCloudApiBaseUrl.Trim()
  if (-not [System.Uri]::TryCreate($resolved, [System.UriKind]::Absolute, [ref]$null)) {
    throw "Cloud API URL gecersiz: $resolved"
  }

  return $resolved.TrimEnd("/")
}

function Resolve-CloudWranglerConfigPath {
  param(
    [Parameter(Mandatory = $true)][string]$ResolvedRepoPath,
    [string]$ProvidedCloudWranglerConfigPath
  )

  if ([string]::IsNullOrWhiteSpace($ProvidedCloudWranglerConfigPath)) {
    throw "Cloud wrangler config yolu zorunlu. -CloudWranglerConfigPath veya DROPSHIP_CLOUD_WRANGLER_CONFIG_PATH verin."
  }

  $candidate = $ProvidedCloudWranglerConfigPath.Trim()
  $configPath = if ([System.IO.Path]::IsPathRooted($candidate)) {
    $candidate
  } else {
    Join-Path $ResolvedRepoPath $candidate
  }

  if (-not (Test-Path -LiteralPath $configPath)) {
    throw "Cloud wrangler config bulunamadi: $configPath"
  }

  return (Resolve-Path -LiteralPath $configPath).Path
}

function Resolve-NgrokLocalScriptPath {
  param(
    [Parameter(Mandatory = $true)][string]$ResolvedRepoPath,
    [string]$ProvidedNgrokLocalScriptPath
  )

  if ([string]::IsNullOrWhiteSpace($ProvidedNgrokLocalScriptPath)) {
    return Join-Path $ResolvedRepoPath "scripts\windows\.ngrok.local.ps1"
  }

  $candidate = $ProvidedNgrokLocalScriptPath.Trim()
  if ([System.IO.Path]::IsPathRooted($candidate)) {
    return $candidate
  }

  return Join-Path $ResolvedRepoPath $candidate
}

function Resolve-NgrokConfigPath {
  param(
    [Parameter(Mandatory = $true)][string]$ResolvedRepoPath,
    [string]$ProvidedNgrokConfigPath
  )

  if ([string]::IsNullOrWhiteSpace($ProvidedNgrokConfigPath)) {
    return Join-Path $ResolvedRepoPath "scripts\windows\.ngrok.project.yml"
  }

  $candidate = $ProvidedNgrokConfigPath.Trim()
  if ([System.IO.Path]::IsPathRooted($candidate)) {
    return $candidate
  }

  return Join-Path $ResolvedRepoPath $candidate
}

function Resolve-NgrokAuthToken {
  param(
    [Parameter(Mandatory = $true)][string]$ResolvedRepoPath,
    [string]$ProvidedNgrokAuthToken,
    [string]$ProvidedNgrokLocalScriptPath
  )

  if (-not [string]::IsNullOrWhiteSpace($ProvidedNgrokAuthToken)) {
    return $ProvidedNgrokAuthToken.Trim()
  }

  $ngrokLocalScriptPath = Resolve-NgrokLocalScriptPath `
    -ResolvedRepoPath $ResolvedRepoPath `
    -ProvidedNgrokLocalScriptPath $ProvidedNgrokLocalScriptPath

  if (-not (Test-Path -LiteralPath $ngrokLocalScriptPath)) {
    return $null
  }

  Write-Log "Ngrok local config yukleniyor: $ngrokLocalScriptPath"
  . $ngrokLocalScriptPath
  if (-not [string]::IsNullOrWhiteSpace($env:NGROK_AUTHTOKEN)) {
    return $env:NGROK_AUTHTOKEN.Trim()
  }

  Write-Log "Ngrok local config dosyasinda NGROK_AUTHTOKEN bulunamadi: $ngrokLocalScriptPath"
  return $null
}

function Ensure-NgrokConfig {
  param(
    [Parameter(Mandatory = $true)][string]$ResolvedNgrokConfigPath,
    [string]$ResolvedNgrokAuthToken,
    [int]$ResolvedNgrokWebPort
  )

  if ($ResolvedNgrokWebPort -lt 1 -or $ResolvedNgrokWebPort -gt 65535) {
    throw "Ngrok web port gecersiz: $ResolvedNgrokWebPort"
  }

  $webAddr = "127.0.0.1:$ResolvedNgrokWebPort"

  if ([string]::IsNullOrWhiteSpace($ResolvedNgrokAuthToken)) {
    if (-not (Test-Path -LiteralPath $ResolvedNgrokConfigPath)) {
      throw "NGROK_AUTHTOKEN tanimli degil ve ngrok config bulunamadi: $ResolvedNgrokConfigPath"
    }

    Write-Log "Ngrok config korunuyor: $ResolvedNgrokConfigPath"
    return
  }

  $configDir = Split-Path -Parent $ResolvedNgrokConfigPath
  if (-not [string]::IsNullOrWhiteSpace($configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
  }

  Write-Log "Projeye ozel ngrok config yaziliyor: $ResolvedNgrokConfigPath (web_addr=$webAddr)"
  $content = @(
    "version: `"2`"",
    "authtoken: $ResolvedNgrokAuthToken",
    "web_addr: $webAddr"
  )
  Set-Content -LiteralPath $ResolvedNgrokConfigPath -Value $content -Encoding ASCII
}

function Stop-StaleProcesses {
  Write-Log "Bu projeye ait acik pencereler kapatiliyor..."
  $windowTitles = @(
    $CloudWebWindowTitle,
    $LocalWebWindowTitle,
    $LocalApiWindowTitle,
    $NgrokWindowTitle
  )

  foreach ($title in $windowTitles) {
    $matching = Get-Process -ErrorAction SilentlyContinue | Where-Object {
      $_.MainWindowTitle -and $_.MainWindowTitle -eq $title
    }

    if (-not $matching) {
      Write-Log "Acilan pencere bulunamadi (normal): $title"
      continue
    }

    foreach ($process in $matching) {
      try {
        Stop-Process -Id $process.Id -Force -ErrorAction Stop
        Write-Log "Kapatildi: $title (PID $($process.Id))"
      } catch {
        Write-Log "Kapatma denemesi basarisiz oldu: $title (PID $($process.Id))"
      }
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
    [Parameter(Mandatory = $true)][string]$ResolvedRepoPath,
    [string]$ProvidedCloudWranglerConfigPath,
    [string]$ProvidedCloudD1ProdName
  )

  if ($SkipCloudDeploy) {
    Write-Log "SkipCloudDeploy aktif, Cloud API deploy atlandi."
    return
  }

  $resolvedWranglerConfigPath = Resolve-CloudWranglerConfigPath -ResolvedRepoPath $ResolvedRepoPath -ProvidedCloudWranglerConfigPath $ProvidedCloudWranglerConfigPath
  if ([string]::IsNullOrWhiteSpace($ProvidedCloudD1ProdName)) {
    throw "Cloud D1 prod adi zorunlu. -CloudD1ProdName veya DROPSHIP_CLOUD_D1_PROD_NAME verin."
  }
  $resolvedCloudD1ProdName = $ProvidedCloudD1ProdName.Trim()

  $cloudflareToken = $env:CLOUDFLARE_API_TOKEN
  if ([string]::IsNullOrWhiteSpace($cloudflareToken)) {
    $cloudflareToken = $env:CF_API_TOKEN
  }

  if ([string]::IsNullOrWhiteSpace($cloudflareToken)) {
    Write-Log "CLOUDFLARE_API_TOKEN/CF_API_TOKEN tanimli degil; Cloud migration + deploy atlandi. Mevcut Worker surumu kullanilacak."
    return
  }

  Write-Log "Cloud D1 migrationlari uygulaniyor ($resolvedCloudD1ProdName)..."
  Push-Location -LiteralPath $ResolvedRepoPath
  try {
    & pnpm.cmd --filter @trendyol-etsy/api exec wrangler d1 migrations apply $resolvedCloudD1ProdName --remote -c $resolvedWranglerConfigPath
    if ($LASTEXITCODE -ne 0) {
      throw "Cloud D1 migration uygulamasi basarisiz oldu (exit code: $LASTEXITCODE)."
    }

    Write-Log "Cloud API deploy baslatiliyor (wrangler deploy)..."
    & pnpm.cmd --filter @trendyol-etsy/api exec wrangler deploy -c $resolvedWranglerConfigPath
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
    [Parameter(Mandatory = $true)][string]$BashExecutable,
    [Parameter(Mandatory = $true)][string]$ResolvedNgrokConfigPath,
    [int]$ResolvedNgrokWebPort
  )

  $apiHealthUrl = "http://127.0.0.1:$LocalApiPort/health"
  $webLocalUrl = "http://127.0.0.1:$LocalWebPort"
  $apiCmd = "title $LocalApiWindowTitle && cd /d `"$ResolvedRepoPath`" && `"$BashExecutable`" ./apps/api/scripts/ensure-local-d1.sh && pnpm.cmd --filter @trendyol-etsy/api exec wrangler dev --port $LocalApiPort"
  $webCmd = "title $LocalWebWindowTitle && cd /d `"$ResolvedRepoPath`" && pnpm.cmd dev:web"
  $ngrokCmd = "title $NgrokWindowTitle && cd /d `"$ResolvedRepoPath`" && ngrok http $LocalWebPort --config `"$ResolvedNgrokConfigPath`""

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

  $publicUrl = Wait-NgrokPublicUrl -NgrokWebPort $ResolvedNgrokWebPort
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
    [Parameter(Mandatory = $true)][string]$ResolvedCloudApiBaseUrl,
    [Parameter(Mandatory = $true)][string]$ResolvedNgrokConfigPath,
    [int]$ResolvedNgrokWebPort
  )

  $apiHealthUrl = "$ResolvedCloudApiBaseUrl/health"
  $webLocalUrl = "http://127.0.0.1:$CloudPreviewPort"
  $webCmd = "title $CloudWebWindowTitle && cd /d `"$ResolvedRepoPath`" && set `"VITE_API_BASE_URL=$ResolvedCloudApiBaseUrl`" && pnpm.cmd --filter @trendyol-etsy/web build && pnpm.cmd --filter @trendyol-etsy/web exec vite preview --host 0.0.0.0 --port $CloudPreviewPort --strictPort"
  $ngrokCmd = "title $NgrokWindowTitle && cd /d `"$ResolvedRepoPath`" && ngrok http $CloudPreviewPort --config `"$ResolvedNgrokConfigPath`""

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

  $publicUrl = Wait-NgrokPublicUrl -NgrokWebPort $ResolvedNgrokWebPort
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
  param(
    [int]$TimeoutSeconds = 120,
    [int]$NgrokWebPort = 4041
  )

  $statusUrl = "http://127.0.0.1:$NgrokWebPort/api/tunnels"
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
  $resolvedNgrokAuthToken = Resolve-NgrokAuthToken `
    -ResolvedRepoPath $resolvedRepoPath `
    -ProvidedNgrokAuthToken $NgrokAuthToken `
    -ProvidedNgrokLocalScriptPath $NgrokLocalScriptPath
  $resolvedNgrokConfigPath = Resolve-NgrokConfigPath `
    -ResolvedRepoPath $resolvedRepoPath `
    -ProvidedNgrokConfigPath $NgrokConfigPath

  Write-Log "Repo: $resolvedRepoPath"
  Write-Log "Calisma modu: $Mode"
  Stop-StaleProcesses
  if ($SkipGitSync) {
    Write-Log "SkipGitSync aktif, git senkronizasyonu atlandi."
  } else {
    Sync-MainBranch
  }
  Install-Dependencies
  Ensure-NgrokConfig `
    -ResolvedNgrokConfigPath $resolvedNgrokConfigPath `
    -ResolvedNgrokAuthToken $resolvedNgrokAuthToken `
    -ResolvedNgrokWebPort $NgrokWebPort

  $runtime = if ($Mode -eq "Local") {
    $bashExecutable = Resolve-BashExecutable
    Write-Log "bash: $bashExecutable"
    Start-ServiceWindows `
      -ResolvedRepoPath $resolvedRepoPath `
      -BashExecutable $bashExecutable `
      -ResolvedNgrokConfigPath $resolvedNgrokConfigPath `
      -ResolvedNgrokWebPort $NgrokWebPort
  } else {
    Deploy-CloudApi `
      -ResolvedRepoPath $resolvedRepoPath `
      -ProvidedCloudWranglerConfigPath $CloudWranglerConfigPath `
      -ProvidedCloudD1ProdName $CloudD1ProdName
    $resolvedCloudApiBaseUrl = Resolve-CloudApiBaseUrl -ProvidedCloudApiBaseUrl $CloudApiBaseUrl
    Write-Log "Cloud API: $resolvedCloudApiBaseUrl"
    Start-ServiceWindowsCloud `
      -ResolvedRepoPath $resolvedRepoPath `
      -ResolvedCloudApiBaseUrl $resolvedCloudApiBaseUrl `
      -ResolvedNgrokConfigPath $resolvedNgrokConfigPath `
      -ResolvedNgrokWebPort $NgrokWebPort
  }

  $head = (& git rev-parse --short HEAD).Trim()
  Write-RestartSummary -HeadCommit $head -Runtime $runtime
}

if (-not $RestartMainServerSkipMain) {
  Main
}
