BeforeAll {
  $LauncherBootstrapSkipMain = $true
  . (Join-Path $PSScriptRoot "bootstrap-vps.ps1")
}

Describe "Sync-LauncherRepo" {
  It "hedef klasor yoksa private repo clone komutunu kurar" {
    Mock Convert-ToAuthenticatedGitUrl { "https://berke:secret@github.com/org/repo.git" }
    Mock Test-Path { $false } -ParameterFilter { $LiteralPath -eq "C:\dropshiping-app" }
    Mock Invoke-LoggedCommand {}

    Sync-LauncherRepo -RepoUrl "https://github.com/org/repo.git" -Branch "main" -RepoDir "C:\dropshiping-app" -GitHubUsername "berke" -GitHubToken "secret"

    Assert-MockCalled Invoke-LoggedCommand -Times 1 -Exactly -ParameterFilter {
      $Command -eq 'git clone --branch main https://berke:secret@github.com/org/repo.git "C:\dropshiping-app"'
    }
  }

  It "hedef repo varsa fetch checkout reset clean sirasini cagirir" {
    Mock Convert-ToAuthenticatedGitUrl { "https://berke:secret@github.com/org/repo.git" }
    Mock Test-Path { $true } -ParameterFilter { $LiteralPath -eq "C:\dropshiping-app" }
    Mock Push-Location {}
    Mock Pop-Location {}
    Mock Invoke-LoggedCommand {}

    Sync-LauncherRepo -RepoUrl "https://github.com/org/repo.git" -Branch "main" -RepoDir "C:\dropshiping-app" -GitHubUsername "berke" -GitHubToken "secret"

    Assert-MockCalled Invoke-LoggedCommand -Times 1 -ParameterFilter { $Command -eq "git fetch origin" }
    Assert-MockCalled Invoke-LoggedCommand -Times 1 -ParameterFilter { $Command -eq "git checkout main" }
    Assert-MockCalled Invoke-LoggedCommand -Times 1 -ParameterFilter { $Command -eq "git reset --hard origin/main" }
    Assert-MockCalled Invoke-LoggedCommand -Times 1 -ParameterFilter { $Command -eq "git clean -fd" }
  }
}

Describe "Write-AppEnvFiles" {
  It "connector env dosyasini config mapinden yazar" {
    $repoDir = Join-Path $TestDrive "repo"
    New-Item -ItemType Directory -Path (Join-Path $repoDir "apps/connector") -Force | Out-Null

    Write-AppEnvFiles -RepoDir $repoDir -Config @{
      app = @{
        connectorEnv = @{
          CONNECTOR_PROVIDER = "chatgpt-web"
          CONNECTOR_PORT = "4317"
        }
      }
    }

    Get-Content -LiteralPath (Join-Path $repoDir "apps/connector/.env") | Should -Contain "CONNECTOR_PROVIDER=chatgpt-web"
    Get-Content -LiteralPath (Join-Path $repoDir "apps/connector/.env") | Should -Contain "CONNECTOR_PORT=4317"
  }
}

Describe "Ensure-PlaywrightChromium" {
  It "repo icinden playwright chromium install komutunu cagirir" {
    Mock Push-Location {}
    Mock Pop-Location {}
    Mock Invoke-LoggedCommand {}

    Ensure-PlaywrightChromium -RepoDir "C:\dropshiping-app"

    Assert-MockCalled Invoke-LoggedCommand -Times 1 -Exactly -ParameterFilter {
      $Command -eq "pnpm --filter @trendyol-etsy/connector exec playwright install chromium"
    }
  }
}

Describe "Configure-NgrokAuth" {
  It "token doluysa ngrok authtoken komutunu cagirir" {
    Mock Invoke-LoggedCommand {}

    Configure-NgrokAuth -AuthToken "ngrok-secret"

    Assert-MockCalled Invoke-LoggedCommand -Times 1 -Exactly -ParameterFilter {
      $Command -eq "ngrok config add-authtoken ngrok-secret"
    }
  }

  It "token bossa ngrok komutunu cagirmaz" {
    Mock Invoke-LoggedCommand {}

    Configure-NgrokAuth -AuthToken ""

    Assert-MockCalled Invoke-LoggedCommand -Times 0
  }
}

Describe "Invoke-BootstrapFlow" {
  It "bootstrap adimlarini beklenen parametrelerle orkestre eder" {
    $config = @{
      repo = @{
        url = "https://github.com/org/repo.git"
        branch = "main"
        githubUsername = "berke"
        githubToken = "secret"
      }
      paths = @{
        installRoot = "C:\dropshiping-launcher"
        repoDir = "C:\dropshiping-app"
      }
      ngrok = @{
        authToken = "ngrok-secret"
      }
      app = @{
        connectorEnv = @{
          CONNECTOR_PROVIDER = "chatgpt-web"
        }
      }
    }

    Mock Assert-BootstrapPrerequisites {}
    Mock Get-BootstrapLogPath { "C:\dropshiping-launcher\.state\logs\bootstrap.log" }
    Mock Write-LauncherLog {}
    Mock Configure-NgrokAuth {}
    Mock Sync-LauncherRepo {}
    Mock Write-AppEnvFiles {}
    Mock Install-RepoDependencies {}
    Mock Ensure-PlaywrightChromium {}

    Invoke-BootstrapFlow -Config $config

    Assert-MockCalled Assert-BootstrapPrerequisites -Times 1 -Exactly
    Assert-MockCalled Get-BootstrapLogPath -Times 1 -Exactly
    Assert-MockCalled Configure-NgrokAuth -Times 1 -Exactly -ParameterFilter { $AuthToken -eq "ngrok-secret" }
    Assert-MockCalled Sync-LauncherRepo -Times 1 -Exactly -ParameterFilter {
      $RepoUrl -eq "https://github.com/org/repo.git" -and
      $Branch -eq "main" -and
      $RepoDir -eq "C:\dropshiping-app" -and
      $GitHubUsername -eq "berke" -and
      $GitHubToken -eq "secret"
    }
    Assert-MockCalled Write-AppEnvFiles -Times 1 -Exactly -ParameterFilter { $RepoDir -eq "C:\dropshiping-app" }
    Assert-MockCalled Install-RepoDependencies -Times 1 -Exactly -ParameterFilter { $RepoDir -eq "C:\dropshiping-app" }
    Assert-MockCalled Ensure-PlaywrightChromium -Times 1 -Exactly -ParameterFilter { $RepoDir -eq "C:\dropshiping-app" }
  }
}
