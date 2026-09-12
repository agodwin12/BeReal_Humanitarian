# Stops the processes started by start-production.ps1.
$root = $PSScriptRoot
foreach ($pidFile in @(".prod-api.pid", ".prod-web.pid", ".prod-backoffice.pid")) {
  $path = Join-Path $root $pidFile
  if (Test-Path $path) {
    $procId = Get-Content $path
    if ($procId) { taskkill /PID $procId /T /F 2>$null | Out-Null; Write-Host "stopped $pidFile (pid $procId)" }
    Remove-Item $path -ErrorAction SilentlyContinue
  }
}
# Anything still holding the three ports (e.g. after a crash).
foreach ($port in 3000, 3001, 4000) {
  $lines = netstat -ano | Select-String ":$port .*LISTENING"
  foreach ($line in $lines) {
    $procId = ($line -split "\s+")[-1]
    if ($procId -match "^\d+$") { taskkill /PID $procId /T /F 2>$null | Out-Null; Write-Host "freed port $port (pid $procId)" }
  }
}
Write-Host "done"
