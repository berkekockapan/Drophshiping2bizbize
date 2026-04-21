param(
  [string]$RepoPath = "C:\dropshipingtakip2"
)

$ErrorActionPreference = "Stop"
$script:RestartAttempted = $false

function Write-DeployLog {
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

function Invoke-CheckedGit {
  param(
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [Parameter(Mandatory = $true)][string]$ErrorMessage
  )

  $output = & git @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  if ($output) {
    $output | ForEach-Object { Write-Host $_ }
  }
  if ($exitCode -ne 0) {
    throw "$ErrorMessage (exit code: $exitCode)"
  }

  return $output
}

function Main {
  Ensure-Command -Name "git" -Message "git bulunamadi."
  Ensure-Command -Name "pnpm.cmd" -Message "pnpm.cmd bulunamadi."
  Ensure-Command -Name "cmd.exe" -Message "cmd.exe bulunamadi."

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
  Invoke-CheckedGit -Arguments @("checkout", "main") -ErrorMessage "main dalina gecis basarisiz oldu"
  Write-DeployLog "Git pull baslatiliyor (origin/main, --ff-only)..."

  $headBefore = (& git rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($headBefore)) {
    throw "Mevcut HEAD okunamadi."
  }

  Invoke-CheckedGit -Arguments @("pull", "--ff-only", "origin", "main") -ErrorMessage "git pull basarisiz oldu"

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

  $changedFiles = @()
  if ($commitChanged) {
    $changedFiles = @(
      (Invoke-CheckedGit -Arguments @("diff", "--name-only", $headBefore, $headAfter) -ErrorMessage "Commit degisiklik listesi alinamadi") |
      ForEach-Object { "$_".Trim() } |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )
  }

  $installReason = $null
  if (-not (Test-Path -LiteralPath (Join-Path $resolvedRepoPath "node_modules"))) {
    $installReason = "node_modules klasoru bulunamadi"
  } elseif ($changedFiles | Where-Object { $_ -eq "pnpm-lock.yaml" -or $_ -eq "pnpm-workspace.yaml" -or $_ -match "(^|/)package\.json$" }) {
    $installReason = "bagimlilik dosyalarinda degisiklik var"
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
