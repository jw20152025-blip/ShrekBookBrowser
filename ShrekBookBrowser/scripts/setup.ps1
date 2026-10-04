$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "== ShrekBook Browser setup ==" -ForegroundColor Green

$node = Get-Command node -ErrorAction SilentlyContinue
$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $node -or -not $npm) {
  throw "Node.js and npm are required. Install a current Node.js LTS release, then run this script again."
}

node --version
npm --version
Write-Host "Installing dependencies..." -ForegroundColor Cyan
if (Test-Path package-lock.json) { npm ci } else { npm install }

if (-not (Test-Path search\index.json)) {
  '{"generatedAt":null,"count":0,"pages":[]}' | Set-Content search\index.json -Encoding UTF8
}

Write-Host "Setup complete." -ForegroundColor Green
Write-Host "Run .\scripts\dev.ps1 to start the browser." -ForegroundColor Yellow
