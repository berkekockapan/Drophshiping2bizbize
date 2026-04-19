# Windows VPS Zero-Touch Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Windows VPS uzerinde private repo kaynakli projeyi sifirdan kurup `connector + api + web + ngrok` olarak tek tikla ayaga kaldiran ve ayri bir komutla durdurabilen launcher paketini eklemek.

**Architecture:** Launcher dosyalari repo icinde `scripts/windows/vps-launcher/` altinda tutulacak ama calisma zamani repo disindaki `C:\dropshiping-launcher` klasorune kopyalanabilecek sekilde tasarlanacak. Ortak config, log, pid, env uretimi ve surec yonetimi `shared.ps1` icinde toplanacak; `bootstrap-vps.ps1`, `start-vps.ps1` ve `stop-vps.ps1` bu ortak yardimcilari kullanarak sifirdan kurulum, baslatma ve durdurma akislarini ayri sorumluluklarla yonetecek.

**Tech Stack:** PowerShell, BAT, Git for Windows, Node.js 22, pnpm/corepack, Playwright, ngrok, Pester

---

## Implementation Notes

- Source spec: `docs/superpowers/specs/2026-04-20-windows-vps-zero-touch-launcher-design.md`
- Launcher paketi repo icinde saklanacak; kullanici bunu VPS'e ayri bir klasor olarak kopyalayip oradan calistiracak.
- `connector` gorunur browser gerektirdigi icin Windows service degil, kullanici oturumu icinde acilan kontrollu process modeli korunacak.
- Secrets repo icine commit edilmeyecek; yalnizca `server-config.example.json` tutulacak.
- Because explicit subagent delegation was not requested, do a local plan review instead of the skill's reviewer subagent loop.
- Mecut `scripts/windows/start-dev.ps1` ve `scripts/windows/stop-dev.ps1` davranisi geriye donuk korunacak; yeni launcher bunlardan kopya degil, ihtiyac olan ortak parcalari paylasan ayri akistir.

## Scope Check

Bu spec tek bir alt sistemi tanimliyor: Windows VPS launcher paketi. Kurulum, config, baslatma, durdurma, runtime durum dosyalari ve operasyon dokumani ayni teslimat icinde birlikte deger urettigi icin tek plan olarak tutuldu.

## File Structure / Responsibility Map

### Create
- `scripts/windows/vps-launcher/install-and-start.bat` - PowerShell bootstrap + start akisini tek tik wrapper olarak baslatir.
- `scripts/windows/vps-launcher/stop-server.bat` - launcher stop akisini tek tik wrapper olarak baslatir.
- `scripts/windows/vps-launcher/server-config.example.json` - repo URL, branch, token, env ve path alanlarini gosteren secretsiz ornek config.
- `scripts/windows/vps-launcher/shared.ps1` - config okuma, runtime path cozumleme, log yazma, env dosyasi uretme, pid kaydi, health check, ngrok URL okuma gibi ortak yardimcilar.
- `scripts/windows/vps-launcher/shared.Tests.ps1` - config/env/runtime yardimcilarinin Pester kapsamasi.
- `scripts/windows/vps-launcher/bootstrap-vps.ps1` - arac kurulum kontrolu, repo clone/pull, pnpm install, Playwright/browser hazirligi, ngrok auth akisi.
- `scripts/windows/vps-launcher/bootstrap-vps.Tests.ps1` - bootstrap akisinda komut olusumu ve fail-fast davranisi testleri.
- `scripts/windows/vps-launcher/start-vps.ps1` - connector/api/web/ngrok baslatma, health check ve status dosyasi yazma.
- `scripts/windows/vps-launcher/start-vps.Tests.ps1` - baslatma sirasi, health check ve status/public URL akisi testleri.
- `scripts/windows/vps-launcher/stop-vps.ps1` - kayitli pid ve pencere basliklarina gore surecleri kapatma.
- `scripts/windows/vps-launcher/stop-vps.Tests.ps1` - kapatma temizligi ve stale pid temizleme testleri.
- `docs/runbooks/windows-vps-launcher.md` - VPS operator runbook'u.

### Modify
- `uzakpc.md` - yeni launcher paketini canonical Windows uzaktan calistirma yolu olarak referanslar.

