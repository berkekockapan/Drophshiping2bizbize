param(
  [switch]$Quiet
)

$ErrorActionPreference = "Stop"

$ServiceWindowTitles = @(
  "Dropshiping2BizBize Web (Cloud Preview)",
  "Dropshiping2BizBize Web",
  "Dropshiping2BizBize API",
  "Dropshiping2BizBize ngrok"
)

function Write-StopLog {
  param([Parameter(Mandatory = $true)][string]$Message)

  if (-not $Quiet) {
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Write-Host $line
  }
}

function Stop-MatchingWindows {
  param([Parameter(Mandatory = $true)][string[]]$Titles)

  foreach ($title in $Titles) {
    $matchingProcesses = Get-Process -ErrorAction SilentlyContinue | Where-Object {
      $_.MainWindowTitle -and ($_.MainWindowTitle -eq $title -or $_.MainWindowTitle -like "*$title*")
    }

    if (-not $matchingProcesses) {
      Write-StopLog "Acilan pencere bulunamadi: $title"
      continue
    }

    foreach ($process in $matchingProcesses) {
      try {
        Write-StopLog "Pencere kapatiliyor: $title (PID $($process.Id))"
        Stop-Process -Id $process.Id -Force -ErrorAction Stop
      } catch {
        Write-StopLog "Pencere kapatilamadi: $title (PID $($process.Id))"
      }
    }
  }
}

function Main {
  Write-StopLog "Cloud server surecleri durduruluyor..."
  Stop-MatchingWindows -Titles $ServiceWindowTitles
  Write-StopLog "Cloud server surecleri durduruldu."
}

Main
