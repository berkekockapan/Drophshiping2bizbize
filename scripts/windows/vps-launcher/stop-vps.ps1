param(
  [string]$InstallRoot = "C:\dropshiping-launcher",
  [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$LauncherStopSkipMain = $LauncherStopSkipMain -as [bool]

function Write-StopLog {
  param([Parameter(Mandatory = $true)][string]$Message)

  if (-not $Quiet) {
    Write-Host ("[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message)
  }
}

function Stop-RecordedProcesses {
  param([Parameter(Mandatory = $true)][string]$PidsDir)

  if (-not (Test-Path -LiteralPath $PidsDir)) {
    return
  }

  Get-ChildItem -LiteralPath $PidsDir -Filter "*.pid" -ErrorAction SilentlyContinue | ForEach-Object {
    $pidValue = Get-Content -LiteralPath $_.FullName -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($pidValue -match '^\d+$') {
      Stop-Process -Id ([int]$pidValue) -Force -ErrorAction SilentlyContinue
    }

    Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
  }
}

function Stop-ServiceWindows {
  param([Parameter(Mandatory = $true)][string[]]$Titles)

  foreach ($title in $Titles) {
    Get-Process -ErrorAction SilentlyContinue | Where-Object {
      $_.MainWindowTitle -and $_.MainWindowTitle -eq $title
    } | ForEach-Object {
      Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
  }
}

function Main {
  $pidsDir = Join-Path $InstallRoot ".state\pids"
  $serviceTitles = @(
    "Dropship Launcher Connector",
    "Dropship Launcher API",
    "Dropship Launcher Web",
    "Dropship Launcher ngrok"
  )

  Write-StopLog "Launcher surecleri durduruluyor..."
  Stop-RecordedProcesses -PidsDir $pidsDir
  Stop-ServiceWindows -Titles $serviceTitles
  Write-StopLog "Launcher surecleri durduruldu."
}

if (-not $LauncherStopSkipMain) {
  Main
}
