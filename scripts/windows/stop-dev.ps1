param(
  [switch]$Quiet
)

$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
$ProjectRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$RuntimeDir = Join-Path $ProjectRoot ".state\windows-dev"
$PidsDir = Join-Path $RuntimeDir "pids"
$ServiceWindows = @(
  "Dropshiping2BizBize Connector",
  "Dropshiping2BizBize API",
  "Dropshiping2BizBize Web"
)

function Write-StopLog {
  param([Parameter(Mandatory = $true)][string]$Message)

  if (-not $Quiet) {
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Write-Host $line
  }
}

function Stop-WindowProcesses {
  foreach ($windowTitle in $ServiceWindows) {
    $matchingProcesses = Get-Process -ErrorAction SilentlyContinue | Where-Object {
      $_.MainWindowTitle -and ($_.MainWindowTitle -eq $windowTitle -or $_.MainWindowTitle -like "*$windowTitle*")
    }

    foreach ($process in $matchingProcesses) {
      try {
        Write-StopLog "Pencere kapatiliyor: $windowTitle (PID $($process.Id))"
        Stop-Process -Id $process.Id -Force -ErrorAction Stop
      } catch {
        Write-StopLog "Pencere kapatilamadi: $windowTitle (PID $($process.Id))"
      }
    }
  }
}

function Stop-RecordedPids {
  if (-not (Test-Path -LiteralPath $PidsDir)) {
    return
  }

  Get-ChildItem -LiteralPath $PidsDir -Filter "*.pid" -ErrorAction SilentlyContinue | ForEach-Object {
    $pidText = Get-Content -LiteralPath $_.FullName -ErrorAction SilentlyContinue | Select-Object -First 1
    if ([string]::IsNullOrWhiteSpace($pidText)) {
      Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
      return
    }

    $servicePid = $null
    if ([int]::TryParse($pidText.Trim(), [ref]$servicePid)) {
      try {
        Write-StopLog "$($_.BaseName) kapatiliyor: PID $servicePid"
        Stop-Process -Id $servicePid -Force -ErrorAction Stop
      } catch {
        Write-StopLog "$($_.BaseName) zaten kapali: PID $servicePid"
      }
    }

    Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
  }
}

function Main {
  Write-StopLog "Windows dev servisleri durduruluyor..."
  Stop-RecordedPids
  Stop-WindowProcesses
  Write-StopLog "Windows dev servisleri durduruldu."
}

Main
