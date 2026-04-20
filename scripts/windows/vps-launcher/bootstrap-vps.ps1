param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot "server-config.json")
)

$ErrorActionPreference = "Stop"
$LauncherBootstrapSkipMain = $LauncherBootstrapSkipMain -as [bool]

$sharedScriptPath = Join-Path $PSScriptRoot "shared.ps1"
if (-not (Test-Path -LiteralPath $sharedScriptPath)) {
  throw "shared.ps1 bulunamadi: $sharedScriptPath"
}
. $sharedScriptPath

function Get-BootstrapLogPath {
  param([Parameter(Mandatory = $true)]$Config)

  $runtimePaths = Get-LauncherRuntimePaths -InstallRoot $Config.paths.installRoot
  Ensure-DirectoryPath -Path $runtimePaths.StateRoot
  Ensure-DirectoryPath -Path $runtimePaths.LogsDir
  Ensure-DirectoryPath -Path $runtimePaths.PidsDir
  Ensure-DirectoryPath -Path $runtimePaths.RuntimeDir

  return (Join-Path $runtimePaths.LogsDir "bootstrap.log")
}

function Assert-BootstrapPrerequisites {
  foreach ($commandName in @("git", "node", "pnpm", "ngrok")) {
    if (-not (Get-Command -Name $commandName -ErrorAction SilentlyContinue)) {
      throw "$commandName bulunamadi."
    }
  }
}

function Sync-LauncherRepo {
  param(
    [Parameter(Mandatory = $true)][string]$RepoUrl,
    [Parameter(Mandatory = $true)][string]$Branch,
    [Parameter(Mandatory = $true)][string]$RepoDir,
    [string]$GitHubUsername,
    [string]$GitHubToken,
    [string]$LogPath
  )

  $authUrl = Convert-ToAuthenticatedGitUrl -RepoUrl $RepoUrl -Username $GitHubUsername -Token $GitHubToken
  if (-not (Test-Path -LiteralPath $RepoDir)) {
    Invoke-LoggedCommand -Command "git clone --branch $Branch $authUrl `"$RepoDir`"" -LogPath $LogPath
    return
  }

  Invoke-LoggedCommand -Command "git fetch origin" -WorkingDirectory $RepoDir -LogPath $LogPath
  Invoke-LoggedCommand -Command "git checkout $Branch" -WorkingDirectory $RepoDir -LogPath $LogPath
  Invoke-LoggedCommand -Command "git reset --hard origin/$Branch" -WorkingDirectory $RepoDir -LogPath $LogPath
  Invoke-LoggedCommand -Command "git clean -fd" -WorkingDirectory $RepoDir -LogPath $LogPath
}

function Write-AppEnvFiles {
  param(
    [Parameter(Mandatory = $true)][string]$RepoDir,
    [Parameter(Mandatory = $true)]$Config,
    [string]$LogPath
  )

  $appConfig = $Config.app
  if ($null -eq $appConfig) {
    throw "Config app bolumu zorunludur."
  }
  if ($null -eq $appConfig.connectorEnv) {
    throw "Config app.connectorEnv zorunludur."
  }

  $connectorEnvPath = Join-Path $RepoDir "apps\connector\.env"
  Write-EnvFileFromMap -Path $connectorEnvPath -Map $appConfig.connectorEnv

  if ($null -ne $appConfig.apiEnv) {
    $apiEnvPath = Join-Path $RepoDir "apps\api\.env"
    Write-EnvFileFromMap -Path $apiEnvPath -Map $appConfig.apiEnv
  }

  if ($null -ne $appConfig.webEnv) {
    $webEnvPath = Join-Path $RepoDir "apps\web\.env.local"
    Write-EnvFileFromMap -Path $webEnvPath -Map $appConfig.webEnv
  }

  Write-LauncherLog -Message "Uygulama env dosyalari guncellendi." -LogPath $LogPath
}

function Install-RepoDependencies {
  param(
    [Parameter(Mandatory = $true)][string]$RepoDir,
    [string]$LogPath
  )

  Invoke-LoggedCommand -Command "pnpm install" -WorkingDirectory $RepoDir -LogPath $LogPath
}

function Ensure-PlaywrightChromium {
  param(
    [Parameter(Mandatory = $true)][string]$RepoDir,
    [string]$LogPath
  )

  Invoke-LoggedCommand -Command "pnpm --filter @trendyol-etsy/connector exec playwright install chromium" -WorkingDirectory $RepoDir -LogPath $LogPath
}

function Configure-NgrokAuth {
  param(
    [string]$AuthToken,
    [string]$LogPath
  )

  if ([string]::IsNullOrWhiteSpace($AuthToken)) {
    Write-LauncherLog -Message "ngrok auth token bos, konfigurasyon adimi atlandi." -LogPath $LogPath
    return
  }

  Invoke-LoggedCommand -Command "ngrok config add-authtoken $AuthToken" -LogPath $LogPath
}

function Invoke-BootstrapFlow {
  param(
    [Parameter(Mandatory = $true)]$Config
  )

  Assert-BootstrapPrerequisites

  $repo = $Config.repo
  $paths = $Config.paths

  if ($null -eq $repo -or [string]::IsNullOrWhiteSpace($repo.url)) {
    throw "Config repo.url zorunludur."
  }
  if ($null -eq $repo -or [string]::IsNullOrWhiteSpace($repo.branch)) {
    throw "Config repo.branch zorunludur."
  }
  if ($null -eq $paths -or [string]::IsNullOrWhiteSpace($paths.repoDir)) {
    throw "Config paths.repoDir zorunludur."
  }

  $logPath = Get-BootstrapLogPath -Config $Config
  Write-LauncherLog -Message "Bootstrap basladi." -LogPath $logPath

  Configure-NgrokAuth -AuthToken $Config.ngrok.authToken -LogPath $logPath
  Sync-LauncherRepo -RepoUrl $repo.url -Branch $repo.branch -RepoDir $paths.repoDir -GitHubUsername $repo.githubUsername -GitHubToken $repo.githubToken -LogPath $logPath
  Write-AppEnvFiles -RepoDir $paths.repoDir -Config $Config -LogPath $logPath
  Install-RepoDependencies -RepoDir $paths.repoDir -LogPath $logPath
  Ensure-PlaywrightChromium -RepoDir $paths.repoDir -LogPath $logPath

  Write-LauncherLog -Message "Bootstrap tamamlandi." -LogPath $logPath
}

function Main {
  $config = Read-LauncherConfig -ConfigPath $ConfigPath
  Invoke-BootstrapFlow -Config $config
}

if (-not $LauncherBootstrapSkipMain) {
  Main
}
