function Convert-ToSingleQuotedLiteral {
  param([Parameter(Mandatory = $true)][string]$Value)
  return $Value.Replace("'", "''")
}

function Test-ConfigPathValue {
  param(
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Config,
    [Parameter(Mandatory = $true)][string]$Path
  )

  $current = $Config
  foreach ($segment in $Path.Split(".")) {
    if ($current -isnot [System.Collections.IDictionary] -or -not $current.Contains($segment)) {
      return $false
    }
    $current = $current[$segment]
  }

  return -not [string]::IsNullOrWhiteSpace([string]$current)
}

function Read-LauncherConfig {
  param([Parameter(Mandatory = $true)][string]$ConfigPath)

  if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "Launcher config bulunamadi: $ConfigPath"
  }

  try {
    $config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json -AsHashtable
  } catch {
    throw "Launcher config parse edilemedi: $ConfigPath. Hata: $($_.Exception.Message)"
  }

  foreach ($requiredPath in @("repo.url", "repo.branch", "paths.installRoot", "paths.repoDir", "ngrok.authToken")) {
    if (-not (Test-ConfigPathValue -Config $config -Path $requiredPath)) {
      throw "Launcher config zorunlu alan eksik: $requiredPath"
    }
  }

  return $config
}

function Get-LauncherRuntimePaths {
  param([Parameter(Mandatory = $true)][string]$InstallRoot)

  $normalizedRoot = $InstallRoot.TrimEnd("\", "/")
  $stateRoot = "{0}\.state" -f $normalizedRoot

  return [ordered]@{
    StateRoot = $stateRoot
    LogsDir = "{0}\logs" -f $stateRoot
    PidsDir = "{0}\pids" -f $stateRoot
    RuntimeDir = "{0}\runtime" -f $stateRoot
  }
}

function Ensure-DirectoryPath {
  param([Parameter(Mandatory = $true)][string]$Path)
  New-Item -ItemType Directory -Path $Path -Force | Out-Null
}

function Write-LauncherLog {
  param(
    [Parameter(Mandatory = $true)][string]$Message,
    [string]$LogPath
  )

  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Write-Host $line

  if (-not [string]::IsNullOrWhiteSpace($LogPath)) {
    $logDir = Split-Path -Parent $LogPath
    if (-not [string]::IsNullOrWhiteSpace($logDir)) {
      Ensure-DirectoryPath -Path $logDir
    }
    Add-Content -LiteralPath $LogPath -Value $line
  }
}

function Invoke-LoggedCommand {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [string]$WorkingDirectory,
    [string]$LogPath
  )

  Write-LauncherLog -Message ("Komut: {0}" -f $Command) -LogPath $LogPath

  if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
    Push-Location -LiteralPath $WorkingDirectory
  }

  try {
    Invoke-Expression $Command
    if ($LASTEXITCODE -ne 0) {
      throw "Komut basarisiz oldu (exit=$LASTEXITCODE): $Command"
    }
  } finally {
    if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
      Pop-Location
    }
  }
}

function Convert-ToAuthenticatedGitUrl {
  param(
    [Parameter(Mandatory = $true)][string]$RepoUrl,
    [string]$Username,
    [string]$Token
  )

  if ([string]::IsNullOrWhiteSpace($Username) -or [string]::IsNullOrWhiteSpace($Token)) {
    return $RepoUrl
  }

  if ($RepoUrl -notmatch '^https://') {
    throw "Desteklenmeyen repo URL formati: $RepoUrl"
  }

  return ($RepoUrl -replace '^https://', "https://$Username`:$Token@")
}

function Write-EnvFileFromMap {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Map
  )

  $parentDir = Split-Path -Parent $Path
  if (-not [string]::IsNullOrWhiteSpace($parentDir)) {
    Ensure-DirectoryPath -Path $parentDir
  }

  $entries =
    if ($Map -is [System.Collections.Specialized.OrderedDictionary]) {
      $Map.GetEnumerator()
    }
    else {
      $Map.Keys | Sort-Object | ForEach-Object {
        [pscustomobject]@{
          Key = $_
          Value = $Map[$_]
        }
      }
    }

  $lines = foreach ($entry in $entries) {
    "{0}={1}" -f $entry.Key, $entry.Value
  }

  Set-Content -LiteralPath $Path -Value $lines
}

