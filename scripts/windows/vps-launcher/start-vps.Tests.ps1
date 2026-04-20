Describe "Start-LauncherServices" {
  BeforeAll {
    $LauncherStartSkipMain = $true
    . (Join-Path $PSScriptRoot "start-vps.ps1")
  }

  It "starts connector->api->web->ngrok in order, waits health checks, and writes runtime summary files" {
    $script:startOrder = @()
    $script:healthOrder = @()

    Mock Start-LoggedServiceWindow {
      param([string]$Title, [string]$Command, [string]$RepoDir)
      $script:startOrder += $Title
    }

    Mock Wait-HttpEndpoint {
      param([string]$Url, [string]$Label, [int]$TimeoutSeconds)
      $script:healthOrder += "$Label|$Url|$TimeoutSeconds"
    }

    Mock Wait-NgrokPublicUrl { "https://demo.ngrok.app" }
    Mock Get-HeadCommit { "abc1234" }
    Mock Start-Process {}

    $runtimeRoot = Join-Path $TestDrive "runtime"
    New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null

    Start-LauncherServices -RepoDir "C:\dropshiping-app" -RuntimeRoot $runtimeRoot -AutoOpenBrowser:$false -HealthTimeoutSeconds 180 | Out-Null

    $script:startOrder | Should -Be @(
      "Dropship Launcher Connector",
      "Dropship Launcher API",
      "Dropship Launcher Web",
      "Dropship Launcher ngrok"
    )

    $script:healthOrder | Should -Be @(
      "Connector|http://127.0.0.1:4317/health|180",
      "API|http://127.0.0.1:8787/health|180",
      "Web|http://127.0.0.1:5173|180"
    )

    Assert-MockCalled Wait-NgrokPublicUrl -Times 1 -ParameterFilter { $TimeoutSeconds -eq 180 }
    Get-Content -LiteralPath (Join-Path $runtimeRoot "latest-url.txt") | Should -Be "https://demo.ngrok.app"

    $statusPath = Join-Path $runtimeRoot "status.txt"
    $statusContent = Get-Content -LiteralPath $statusPath
    $statusContent | Should -Contain "commit=abc1234"
    $statusContent | Should -Contain "connector=http://127.0.0.1:4317/health"
    $statusContent | Should -Contain "api=http://127.0.0.1:8787/health"
    $statusContent | Should -Contain "web=http://127.0.0.1:5173"
    $statusContent | Should -Contain "publicUrl=https://demo.ngrok.app"
    ($statusContent -join "`n") | Should -Match "startedAt="
  }

  It "opens browser only when AutoOpenBrowser is true" {
    Mock Start-LoggedServiceWindow {}
    Mock Wait-HttpEndpoint {}
    Mock Wait-NgrokPublicUrl { "https://public.ngrok.app" }
    Mock Get-HeadCommit { "abc1234" }
    Mock Start-Process {}

    $runtimeRoot = Join-Path $TestDrive "runtime-open"
    New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null

    Start-LauncherServices -RepoDir "C:\dropshiping-app" -RuntimeRoot $runtimeRoot -AutoOpenBrowser:$true | Out-Null

    Assert-MockCalled Start-Process -Times 1 -ParameterFilter { $FilePath -eq "https://public.ngrok.app" }
  }
}

Describe "Skip-main dot-source pattern" {
  BeforeAll {
    $LauncherStartSkipMain = $true
    . (Join-Path $PSScriptRoot "start-vps.ps1")
  }

  It "loads start-vps.ps1 with LauncherStartSkipMain without executing Main" {
    $probeScriptPath = Join-Path $TestDrive "probe-start-vps.ps1"
    @"
`$LauncherStartSkipMain = `$true
. '$($PSScriptRoot.Replace("'", "''"))\start-vps.ps1'
Write-Output 'loaded'
"@ | Set-Content -LiteralPath $probeScriptPath

    $output = & pwsh -NoProfile -File $probeScriptPath
    $output | Should -Contain "loaded"
  }
}
