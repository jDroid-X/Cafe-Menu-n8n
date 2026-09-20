# ==========================================================
# WhatsApp Restaurant AI Agent - Clean Demo Process Stopper
# Protects any process running on port 5678 (Existing n8n)
# ==========================================================

Write-Host "Checking for demo processes on port 3585 and 5679..." -ForegroundColor Cyan

# Stop Web Server on port 3585 if running
$port3585 = Get-NetTCPConnection -LocalPort 3585 -ErrorAction SilentlyContinue
if ($port3585) {
    $pid3585 = $port3585.OwningProcess
    Write-Host "Stopping Web Server PID $pid3585 on port 3585..." -ForegroundColor Yellow
    Stop-Process -Id $pid3585 -Force -ErrorAction SilentlyContinue
}

# Stop isolated demo n8n on port 5679 if running
$port5679 = Get-NetTCPConnection -LocalPort 5679 -ErrorAction SilentlyContinue
if ($port5679) {
    $pid5679 = $port5679.OwningProcess
    Write-Host "Stopping Demo n8n PID $pid5679 on port 5679..." -ForegroundColor Yellow
    Stop-Process -Id $pid5679 -Force -ErrorAction SilentlyContinue
}

Write-Host "Demo shutdown complete. Port 5678 (Production/Existing n8n) remained untouched." -ForegroundColor Green
