param(
  [string]$RepoPath = "C:\dropshipingtakip2"
)

$ErrorActionPreference = "Stop"
$script:RestartAttempted = $false

function Write-DeployLog {
  param([Parameter(Mandatory = $true)][string]$Message)
  Write-Host ("[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message)
}

function Ensure-Tool {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$ErrorMessage
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw $ErrorMessage
  }
}

function Invoke-Git {
  param(
    [Parameter(Mandatory = $true)][string]$CommandLine,
    [Parameter(Mandatory = $true)][string]$ErrorMessage
  )

  $output = & cmd.exe /d /s /c "git $CommandLine 2>&1"
  $exitCode = $LASTEXITCODE

  if ($output) {
    $output | ForEach-Object { Write-Host $_ }
  }

  if ($exitCode -ne 0) {
    throw "$ErrorMessage (exit code: $exitCode)"
  }

  return @($output)
}

function Has-DependencyChange {
  param([Parameter(Mandatory = $true)][string[]]$Files)

  foreach ($file in $Files) {
    $trimmed = "$file".Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed)) { continue }

    if (
      $trimmed -eq "pnpm-lock.yaml" -or
      $trimmed -eq "pnpm-workspace.yaml" -or
      $trimmed -match "(^|/)package\.json$"
    ) {
      return $true
    }
  }

  return $false
}

function Main {
  Ensure-Tool -Name "git" -ErrorMessage "git bulunamadi."
  Ensure-Tool -Name "pnpm.cmd" -ErrorMessage "pnpm.cmd bulunamadi."
  Ensure-Tool -Name "cmd.exe" -ErrorMessage "cmd.exe bulunamadi."

  if (-not (Test-Path -LiteralPath $RepoPath)) {
    throw "Repo yolu bulunamadi: $RepoPath"
  }

  $resolvedRepoPath = (Resolve-Path -LiteralPath $RepoPath).Path
  $startScriptPath = Join-Path $resolvedRepoPath "scripts\windows\start-server.bat"
  if (-not (Test-Path -LiteralPath $startScriptPath)) {
    throw "Start script bulunamadi: $startScriptPath"
  }

  Set-Location -LiteralPath $resolvedRepoPath
  Write-DeployLog "Repo: $resolvedRepoPath"

  Write-DeployLog "main dalina geciliyor..."
  Invoke-Git -CommandLine "checkout main" -ErrorMessage "main dalina gecis basarisiz oldu" | Out-Null

  $headBefore = (& git rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($headBefore)) {
    throw "Mevcut HEAD okunamadi."
  }

  Write-DeployLog "Git pull baslatiliyor (origin/main, --ff-only)..."
  Invoke-Git -CommandLine "pull --ff-only origin main" -ErrorMessage "git pull basarisiz oldu" | Out-Null

  $headAfter = (& git rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($headAfter)) {
    throw "Guncel HEAD okunamadi."
  }

  $commitChanged = $headBefore -ne $headAfter
  if ($commitChanged) {
    Write-DeployLog "Yeni commit alindi: $headBefore -> $headAfter"
  } else {
    Write-DeployLog "Repo zaten gunceldi (HEAD degismedi)."
  }

  $installReason = $null
  if (-not (Test-Path -LiteralPath (Join-Path $resolvedRepoPath "node_modules"))) {
    $installReason = "node_modules klasoru bulunamadi"
  } elseif ($commitChanged) {
    $changedFiles = Invoke-Git -CommandLine "diff --name-only $headBefore $headAfter" -ErrorMessage "Commit degisiklik listesi alinamadi"
    if (Has-DependencyChange -Files $changedFiles) {
      $installReason = "bagimlilik dosyalarinda degisiklik var"
    }
  }

  if ($installReason) {
    Write-DeployLog "pnpm install calisacak: $installReason"
    & pnpm.cmd install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) {
      throw "pnpm install basarisiz oldu (exit code: $LASTEXITCODE). Servis yeniden baslatilmadi."
    }
  } else {
    Write-DeployLog "pnpm install atlandi: bagimlilik degisikligi yok."
  }

  Write-DeployLog "Servis yeniden baslatiliyor..."
  $script:RestartAttempted = $true
  & cmd.exe /c """$startScriptPath"""
  if ($LASTEXITCODE -ne 0) {
    throw "start-server.bat basarisiz oldu (exit code: $LASTEXITCODE)."
  }

  $shortHead = (& git rev-parse --short HEAD).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($shortHead)) {
    $shortHead = $headAfter.Substring(0, [Math]::Min(7, $headAfter.Length))
  }

  Write-DeployLog "Deploy tamamlandi. Aktif commit: $shortHead"
}

try {
  Main
  exit 0
} catch {
  Write-Host ("[{0}] [ERROR] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $_.Exception.Message)
  if (-not $script:RestartAttempted) {
    Write-Host ("[{0}] [INFO] Calisan servis korunmustur; restart adimi baslatilmadi." -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
  } else {
    Write-Host ("[{0}] [INFO] Restart adiminda hata olustu; servis durumunu start-server loglarindan kontrol edin." -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
  }
  exit 1
}