function Start-LoggedServiceWindow {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(Mandatory = $true)][string]$RepoDir,
    [string]$PidFile,
    [string]$LogFile
  )

  $escapedRepoDir = Convert-ToSingleQuotedLiteral -Value $RepoDir
  $escapedTitle = Convert-ToSingleQuotedLiteral -Value $Title
  $escapedCommand = Convert-ToSingleQuotedLiteral -Value $Command
  $escapedLogFile = if ([string]::IsNullOrWhiteSpace($LogFile)) { "" } else { Convert-ToSingleQuotedLiteral -Value $LogFile }
  $hasLogFile = -not [string]::IsNullOrWhiteSpace($LogFile)
  $hasLogFileLiteral = if ($hasLogFile) { '$true' } else { '$false' }

  $serviceScript = @"
`$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath '$escapedRepoDir'
`$Host.UI.RawUI.WindowTitle = '$escapedTitle'
`$serviceCommand = '$escapedCommand'

function Write-ServiceLog {
  param([string]`$Message)
  if ([string]::IsNullOrWhiteSpace('$escapedLogFile')) { return }
  Add-Content -LiteralPath '$escapedLogFile' -Value ("[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), `$Message)
}

Write-ServiceLog 'Servis komutu baslatiliyor.'
if ($hasLogFileLiteral) {
  & cmd.exe /c `$serviceCommand 2>&1 | Tee-Object -FilePath '$escapedLogFile' -Append
  `$exitCode = `$LASTEXITCODE
} else {
  & cmd.exe /c `$serviceCommand
  `$exitCode = `$LASTEXITCODE
}
Write-ServiceLog ("Servis komutu sonlandi. ExitCode={0}" -f `$exitCode)
exit `$exitCode
"@

  if (-not [string]::IsNullOrWhiteSpace($LogFile)) {
    $logDir = Split-Path -Parent $LogFile
    if (-not [string]::IsNullOrWhiteSpace($logDir)) {
      Ensure-DirectoryPath -Path $logDir
    }
  }

  $encodedScript = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($serviceScript))
  $process = Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-NoExit",
    "-EncodedCommand",
    $encodedScript
  ) -PassThru

  if (-not [string]::IsNullOrWhiteSpace($PidFile)) {
    $pidDir = Split-Path -Parent $PidFile
    if (-not [string]::IsNullOrWhiteSpace($pidDir)) {
      Ensure-DirectoryPath -Path $pidDir
    }
    Set-Content -LiteralPath $PidFile -Value $process.Id
  }

  return $process
}

function Wait-HttpEndpoint {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$Label,
    [int]$TimeoutSeconds = 180
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $lastError = $null

  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
        return
      }
    } catch {
      $lastError = $_.Exception.Message
    }

    Start-Sleep -Seconds 1
  }

  throw "$Label saglik kontrolu zaman asimina ugradi: $Url. Son hata: $lastError"
}

function Wait-NgrokPublicUrl {
  param([int]$TimeoutSeconds = 180)

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $statusUrl = "http://127.0.0.1:4040/api/tunnels"
  $lastError = $null

  while ((Get-Date) -lt $deadline) {
    try {
      $payload = Invoke-RestMethod -Uri $statusUrl -TimeoutSec 5 -ErrorAction Stop
      if ($payload -and $payload.tunnels) {
        $tunnel = $payload.tunnels | Where-Object { $_.public_url -like "https://*" } | Select-Object -First 1
        if ($tunnel -and $tunnel.public_url) {
          return [string]$tunnel.public_url
        }
      }
    } catch {
      $lastError = $_.Exception.Message
    }

    Start-Sleep -Seconds 1
  }

  throw "ngrok public URL zaman asimina ugradi. Son hata: $lastError"
}

function Get-HeadCommit {
  param([Parameter(Mandatory = $true)][string]$RepoDir)

  $commit = (& git -C $RepoDir rev-parse --short HEAD 2>$null)
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($commit)) {
    throw "Aktif commit bilgisi alinamadi: $RepoDir"
  }

  return $commit.Trim()
}
