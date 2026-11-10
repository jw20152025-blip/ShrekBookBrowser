$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
if (-not $env:GH_TOKEN) { throw 'Set GH_TOKEN before publishing a GitHub release.' }
if (-not (Test-Path node_modules)) { & .\scripts\setup.ps1 }
Write-Host "Publishing ShrekBook Browser release..." -ForegroundColor Cyan
npx electron-builder --win nsis --publish always
