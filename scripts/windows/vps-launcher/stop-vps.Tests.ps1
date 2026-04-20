BeforeAll {
  $script:LauncherStopSkipMain = $true
  . (Join-Path $PSScriptRoot "stop-vps.ps1")
}

Describe "Stop-RecordedProcesses" {
  It "stops each pid file and removes the stale files" {
    $pidsDir = Join-Path $TestDrive "pids"
    New-Item -ItemType Directory -Path $pidsDir | Out-Null
    Set-Content -LiteralPath (Join-Path $pidsDir "connector.pid") -Value "1234"
    Set-Content -LiteralPath (Join-Path $pidsDir "api.pid") -Value "5678"

    Mock Stop-Process {}

    Stop-RecordedProcesses -PidsDir $pidsDir

    Assert-MockCalled Stop-Process -Times 1 -ParameterFilter { $Id -eq 1234 }
    Assert-MockCalled Stop-Process -Times 1 -ParameterFilter { $Id -eq 5678 }
    Test-Path -LiteralPath (Join-Path $pidsDir "connector.pid") | Should -BeFalse
    Test-Path -LiteralPath (Join-Path $pidsDir "api.pid") | Should -BeFalse
  }
}

Describe "Stop-ServiceWindows" {
  It "targets launcher-specific window titles only" {
    Mock Get-Process {
      @(
        [pscustomobject]@{ Id = 11; MainWindowTitle = "Dropship Launcher Connector" },
        [pscustomobject]@{ Id = 12; MainWindowTitle = "Dropship Launcher Web" }
      )
    }
    Mock Stop-Process {}

    Stop-ServiceWindows -Titles @("Dropship Launcher Connector", "Dropship Launcher Web")

    Assert-MockCalled Stop-Process -Times 1 -ParameterFilter { $Id -eq 11 }
    Assert-MockCalled Stop-Process -Times 1 -ParameterFilter { $Id -eq 12 }
  }
}