---

### Task 1: Scaffold the launcher package and shared runtime/config primitives

**Files:**
- Create: `scripts/windows/vps-launcher/server-config.example.json`
- Create: `scripts/windows/vps-launcher/shared.ps1`
- Create: `scripts/windows/vps-launcher/shared.Tests.ps1`

- [ ] **Step 1: Write the failing Pester tests for config parsing, runtime layout, and env file generation**

```powershell
# scripts/windows/vps-launcher/shared.Tests.ps1
. (Join-Path $PSScriptRoot "shared.ps1")

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
```

- [ ] **Step 2: Run the shared helper tests to verify they fail before implementation**

Run:

```bash
pwsh -NoProfile -Command "Invoke-Pester scripts/windows/vps-launcher/shared.Tests.ps1"
```

Expected: FAIL because `shared.ps1` and the helper functions do not exist yet.

- [ ] **Step 3: Implement the shared helper module and the example config**

```powershell
# scripts/windows/vps-launcher/shared.ps1
function Test-ConfigPathValue {
  param(
    [Parameter(Mandatory = $true)][hashtable]$Config,
    [Parameter(Mandatory = $true)][string]$Path
  )

  $current = $Config
  foreach ($segment in $Path.Split(".")) {
    if ($current -isnot [hashtable] -or -not $current.ContainsKey($segment)) {
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

  $config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json -AsHashtable
  foreach ($requiredPath in @("repo.url", "repo.branch", "paths.installRoot", "paths.repoDir", "ngrok.authToken")) {
    if (-not (Test-ConfigPathValue -Config $config -Path $requiredPath)) {
      throw "Launcher config zorunlu alan eksik: $requiredPath"
    }
  }

  return $config
}

function Get-LauncherRuntimePaths {
  param([Parameter(Mandatory = $true)][string]$InstallRoot)

  return @{
    StateRoot = Join-Path $InstallRoot ".state"
    LogsDir = Join-Path $InstallRoot ".state\logs"
    PidsDir = Join-Path $InstallRoot ".state\pids"
    RuntimeDir = Join-Path $InstallRoot ".state\runtime"
  }
}

function Write-EnvFileFromMap {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][hashtable]$Map
  )

  $lines = @()
  foreach ($entry in $Map.GetEnumerator()) {
    $lines += "{0}={1}" -f $entry.Key, $entry.Value
  }

  Set-Content -LiteralPath $Path -Value $lines
}
```

```json
// scripts/windows/vps-launcher/server-config.example.json
{
  "repo": {
    "url": "https://github.com/ORG/REPO.git",
    "branch": "main",
    "githubUsername": "GITHUB_USERNAME",
    "githubToken": "GITHUB_PAT"
  },
  "paths": {
    "installRoot": "C:\\dropshiping-launcher",
    "repoDir": "C:\\dropshiping-app",
    "ngrokDir": "C:\\dropshiping-launcher\\tools\\ngrok"
  },
  "ngrok": {
    "authToken": "NGROK_AUTHTOKEN"
  },
  "startup": {
    "autoOpenBrowser": false,
    "retryCount": 1,
    "healthTimeoutSeconds": 180
  },
  "app": {
    "connectorEnv": {
      "CONNECTOR_PROVIDER": "chatgpt-web",
      "CONNECTOR_PORT": "4317"
    },
    "apiEnv": {},
    "webEnv": {}
  }
}
```

- [ ] **Step 4: Re-run the shared helper tests**

Run:

```bash
pwsh -NoProfile -Command "Invoke-Pester scripts/windows/vps-launcher/shared.Tests.ps1"
```

Expected: PASS with config parsing, runtime path calculation, and env file writing covered.

- [ ] **Step 5: Commit the shared launcher primitives**

```bash
git add scripts/windows/vps-launcher/server-config.example.json scripts/windows/vps-launcher/shared.ps1 scripts/windows/vps-launcher/shared.Tests.ps1
git commit -m "feat: add Windows VPS launcher shared helpers"
```

### Task 2: Implement clean stop flow for recorded processes and service windows

