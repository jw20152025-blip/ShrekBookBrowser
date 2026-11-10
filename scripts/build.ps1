$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path node_modules)) { & .\scripts\setup.ps1 }
Write-Host "Building Windows installer + portable build..." -ForegroundColor Cyan
npm run build
Write-Host "Builds are in .\dist" -ForegroundColor Green
