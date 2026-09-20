$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

docker compose down
if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose failed to stop MediaWall."
}

Write-Host "MediaWall stopped. Database and uploads were preserved."