**Files:**
- Create: `scripts/windows/vps-launcher/stop-vps.ps1`
- Create: `scripts/windows/vps-launcher/stop-vps.Tests.ps1`
- Create: `scripts/windows/vps-launcher/stop-server.bat`
- Modify: `scripts/windows/vps-launcher/shared.ps1`

- [ ] **Step 1: Write the failing stop-flow tests for pid cleanup and titled window cleanup**

```powershell
# scripts/windows/vps-launcher/stop-vps.Tests.ps1
$LauncherStopSkipMain = $true
. (Join-Path $PSScriptRoot "stop-vps.ps1")

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
```

- [ ] **Step 2: Run the stop-flow tests and confirm they fail**

Run:

```bash
pwsh -NoProfile -Command "Invoke-Pester scripts/windows/vps-launcher/stop-vps.Tests.ps1"
```

Expected: FAIL because `stop-vps.ps1` and the stop helpers do not exist yet.

- [ ] **Step 3: Implement the stop script and BAT wrapper**

```powershell
# scripts/windows/vps-launcher/stop-vps.ps1
param(
  [string]$InstallRoot = "C:\dropshiping-launcher",
  [switch]$Quiet
)

$LauncherStopSkipMain = $LauncherStopSkipMain -as [bool]
. (Join-Path $PSScriptRoot "shared.ps1")

function Stop-RecordedProcesses {
  param([Parameter(Mandatory = $true)][string]$PidsDir)

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
```

```bat
:: scripts/windows/vps-launcher/stop-server.bat
@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-vps.ps1"
set EXIT_CODE=%ERRORLEVEL%
if not "%EXIT_CODE%"=="0" exit /b %EXIT_CODE%
```

- [ ] **Step 4: Re-run the stop-flow tests**

Run:

```bash
pwsh -NoProfile -Command "Invoke-Pester scripts/windows/vps-launcher/stop-vps.Tests.ps1"
```

Expected: PASS with pid-file cleanup and launcher window cleanup covered.

- [ ] **Step 5: Commit the stop flow**

```bash
git add scripts/windows/vps-launcher/stop-vps.ps1 scripts/windows/vps-launcher/stop-vps.Tests.ps1 scripts/windows/vps-launcher/stop-server.bat scripts/windows/vps-launcher/shared.ps1
git commit -m "feat: add Windows VPS launcher stop flow"
```

### Task 3: Implement bootstrap for tool checks, repo sync, env generation, and dependency install

**Files:**
- Create: `scripts/windows/vps-launcher/bootstrap-vps.ps1`
- Create: `scripts/windows/vps-launcher/bootstrap-vps.Tests.ps1`
- Modify: `scripts/windows/vps-launcher/shared.ps1`
- Modify: `scripts/windows/vps-launcher/server-config.example.json`

- [ ] **Step 1: Write the failing bootstrap tests for clone/update selection, env writing, and ngrok auth setup**

```powershell
# scripts/windows/vps-launcher/bootstrap-vps.Tests.ps1
$LauncherBootstrapSkipMain = $true
. (Join-Path $PSScriptRoot "bootstrap-vps.ps1")

Describe "Sync-LauncherRepo" {
  It "clones the repo when the target directory is missing" {
    Mock Test-Path { $false } -ParameterFilter { $LiteralPath -eq "C:\dropshiping-app" }
    Mock Invoke-LoggedCommand {}

    Sync-LauncherRepo -RepoUrl "https://github.com/org/repo.git" -Branch "main" -RepoDir "C:\dropshiping-app" -GitHubUsername "berke" -GitHubToken "secret"

    Assert-MockCalled Invoke-LoggedCommand -Times 1 -ParameterFilter {
      $Command -like '*git clone*https://berke:secret@github.com/org/repo.git*'
    }
  }

  It "fetches and hard-resets when the repo already exists" {
    Mock Test-Path { $true } -ParameterFilter { $LiteralPath -eq "C:\dropshiping-app" }
    Mock Invoke-LoggedCommand {}

    Sync-LauncherRepo -RepoUrl "https://github.com/org/repo.git" -Branch "main" -RepoDir "C:\dropshiping-app" -GitHubUsername "berke" -GitHubToken "secret"

    Assert-MockCalled Invoke-LoggedCommand -Times 1 -ParameterFilter { $Command -eq "git fetch origin" }
    Assert-MockCalled Invoke-LoggedCommand -Times 1 -ParameterFilter { $Command -eq "git reset --hard origin/main" }
    Assert-MockCalled Invoke-LoggedCommand -Times 1 -ParameterFilter { $Command -eq "git clean -fd" }
  }
}

Describe "Write-AppEnvFiles" {
  It "creates the connector env file from the config map" {
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
  }
}
```

