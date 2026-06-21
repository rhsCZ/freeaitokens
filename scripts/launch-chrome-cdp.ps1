[CmdletBinding()]
param(
  [string]$ChromePath,

  [ValidateRange(1, 65535)]
  [int]$Port = 9222,

  [string]$ProfileDir = "",

  [string[]]$StartUrl = @("https://chatgpt.com/", "https://gemini.google.com/"),

  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDirectory = if ($PSScriptRoot) {
  $PSScriptRoot
} else {
  Split-Path -Parent $MyInvocation.MyCommand.Path
}

$projectRoot = Split-Path -Parent $scriptDirectory

if (-not $ProfileDir) {
  $ProfileDir = Join-Path $projectRoot ".playwright\chrome-cdp-profile"
}

function Resolve-ChromeExecutable {
  param(
    [string]$ProvidedPath
  )

  if ($ProvidedPath) {
    $resolvedPath = Resolve-Path -LiteralPath $ProvidedPath -ErrorAction Stop
    return $resolvedPath.Path
  }

  $baseDirectories = @(
    $env:ProgramFiles,
    ${env:ProgramFiles(x86)},
    $env:LocalAppData
  ) | Where-Object { $_ }

  foreach ($baseDirectory in $baseDirectories) {
    $candidate = Join-Path $baseDirectory "Google\Chrome\Application\chrome.exe"

    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  throw "Could not find chrome.exe automatically. Pass -ChromePath to specify the executable explicitly."
}

function Resolve-ProfileDirectory {
  param(
    [string]$RequestedPath
  )

  if (-not [System.IO.Path]::IsPathRooted($RequestedPath)) {
    $RequestedPath = Join-Path (Get-Location) $RequestedPath
  }

  New-Item -ItemType Directory -Force -Path $RequestedPath | Out-Null
  return (Resolve-Path -LiteralPath $RequestedPath -ErrorAction Stop).Path
}

$resolvedChromePath = Resolve-ChromeExecutable -ProvidedPath $ChromePath
$resolvedProfileDir = Resolve-ProfileDirectory -RequestedPath $ProfileDir
$cdpEndpoint = "http://127.0.0.1:$Port"

$chromeArguments = @(
  "--remote-debugging-port=$Port",
  "--user-data-dir=`"$resolvedProfileDir`"",
  "--no-first-run",
  "--no-default-browser-check"
)

if ($StartUrl) {
  $chromeArguments += $StartUrl
}

Write-Host "Launching Chrome with remote debugging enabled..."
Write-Host "  ChromePath : $resolvedChromePath"
Write-Host "  ProfileDir : $resolvedProfileDir"
Write-Host "  CDP URL    : $cdpEndpoint"
Write-Host ""

if ($DryRun) {
  Write-Host "Dry run only. Chrome was not started."
} else {
  Start-Process -FilePath $resolvedChromePath -ArgumentList $chromeArguments | Out-Null
  Write-Host "Chrome launch requested."
}

Write-Host ""
Write-Host "Attach from PowerShell with:"
Write-Host "  `$env:CDP_ENDPOINT_URL = `"$cdpEndpoint`""
Write-Host "  `$env:CDP_TAB_MODE = `"new`""
Write-Host "  node examples/chatgpt-web-session.js `"Hello`""
Write-Host ""
Write-Host "To use a different dedicated profile next time:"
Write-Host "  .\scripts\launch-chrome-cdp.ps1 -ProfileDir .playwright\another-profile -Port 9333"
