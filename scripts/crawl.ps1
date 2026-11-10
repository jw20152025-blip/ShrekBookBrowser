$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path node_modules)) { & .\scripts\setup.ps1 }
npm run search:crawl
