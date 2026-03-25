param()

$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
$ProjectRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$RuntimeDir = Join-Path $ProjectRoot ".state\windows-dev"
$LogsDir = Join-Path $RuntimeDir "logs"
$PidsDir = Join-Path $RuntimeDir "pids"
$StartupLog = Join-Path $LogsDir "startup.log"
$ConnectorLog = Join-Path $LogsDir "connector.log"
$ApiLog = Join-Path $LogsDir "api.log"
$WebLog = Join-Path $LogsDir "web.log"
$ConnectorEnvPath = Join-Path $ProjectRoot "apps\connector\.env"
$NodeModulesPaths = @(
  (Join-Path $ProjectRoot "node_modules"),
  (Join-Path $ProjectRoot "apps\connector\node_modules"),
  (Join-Path $ProjectRoot "apps\api\node_modules"),
  (Join-Path $ProjectRoot "apps\web\node_modules")
)
$ServiceWindows = @(
  "Dropship Connector",
  "Dropship API",
  "Dropship Web"
)

function Write-StartupLog {
  param([Parameter(Mandatory = $true)][string]$Message)
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -LiteralPath $StartupLog -Value $line
  Write-Host $line
}

function Fail-Startup {
  param([Parameter(Mandatory = $true)][string]$Message)
  Write-StartupLog "HATA: $Message"
  throw $Message
}

function Assert-CommandAvailable {
  param(
    [Parameter(Mandatory = $true)][string]$CommandName,
    [Parameter(Mandatory = $true)][string]$MissingMessage
  )

  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    Fail-Startup $MissingMessage
  }
}

function Get-GitRoot {
  $gitCommand = Get-Command git -ErrorAction Stop
  $gitPath = Split-Path -Path $gitCommand.Source -Parent
  return Split-Path -Path $gitPath -Parent
}

function Get-BashPath {
  $gitRoot = Get-GitRoot
  foreach ($candidate in @(
    (Join-Path $gitRoot "bin\bash.exe"),
    (Join-Path $gitRoot "usr\bin\bash.exe")
  )) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  return $null
}

function Ensure-BashOnPath {
  $bashPath = Get-BashPath
  if (-not $bashPath) {
    Fail-Startup "Git bash bulunamadi. API dev komutu bash gerektiriyor; Git for Windows kurulumu eksik."
  }

  $gitRoot = Get-GitRoot
  $gitBin = Join-Path $gitRoot "bin"
  $gitUsrBin = Join-Path $gitRoot "usr\bin"
  if ($env:Path -notlike "*$gitBin*") {
    $env:Path = "$gitBin;$gitUsrBin;$env:Path"
  }

  Write-StartupLog "Git bash hazir: $bashPath"
  return $bashPath
}

function Ensure-Dependencies {
  Write-StartupLog "Bagimliliklar kontrol ediliyor..."
  foreach ($nodeModulesPath in $NodeModulesPaths) {
    if (-not (Test-Path -LiteralPath $nodeModulesPath)) {
      Fail-Startup "Bagimlilik klasoru eksik: $nodeModulesPath. Once repo kokunde 'pnpm install' calistirin."
    }
  }
  Write-StartupLog "Bagimliliklar hazir."
}

function Get-EnvValueFromFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Name
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }

  $pattern = "^\s*" + [regex]::Escape($Name) + "\s*=\s*(.*)$"
  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) {
      continue
    }

    if ($trimmed -match $pattern) {
      $value = $Matches[1].Trim()
      if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        return $value.Substring(1, $value.Length - 2)
      }
      return $value
    }
  }

  return $null
}

function Get-ConnectorProvider {
  if (-not (Test-Path -LiteralPath $ConnectorEnvPath)) {
    Fail-Startup "apps\connector\.env bulunamadi. apps\connector\.env.example dosyasindan kopyalayin."
  }

  $provider = Get-EnvValueFromFile -Path $ConnectorEnvPath -Name "CONNECTOR_PROVIDER"
  if ([string]::IsNullOrWhiteSpace($provider)) {
    $provider = "chatgpt-web"
  }

  return $provider.Trim()
}