- [ ] **Step 2: Run the bootstrap tests and confirm they fail**

Run:

```bash
pwsh -NoProfile -Command "Invoke-Pester scripts/windows/vps-launcher/bootstrap-vps.Tests.ps1"
```

Expected: FAIL because `bootstrap-vps.ps1` and repo/env helpers do not exist yet.

- [ ] **Step 3: Implement bootstrap helpers for repo sync, env generation, tool preparation, and Playwright install**

```powershell
# scripts/windows/vps-launcher/bootstrap-vps.ps1
param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot "server-config.json")
)

$LauncherBootstrapSkipMain = $LauncherBootstrapSkipMain -as [bool]
. (Join-Path $PSScriptRoot "shared.ps1")

function Sync-LauncherRepo {
  param(
    [string]$RepoUrl,
    [string]$Branch,
    [string]$RepoDir,
    [string]$GitHubUsername,
    [string]$GitHubToken
  )

  $authUrl = Convert-ToAuthenticatedGitUrl -RepoUrl $RepoUrl -Username $GitHubUsername -Token $GitHubToken
  if (-not (Test-Path -LiteralPath $RepoDir)) {
    Invoke-LoggedCommand -Command "git clone --branch $Branch $authUrl `"$RepoDir`""
    return
  }

  Push-Location -LiteralPath $RepoDir
  try {
    Invoke-LoggedCommand -Command "git fetch origin"
    Invoke-LoggedCommand -Command "git checkout $Branch"
    Invoke-LoggedCommand -Command "git reset --hard origin/$Branch"
    Invoke-LoggedCommand -Command "git clean -fd"
  } finally {
    Pop-Location
  }
}

function Write-AppEnvFiles {
  param(
    [string]$RepoDir,
    [hashtable]$Config
  )

  $connectorEnvPath = Join-Path $RepoDir "apps\connector\.env"
  Write-EnvFileFromMap -Path $connectorEnvPath -Map $Config.app.connectorEnv
}

function Ensure-PlaywrightChromium {
  param([string]$RepoDir)

  Push-Location -LiteralPath $RepoDir
  try {
    Invoke-LoggedCommand -Command "pnpm --filter @trendyol-etsy/connector exec playwright install chromium"
  } finally {
    Pop-Location
  }
}
```

- [ ] **Step 4: Re-run the bootstrap tests and a smoke-level PowerShell parse check**

Run:

```bash
pwsh -NoProfile -Command "Invoke-Pester scripts/windows/vps-launcher/bootstrap-vps.Tests.ps1"
pwsh -NoProfile -Command "$LauncherBootstrapSkipMain=$true; . ./scripts/windows/vps-launcher/bootstrap-vps.ps1"
```

Expected: Pester PASS. The dot-sourced parse check should load the script without syntax errors and without executing `Main`.

- [ ] **Step 5: Commit the bootstrap flow**

```bash
git add scripts/windows/vps-launcher/bootstrap-vps.ps1 scripts/windows/vps-launcher/bootstrap-vps.Tests.ps1 scripts/windows/vps-launcher/shared.ps1 scripts/windows/vps-launcher/server-config.example.json
git commit -m "feat: add Windows VPS launcher bootstrap flow"
```

### Task 4: Implement orchestrated start flow, public URL capture, and one-click BAT entrypoint

**Files:**
- Create: `scripts/windows/vps-launcher/start-vps.ps1`
- Create: `scripts/windows/vps-launcher/start-vps.Tests.ps1`
- Create: `scripts/windows/vps-launcher/install-and-start.bat`
- Modify: `scripts/windows/vps-launcher/shared.ps1`

- [ ] **Step 1: Write the failing start-flow tests for service ordering, health checks, and status file output**

```powershell
# scripts/windows/vps-launcher/start-vps.Tests.ps1
$LauncherStartSkipMain = $true
. (Join-Path $PSScriptRoot "start-vps.ps1")

