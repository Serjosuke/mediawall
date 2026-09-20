$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $keyBytes = New-Object byte[] 32
    $passwordBytes = New-Object byte[] 24
    $rng.GetBytes($keyBytes)
    $rng.GetBytes($passwordBytes)
    $rng.Dispose()
    $key = [Convert]::ToBase64String($keyBytes)
    $password = [BitConverter]::ToString($passwordBytes).Replace("-", "").ToLowerInvariant()
    $content = "APP_KEY=base64:$key`nDB_PASSWORD=$password`n"
    [System.IO.File]::WriteAllText($envFile, $content, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "Created local .env with random credentials."
}

$dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
$dockerExe = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
$dockerDesktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"

if ($dockerCommand) {
    $dockerPath = $dockerCommand.Source
} elseif (Test-Path $dockerExe) {
    $dockerPath = $dockerExe
} else {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "Docker Desktop is not installed and winget is not available. Install Docker Desktop and rerun start.ps1."
    }
    Write-Host "Installing Docker Desktop using winget. An administrator prompt may appear."
    winget install --id Docker.DockerDesktop --exact --source winget --accept-package-agreements --accept-source-agreements
    if (-not (Test-Path $dockerExe)) {
        throw "Docker Desktop installation needs attention or a Windows restart. Complete its setup and rerun start.ps1."
    }
    $dockerPath = $dockerExe
}

function Test-Docker {
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & $dockerPath info --format '{{.ServerVersion}}' *> $null
        return ($LASTEXITCODE -eq 0)
    } finally {
        $ErrorActionPreference = $previousPreference
    }
}

if (-not (Test-Docker)) {
    if (Test-Path $dockerDesktop) {
        Write-Host "Starting Docker Desktop..."
        if (-not (Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue)) {
            Start-Process -FilePath $dockerDesktop
        }
    }
    for ($i = 0; $i -lt 90; $i++) {
        if (Test-Docker) { break }
        Start-Sleep -Seconds 2
    }
}

if (-not (Test-Docker)) {
    throw "Docker Engine is unavailable. Finish Docker Desktop onboarding, ensure WSL 2 and virtualization are enabled, restart Windows if prompted, then rerun start.ps1."
}

Write-Host "Building MediaWall images..."
& $dockerPath compose --progress plain build backend frontend
if ($LASTEXITCODE -ne 0) {
    throw "Docker image build failed. The Composer or npm error is displayed above. To save the full output, run: docker compose --progress plain build --no-cache backend *> backend-build.log"
}

Write-Host "Starting MediaWall containers..."
& $dockerPath compose up --no-build -d
if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose failed to start containers. Run: docker compose logs --tail=100"
}

$ready = $false
for ($i = 0; $i -lt 120; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:3000" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            $apiResponse = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/media" -UseBasicParsing -TimeoutSec 5
            if ($apiResponse.StatusCode -eq 200) {
                $ready = $true
                break
            }
        }
    } catch {
        Start-Sleep -Seconds 2
    }
}

if (-not $ready) {
    throw "Containers were started but the website is not ready. Check: docker compose logs --tail=100"
}

Write-Host "MediaWall is ready: http://localhost:3000"
Start-Process "http://localhost:3000"
