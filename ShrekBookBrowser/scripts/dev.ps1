$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not (Test-Path node_modules)) { & .\scripts\setup.ps1 }

Write-Host "Starting ShrekSearch index service..." -ForegroundColor Cyan
$search = Start-Process -FilePath node -ArgumentList 'search/server.js' -WorkingDirectory (Get-Location) -PassThru -WindowStyle Hidden
try {
  Write-Host "Starting ShrekBook Browser..." -ForegroundColor Green
  npm run dev
}
finally {
  if ($search -and -not $search.HasExited) { Stop-Process -Id $search.Id -Force -ErrorAction SilentlyContinue }
}
