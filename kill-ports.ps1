# Kill all application development ports
$ports = 3000, 3001, 3002, 3106, 3200, 3201, 3202, 3203

Write-Host "Killing processes on ports: $($ports -join ', ')" -ForegroundColor Yellow

foreach($port in $ports) {
  $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
  if ($connections) {
    Write-Host "Found process(es) on port ${port}:" -ForegroundColor Red
    $connections | ForEach-Object {
      try {
        $process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
          Write-Host "  Stopping process $($process.Id) ($($process.ProcessName)) on port ${port}" -ForegroundColor Red
          Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
      } catch {
        Write-Host "  Could not stop process on port ${port} (may already be stopped)" -ForegroundColor Yellow
      }
    }
  } else {
    Write-Host "No process found on port ${port}" -ForegroundColor Green
  }
}

Write-Host "Port cleanup completed." -ForegroundColor Green