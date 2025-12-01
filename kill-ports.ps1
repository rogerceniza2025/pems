foreach ($port in 3000, 3001, 3002, 6006 ) { 
  Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | 
  ForEach-Object { 
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue 
  } 
}