function Assert-ChromiumAvailable {
  Write-StartupLog "Chromium kontrolu yapiliyor..."
  $chromiumPath = & pnpm --filter @trendyol-etsy/connector exec node -e "const { chromium } = require('playwright'); process.stdout.write(chromium.executablePath())"
  if (-not $chromiumPath) {
    Fail-Startup "Playwright Chromium yolu alinamadi. 'pnpm --filter @trendyol-etsy/connector exec playwright install chromium' calistirin."
  }

  if (-not (Test-Path -LiteralPath $chromiumPath)) {
    Fail-Startup "Chromium bulunamadi: $chromiumPath. 'pnpm --filter @trendyol-etsy/connector exec playwright install chromium' calistirin."
  }

  Write-StartupLog "Chromium hazir: $chromiumPath"
}

function Clear-StalePids {
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
        Stop-Process -Id $servicePid -Force -ErrorAction Stop
        Write-StartupLog "Onceki servis kapatildi: $($_.BaseName) (PID $servicePid)"
      } catch {
        Write-StartupLog "Onceki servis zaten kapali: $($_.BaseName) (PID $servicePid)"
      }
    }

    Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
  }
}

function Close-ServiceWindows {
  foreach ($windowTitle in $ServiceWindows) {
    $matchingProcesses = Get-Process -ErrorAction SilentlyContinue | Where-Object {
      $_.MainWindowTitle -and ($_.MainWindowTitle -eq $windowTitle -or $_.MainWindowTitle -like "*$windowTitle*")
    }

    foreach ($process in $matchingProcesses) {
      try {
        Write-StartupLog "Pencere kapatiliyor: $windowTitle (PID $($process.Id))"
        Stop-Process -Id $process.Id -Force -ErrorAction Stop
      } catch {
        Write-StartupLog "Pencere kapatilamadi: $windowTitle (PID $($process.Id))"
      }
    }
  }
}

function Start-ServiceWindow {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][ValidateSet("connector", "api", "web")][string]$ServiceName,
    [Parameter(Mandatory = $true)][string]$PidFile,
    [Parameter(Mandatory = $true)][string]$LogFile
  )

  $serviceScript = @"
`$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath '$ProjectRoot'
`$Host.UI.RawUI.WindowTitle = '$Title'
`$logFile = '$LogFile'

function Write-ServiceLog {
  param([string]`$Message)
  Add-Content -LiteralPath `$logFile -Value ("[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), `$Message)
}

Write-ServiceLog 'Servis komutu baslatiliyor.'

