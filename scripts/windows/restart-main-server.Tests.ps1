$RestartMainServerSkipMain = $true
$scriptPath = Join-Path $PSScriptRoot "restart-main-server.ps1"
. $scriptPath

Describe "restart-main-server Local mode" {
  It "starts wrangler + dev web on the existing local ports and returns a runtime summary" {
    Mock Start-Process {}
    Mock Wait-HttpEndpoint {}
    Mock Wait-NgrokPublicUrl { "https://local.ngrok.app" }

    $result = Start-ServiceWindows -ResolvedRepoPath "C:\dropshiping-win" -BashExecutable "C:\Program Files\Git\bin\bash.exe"

    $result.Mode | Should Be "Local"
    $result.WebLocalUrl | Should Be "http://127.0.0.1:5173"
    $result.ApiHealthUrl | Should Be "http://127.0.0.1:8787/health"
    $result.PublicUrl | Should Be "https://local.ngrok.app"

    Assert-MockCalled Wait-HttpEndpoint -Times 1 -ParameterFilter {
      $Label -eq "API" -and $Url -eq "http://127.0.0.1:8787/health"
    }

    Assert-MockCalled Wait-HttpEndpoint -Times 1 -ParameterFilter {
      $Label -eq "WEB" -and $Url -eq "http://127.0.0.1:5173"
    }

    Assert-MockCalled Start-Process -Times 1 -ParameterFilter {
      $FilePath -eq "cmd.exe" -and $ArgumentList[1] -like "*pnpm.cmd dev:web*"
    }

    Assert-MockCalled Start-Process -Times 1 -ParameterFilter {
      $FilePath -eq "cmd.exe" -and $ArgumentList[1] -like "*ngrok http 5173*"
    }
  }
}

Describe "restart-main-server Cloud mode" {
  It "builds the web app against the cloud URL and serves preview on 4174" {
    Mock Start-Process {}
    Mock Wait-HttpEndpoint {}
    Mock Wait-NgrokPublicUrl { "https://cloud.ngrok.app" }

    $result = Start-ServiceWindowsCloud -ResolvedRepoPath "C:\dropshiping-win" -ResolvedCloudApiBaseUrl "https://trendyol-etsy-api.workers.dev"

    $result.Mode | Should Be "Cloud"
    $result.WebLocalUrl | Should Be "http://127.0.0.1:4174"
    $result.ApiHealthUrl | Should Be "https://trendyol-etsy-api.workers.dev/health"
    $result.PublicUrl | Should Be "https://cloud.ngrok.app"

    Assert-MockCalled Wait-HttpEndpoint -Times 1 -ParameterFilter {
      $Label -eq "Cloud API" -and $Url -eq "https://trendyol-etsy-api.workers.dev/health"
    }

    Assert-MockCalled Wait-HttpEndpoint -Times 1 -ParameterFilter {
      $Label -eq "WEB Preview" -and $Url -eq "http://127.0.0.1:4174"
    }

    Assert-MockCalled Start-Process -Times 1 -ParameterFilter {
      $FilePath -eq "cmd.exe" -and
      $ArgumentList[1] -like '*set "VITE_API_BASE_URL=https://trendyol-etsy-api.workers.dev"*pnpm.cmd --filter @trendyol-etsy/web build*pnpm.cmd --filter @trendyol-etsy/web exec vite preview --host 0.0.0.0 --port 4174 --strictPort*'
    }

    Assert-MockCalled Start-Process -Times 1 -ParameterFilter {
      $FilePath -eq "cmd.exe" -and $ArgumentList[1] -like "*ngrok http 4174*"
    }
  }

  It "fails before ngrok when preview never becomes healthy" {
    Mock Start-Process {}

    $script:WaitHttpEndpointCallCount = 0

    function Wait-HttpEndpoint {
      param(
        [string]$Label,
        [string]$Url,
        [int]$TimeoutSeconds = 120
      )

      $script:WaitHttpEndpointCallCount++
      if ($script:WaitHttpEndpointCallCount -eq 2) {
        throw "WEB Preview hazir olmadi"
      }
    }

    function Wait-NgrokPublicUrl {
      throw "ngrok should not start"
    }

    { Start-ServiceWindowsCloud -ResolvedRepoPath "C:\dropshiping-win" -ResolvedCloudApiBaseUrl "https://trendyol-etsy-api.workers.dev" } | Should Throw

    Assert-MockCalled Start-Process -Times 0 -Scope It -ParameterFilter {
      $FilePath -eq "cmd.exe" -and $ArgumentList[1] -like "*ngrok http 4174*"
    }
  }
}

Describe "restart-main-server summary" {
  It "writes commit, mode, local URL, api health and ngrok URL" {
    Mock Write-Log {}

    Write-RestartSummary -HeadCommit "abc1234" -Runtime ([pscustomobject]@{
      Mode = "Cloud"
      WebLocalUrl = "http://127.0.0.1:4174"
      ApiHealthUrl = "https://trendyol-etsy-api.workers.dev/health"
      PublicUrl = "https://cloud.ngrok.app"
    })

    Assert-MockCalled Write-Log -Times 1 -ParameterFilter { $Message -eq "Tamamlandi. Aktif commit: abc1234" }
    Assert-MockCalled Write-Log -Times 1 -ParameterFilter { $Message -eq "Calisma modu: Cloud" }
    Assert-MockCalled Write-Log -Times 1 -ParameterFilter { $Message -eq "Web local: http://127.0.0.1:4174" }
    Assert-MockCalled Write-Log -Times 1 -ParameterFilter { $Message -eq "API health: https://trendyol-etsy-api.workers.dev/health" }
    Assert-MockCalled Write-Log -Times 1 -ParameterFilter { $Message -eq "ngrok public URL: https://cloud.ngrok.app" }
  }
}
