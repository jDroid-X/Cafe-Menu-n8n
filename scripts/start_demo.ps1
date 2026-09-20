# ==========================================================
# WhatsApp Restaurant AI Agent - PowerShell Launcher
# ==========================================================

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$scriptPath\.."

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Starting WhatsApp Restaurant Menu AI Agent (Demo v0.1)" -ForegroundColor Cyan
Write-Host "Web Console: http://localhost:3585" -ForegroundColor Yellow
Write-Host "Isolated n8n Port: 5679" -ForegroundColor Magenta
Write-Host "==========================================================" -ForegroundColor Green

node server.js
