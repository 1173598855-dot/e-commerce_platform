param(
  [switch]$Full,
  [switch]$AndroidRelease
)

$ErrorActionPreference = 'Stop'

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$Command
  )

  Write-Host "`n==> $Name" -ForegroundColor Cyan
  & $Command
}

function Test-CommandExists {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Test-CommandExists 'node')) {
  throw 'Node.js is required for quality checks.'
}

if (-not (Test-CommandExists 'npm')) {
  throw 'npm is required for quality checks.'
}

Invoke-Step 'Docker Compose config' {
  docker compose config | Out-Null
}

Invoke-Step 'Frontend Android JS bundle' {
  Push-Location "$repoRoot/frontend"
  try {
    npm run bundle:android
  } finally {
    Pop-Location
  }
}

Invoke-Step 'Backend microservices node tests' {
  Push-Location "$repoRoot/backend/microservices"
  try {
    npm run test:node
  } finally {
    Pop-Location
  }
}

if (Test-Path "$repoRoot/frontend/node_modules/.bin/eslint.cmd") {
  Invoke-Step 'Frontend lint' {
    Push-Location "$repoRoot/frontend"
    try {
      npm run lint
    } finally {
      Pop-Location
    }
  }
} else {
  Write-Host "`nSKIP Frontend lint: eslint is not installed in frontend/node_modules." -ForegroundColor Yellow
}

$keystoreProps = "$repoRoot/frontend/android/keystore.properties"
if ($AndroidRelease -or ($Full -and (Test-Path $keystoreProps))) {
  Invoke-Step 'Android release build' {
    Push-Location "$repoRoot/frontend/android"
    try {
      ./gradlew.bat assembleRelease
    } finally {
      Pop-Location
    }
  }
} else {
  Write-Host "`nSKIP Android release build: provide frontend/android/keystore.properties or pass -AndroidRelease to verify signing failure." -ForegroundColor Yellow
}

Write-Host "`nQuality check finished." -ForegroundColor Green