switch ('$ServiceName') {
  'connector' { & pnpm --filter @trendyol-etsy/connector dev 2>&1 | Tee-Object -FilePath `$logFile -Append }
  'api' { & pnpm --filter @trendyol-etsy/api dev 2>&1 | Tee-Object -FilePath `$logFile -Append }
  'web' { & pnpm --filter @trendyol-etsy/web dev 2>&1 | Tee-Object -FilePath `$logFile -Append }
  default { throw 'Bilinmeyen servis.' }
}

`$exitCode = `$LASTEXITCODE
Write-ServiceLog ("Komut sonlandi. Cikis kodu: {0}" -f `$exitCode)
exit `$exitCode
"@

  $encodedScript = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($serviceScript))
  Write-StartupLog "Servis penceresi aciliyor: $Title"

  $process = Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-NoExit",
    "-EncodedCommand",
    $encodedScript
  ) -WorkingDirectory $ProjectRoot -PassThru

  Set-Content -LiteralPath $PidFile -Value $process.Id
  Write-StartupLog "$Title host PID: $($process.Id)"
}

function Wait-HttpEndpoint {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$Label,
    [scriptblock]$Validate = $null,
    [int]$TimeoutSeconds = 180
  )

  Write-StartupLog "Saglik kontrolu bekleniyor: $Url"
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $lastError = $null

  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
        $isValid = $true
        if ($Validate) {
          $isValid = [bool](& $Validate $response)
        }

        if ($isValid) {
          Write-StartupLog "Hazir: $Url"
          return
        }
      }
    } catch {
      $lastError = $_.Exception.Message
    }

    Start-Sleep -Seconds 1
  }

  Fail-Startup "$Label saglik bekleme zaman asimina ugradi: $Url. Son hata: $lastError"
}

function Open-Browser {
  param([Parameter(Mandatory = $true)][string]$Url)

  try {
    Start-Process $Url | Out-Null
    Write-StartupLog "Tarayici acildi: $Url"
  } catch {
    Write-StartupLog "Tarayici acilamadi: $Url"
  }
}

function Main {
  New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
  New-Item -ItemType Directory -Path $PidsDir -Force | Out-Null

  Write-StartupLog "========================================================================"
  Write-StartupLog "Windows dev baslatma basladi"
  Write-StartupLog "========================================================================"
  Write-StartupLog "Proje klasoru: $ProjectRoot"

  Assert-CommandAvailable -CommandName "node" -MissingMessage "Node bulunamadi. Node 22 veya daha yenisi kurulmus olmali."
  Assert-CommandAvailable -CommandName "pnpm" -MissingMessage "pnpm bulunamadi. Corepack/pnpm kurulumu eksik."
  Assert-CommandAvailable -CommandName "git" -MissingMessage "git bulunamadi."

  Ensure-BashOnPath | Out-Null
  Ensure-Dependencies

  Write-StartupLog "Yerel ortam hazirlaniyor..."
  Close-ServiceWindows
  Clear-StalePids

  $connectorProvider = Get-ConnectorProvider
  Write-StartupLog "CONNECTOR_PROVIDER: $connectorProvider"

  if ($connectorProvider -eq "mock") {
    if ($env:ALLOW_MOCK_DESKTOP -ne "1") {
      Fail-Startup "Desktop startup CONNECTOR_PROVIDER=mock ile devam etmeyecek. apps\connector\.env dosyasini chatgpt-web olarak duzeltin ya da ALLOW_MOCK_DESKTOP=1 ile test modunu acik secin."
    }

    Write-StartupLog "UYARI: mock provider test modu icin izinli; Chromium kontrolu atlandi."
  } else {
    Assert-ChromiumAvailable
  }

  Write-StartupLog "Connector baslatiliyor..."
  Start-ServiceWindow -Title "Dropship Connector" -ServiceName "connector" -PidFile (Join-Path $PidsDir "connector.pid") -LogFile $ConnectorLog
  Wait-HttpEndpoint -Url "http://127.0.0.1:4317/health" -Label "Connector" -Validate {
    param($response)
    try {
      ($response.Content | ConvertFrom-Json).status -eq "online"
    } catch {
      $false
    }
  }

  Write-StartupLog "API baslatiliyor..."
  Start-ServiceWindow -Title "Dropship API" -ServiceName "api" -PidFile (Join-Path $PidsDir "api.pid") -LogFile $ApiLog
  Wait-HttpEndpoint -Url "http://127.0.0.1:8787/health" -Label "API" -Validate {
    param($response)
    try {
      ($response.Content | ConvertFrom-Json).ok -eq $true
    } catch {
      $false
    }
  }

  Write-StartupLog "Web baslatiliyor..."
  Start-ServiceWindow -Title "Dropship Web" -ServiceName "web" -PidFile (Join-Path $PidsDir "web.pid") -LogFile $WebLog
  Wait-HttpEndpoint -Url "http://127.0.0.1:5173" -Label "Web"

  Open-Browser -Url "http://127.0.0.1:5173"

  Write-StartupLog "API health: http://127.0.0.1:8787/health"
  Write-StartupLog "Connector health: http://127.0.0.1:4317/health"
  Write-StartupLog "Log klasoru: $LogsDir"
  Write-StartupLog "Windows dev baslatma tamamlandi."
}

try {
  Main
} catch {
  if ($_.Exception.Message) {
    Write-StartupLog "HATA: $($_.Exception.Message)"
  }

  throw
}