Describe "Start-LauncherServices" {
  It "starts connector, api, web, then ngrok and writes runtime summary files" {
    Mock Start-LoggedServiceWindow {}
    Mock Wait-HttpEndpoint {}
    Mock Wait-NgrokPublicUrl { "https://demo.ngrok.app" }
    Mock Get-HeadCommit { "abc1234" }

    $runtimeRoot = Join-Path $TestDrive "runtime"
    New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null

    Start-LauncherServices -RepoDir "C:\dropshiping-app" -RuntimeRoot $runtimeRoot -AutoOpenBrowser:$false

    Assert-MockCalled Start-LoggedServiceWindow -Times 1 -ParameterFilter { $Title -eq "Dropship Launcher Connector" }
    Assert-MockCalled Start-LoggedServiceWindow -Times 1 -ParameterFilter { $Title -eq "Dropship Launcher API" }
    Assert-MockCalled Start-LoggedServiceWindow -Times 1 -ParameterFilter { $Title -eq "Dropship Launcher Web" }
    Assert-MockCalled Start-LoggedServiceWindow -Times 1 -ParameterFilter { $Title -eq "Dropship Launcher ngrok" }

    Get-Content -LiteralPath (Join-Path $runtimeRoot "latest-url.txt") | Should -Be "https://demo.ngrok.app"
    Get-Content -LiteralPath (Join-Path $runtimeRoot "status.txt") | Should -Match "abc1234"
  }
}
```

- [ ] **Step 2: Run the start-flow tests and confirm they fail**

Run:

```bash
pwsh -NoProfile -Command "Invoke-Pester scripts/windows/vps-launcher/start-vps.Tests.ps1"
```

Expected: FAIL because `start-vps.ps1` and the launcher start functions do not exist yet.

- [ ] **Step 3: Implement the start orchestration and BAT wrapper**

```powershell
# scripts/windows/vps-launcher/start-vps.ps1
param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot "server-config.json")
)

$LauncherStartSkipMain = $LauncherStartSkipMain -as [bool]
. (Join-Path $PSScriptRoot "shared.ps1")

function Start-LauncherServices {
  param(
    [string]$RepoDir,
    [string]$RuntimeRoot,
    [bool]$AutoOpenBrowser
  )

  Start-LoggedServiceWindow -Title "Dropship Launcher Connector" -Command "pnpm --filter @trendyol-etsy/connector dev"
  Wait-HttpEndpoint -Url "http://127.0.0.1:4317/health" -Label "Connector"

  Start-LoggedServiceWindow -Title "Dropship Launcher API" -Command "pnpm --filter @trendyol-etsy/api dev"
  Wait-HttpEndpoint -Url "http://127.0.0.1:8787/health" -Label "API"

  Start-LoggedServiceWindow -Title "Dropship Launcher Web" -Command "pnpm --filter @trendyol-etsy/web dev"
  Wait-HttpEndpoint -Url "http://127.0.0.1:5173" -Label "Web"

  Start-LoggedServiceWindow -Title "Dropship Launcher ngrok" -Command "ngrok http 5173"
  $publicUrl = Wait-NgrokPublicUrl

  Set-Content -LiteralPath (Join-Path $RuntimeRoot "latest-url.txt") -Value $publicUrl
  Set-Content -LiteralPath (Join-Path $RuntimeRoot "status.txt") -Value @(
    "commit=$((Get-HeadCommit -RepoDir $RepoDir))"
    "web=http://127.0.0.1:5173"
    "api=http://127.0.0.1:8787/health"
    "connector=http://127.0.0.1:4317/health"
    "publicUrl=$publicUrl"
  )
}
```

```bat
:: scripts/windows/vps-launcher/install-and-start.bat
@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0bootstrap-vps.ps1"
if errorlevel 1 exit /b %errorlevel%
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-vps.ps1"
exit /b %errorlevel%
```

- [ ] **Step 4: Re-run the start-flow tests and the full launcher test suite**

Run:

```bash
pwsh -NoProfile -Command "Invoke-Pester scripts/windows/vps-launcher/start-vps.Tests.ps1"
pwsh -NoProfile -Command "Invoke-Pester scripts/windows/vps-launcher/*.Tests.ps1"
```

Expected: PASS with service order, health checks, and runtime status file writing covered.

- [ ] **Step 5: Commit the start flow**

```bash
git add scripts/windows/vps-launcher/start-vps.ps1 scripts/windows/vps-launcher/start-vps.Tests.ps1 scripts/windows/vps-launcher/install-and-start.bat scripts/windows/vps-launcher/shared.ps1
git commit -m "feat: add Windows VPS launcher start flow"
```

### Task 5: Document the operator workflow and connect it to existing Windows remote docs

**Files:**
- Create: `docs/runbooks/windows-vps-launcher.md`
- Modify: `uzakpc.md`

- [ ] **Step 1: Write the operator-facing runbook and update the existing uzakpc note**

```md
# Windows VPS Launcher Runbook

