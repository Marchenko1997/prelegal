Set-Location (Split-Path $MyInvocation.MyCommand.Path)
Set-Location ..
docker compose up -d --build
Write-Host "Prelegal running at http://localhost:8000"
