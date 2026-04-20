BeforeAll {
  . (Join-Path $PSScriptRoot "shared.ps1")
}

Describe "Read-LauncherConfig" {
  It "loads required config fields from JSON" {
    $configPath = Join-Path $TestDrive "server-config.json"
    @'
{
  "repo": {
    "url": "https://github.com/org/private-repo.git",
    "branch": "main",
    "githubUsername": "berke",
    "githubToken": "token"
  },
  "paths": {
    "installRoot": "C:\\dropshiping-launcher",
    "repoDir": "C:\\dropshiping-app"
  },
  "ngrok": {
    "authToken": "ngrok-token"
  },
  "app": {
    "connectorEnv": {
      "CONNECTOR_PROVIDER": "chatgpt-web"
    }
  }
}
'@ | Set-Content -LiteralPath $configPath

    $config = Read-LauncherConfig -ConfigPath $configPath

    $config.repo.url | Should -Be "https://github.com/org/private-repo.git"
    $config.paths.repoDir | Should -Be "C:\dropshiping-app"
    $config.app.connectorEnv.CONNECTOR_PROVIDER | Should -Be "chatgpt-web"
  }
}

Describe "Write-EnvFileFromMap" {
  It "writes deterministic KEY=VALUE lines" {
    $envPath = Join-Path $TestDrive "connector.env"
    Write-EnvFileFromMap -Path $envPath -Map ([ordered]@{
      CONNECTOR_PROVIDER = "chatgpt-web"
      CONNECTOR_PORT = "4317"
    })

    Get-Content -LiteralPath $envPath | Should -Be @(
      "CONNECTOR_PROVIDER=chatgpt-web",
      "CONNECTOR_PORT=4317"
    )
  }
}

Describe "Get-LauncherRuntimePaths" {
  It "returns the expected logs, pids, and runtime directories" {
    $paths = Get-LauncherRuntimePaths -InstallRoot "C:\dropshiping-launcher"

    $paths.LogsDir | Should -Be "C:\dropshiping-launcher\.state\logs"
    $paths.PidsDir | Should -Be "C:\dropshiping-launcher\.state\pids"
    $paths.RuntimeDir | Should -Be "C:\dropshiping-launcher\.state\runtime"
  }
}
