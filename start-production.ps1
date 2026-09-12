# Starts the three Be Real Humanitarian apps the way they run in production
# (optimized Next.js builds + the API without nodemon), on this PC.
#
#   .\start-production.ps1            # build if needed, then start
#   .\start-production.ps1 -Rebuild   # force a fresh build of both Next apps
#   .\stop-production.ps1             # stop everything started here
#
# Profile "staging": NODE_ENV=staging on the API keeps two dev conveniences
# that real production must NOT have — emails are printed to the API log when
# RESEND_API_KEY is empty, and donations run through the simulated checkout
# when the Stripe keys are empty. Everything else is production behaviour.
#
# Logs: .prod-api.log, .prod-web.log, .prod-backoffice.log (project root).
param([switch]$Rebuild)

$root = $PSScriptRoot
$ErrorActionPreference = "Stop"

function Build-App($name) {
  $dir = Join-Path $root $name
  if ($Rebuild -or -not (Test-Path (Join-Path $dir ".next\BUILD_ID"))) {
    Write-Host "Building $name for production..." -ForegroundColor Cyan
    Push-Location $dir
    try { npm run build; if ($LASTEXITCODE -ne 0) { throw "$name build failed" } } finally { Pop-Location }
  } else {
    Write-Host "${name}: existing production build found (use -Rebuild to refresh)." -ForegroundColor DarkGray
  }
}

function Start-App($name, $workdir, $command, $log, $pidFile) {
  $p = Start-Process -FilePath "cmd.exe" -ArgumentList "/c $command > `"$log`" 2>&1" -WorkingDirectory $workdir -PassThru -WindowStyle Hidden
  $p.Id | Set-Content $pidFile
  Write-Host "$name started (pid $($p.Id)) -> $log" -ForegroundColor Green
}

Build-App "frontend"
Build-App "backoffice"

Start-App "API (:4000)" (Join-Path $root "backend") "set NODE_ENV=staging&& node server.js" (Join-Path $root ".prod-api.log") (Join-Path $root ".prod-api.pid")
Start-App "Website (:3000)" (Join-Path $root "frontend") "set NODE_ENV=production&& npx next start -p 3000" (Join-Path $root ".prod-web.log") (Join-Path $root ".prod-web.pid")
Start-App "Backoffice (:3001)" (Join-Path $root "backoffice") "set NODE_ENV=production&& npx next start -p 3001" (Join-Path $root ".prod-backoffice.log") (Join-Path $root ".prod-backoffice.pid")

Write-Host ""
Write-Host "Website:    http://localhost:3000"
Write-Host "Backoffice: http://localhost:3001"
Write-Host "API:        http://localhost:4000/health"
Write-Host "Give them ~15 s to come up. Emails and receipts appear in .prod-api.log (and in Backoffice > System > Email log)."