## Amaç

Bu runbook, `scripts/windows/vps-launcher/` klasorunun bir Windows VPS'e nasil kopyalanacagini, `server-config.json` dosyasinin nasil hazirlanacagini ve `install-and-start.bat` / `stop-server.bat` ile nasil isletilecegini anlatir.

## Hazirlama

1. `scripts/windows/vps-launcher/` klasorunu VPS'te `C:\dropshiping-launcher` altina kopyala.
2. `server-config.example.json` dosyasini `server-config.json` olarak kopyala.
3. GitHub PAT, repo URL ve `NGROK_AUTHTOKEN` alanlarini doldur.
4. `install-and-start.bat` calistir.
5. Public URL icin `.state\runtime\latest-url.txt` dosyasini kontrol et.
```

```md
## uzakpc.md eklentisi

- `scripts/windows/restart-main-server.bat` gelistirme ve cloud preview icin korunur.
- Sifirdan Windows VPS kurulumu ve private repo bootstrap ihtiyaci icin canonical yol artik `scripts/windows/vps-launcher/install-and-start.bat` paketidir.
```

- [ ] **Step 2: Verify the docs reference the correct files**

Run:

```bash
rg -n "install-and-start.bat|stop-server.bat|server-config.json|latest-url.txt" docs/runbooks/windows-vps-launcher.md uzakpc.md
```

Expected: PASS with all key launcher entrypoints and runtime files referenced exactly once or more.

- [ ] **Step 3: Commit the documentation**

```bash
git add docs/runbooks/windows-vps-launcher.md uzakpc.md
git commit -m "docs: add Windows VPS launcher runbook"
```

### Task 6: Do a final local review and smoke check before execution handoff

**Files:**
- Modify: `docs/superpowers/plans/2026-04-20-windows-vps-zero-touch-launcher.md`

- [ ] **Step 1: Re-read the spec and plan side by side**

Run:

```bash
diff -u docs/superpowers/specs/2026-04-20-windows-vps-zero-touch-launcher-design.md docs/superpowers/plans/2026-04-20-windows-vps-zero-touch-launcher.md >/tmp/windows-vps-launcher-plan.diff || true
```

Expected: Differences exist because one file is a spec and the other is an implementation plan, but no spec requirement should be missing from the plan.

- [ ] **Step 2: Review the launcher file map and remove any accidental scope growth**

Checklist:
- `Cloud` deploy davranisi plana girmedi
- Windows service/NSSM plana girmedi
- only `connector + api + web + ngrok` lifecycle var
- secrets icin yalnizca example config commit ediliyor

- [ ] **Step 3: Mark any follow-up items explicitly instead of silently expanding this implementation**

```md
Follow-up only:
- Windows Credential Manager secret storage
- Scheduled Task ile auto-login / auto-start
- ngrok yerine kalici domain + reverse proxy
```

- [ ] **Step 4: Commit the finalized plan if the review changed it**

```bash
git add docs/superpowers/plans/2026-04-20-windows-vps-zero-touch-launcher.md
git commit -m "docs: finalize Windows VPS launcher implementation plan"
```
