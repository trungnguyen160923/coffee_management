# PowerShell script to test build all Docker images
# Usage: .\scripts\test-build.ps1 [service-name]

param(
    [string]$ServiceName = ""
)

$ErrorActionPreference = "Stop"

# Services to build
$Services = @(
    @{Name="api-gateway"; Port=8000},
    @{Name="auth"; Port=8001},
    @{Name="catalog-service"; Port=8004},
    @{Name="order-service"; Port=8002},
    @{Name="profile-service"; Port=8003},
    @{Name="notification-service"; Port=8006}
)

function Test-BuildService {
    param(
        [string]$ServiceDir,
        [int]$Port
    )
    
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "Testing build: $ServiceDir" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    
    if (-not (Test-Path $ServiceDir)) {
        Write-Host "✗ Error: Directory $ServiceDir not found" -ForegroundColor Red
        return $false
    }
    
    if (-not (Test-Path "$ServiceDir\Dockerfile")) {
        Write-Host "✗ Error: Dockerfile not found in $ServiceDir" -ForegroundColor Red
        return $false
    }
    
    $originalLocation = Get-Location
    Push-Location $ServiceDir
    
    try {
        Write-Host "Building Docker image..." -ForegroundColor Cyan
        
        $logFile = Join-Path $originalLocation "build-$ServiceDir.log"
        $imageTag = "${ServiceDir}:test"
        
        # Run docker build and capture output properly
        $process = Start-Process -FilePath "docker" -ArgumentList "build", "-t", $imageTag, "." -NoNewWindow -Wait -PassThru -RedirectStandardOutput $logFile -RedirectStandardError "$logFile.error"
        
        # Display last few lines of output
        if (Test-Path $logFile) {
            $lastLines = Get-Content $logFile -Tail 5
            $lastLines | ForEach-Object { Write-Host $_ }
        }
        
        if ($process.ExitCode -eq 0) {
            Write-Host "✓ Build successful for $ServiceDir" -ForegroundColor Green
            
            # Check image exists
            $checkOutput = & docker image inspect $imageTag 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Image ${ServiceDir}:test created" -ForegroundColor Green
                
                # Get image size (simplified)
                Write-Host "  Image created successfully" -ForegroundColor Green
                
                Write-Host "✓ Container build test passed" -ForegroundColor Green
                return $true
            } else {
                Write-Host "✗ Error: Image not found after build" -ForegroundColor Red
                Pop-Location
                return $false
            }
        } else {
            Write-Host "✗ Build failed for $ServiceDir (Exit code: $($process.ExitCode))" -ForegroundColor Red
            Write-Host "  Check log: $logFile" -ForegroundColor Red
            if (Test-Path "$logFile.error") {
                Write-Host "  Error output:" -ForegroundColor Red
                Get-Content "$logFile.error" -Tail 10 | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
            }
            Pop-Location
            return $false
        }
    } catch {
        Write-Host "✗ Error during build: $_" -ForegroundColor Red
        Pop-Location
        return $false
    } finally {
        if ((Get-Location).Path -ne $originalLocation.Path) {
            Pop-Location
        }
    }
}

# Check Docker Desktop is running
Write-Host "Checking Docker Desktop..." -ForegroundColor Cyan

# Try multiple times with delay
$maxRetries = 3
$retryDelay = 2
$dockerReady = $false

for ($i = 1; $i -le $maxRetries; $i++) {
    try {
        $dockerCheck = docker ps 2>&1
        if ($LASTEXITCODE -eq 0) {
            $dockerReady = $true
            break
        }
    } catch {
        # Continue to retry
    }
    
    if ($i -lt $maxRetries) {
        Write-Host "  Retry $i/$maxRetries... (waiting $retryDelay seconds)" -ForegroundColor Yellow
        Start-Sleep -Seconds $retryDelay
    }
}

if (-not $dockerReady) {
    Write-Host "✗ Docker Desktop is not running or not ready!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Make sure Docker Desktop is fully started (icon should be solid, not animating)" -ForegroundColor White
    Write-Host "2. Wait 30-60 seconds after opening Docker Desktop" -ForegroundColor White
    Write-Host "3. Run diagnostic: scripts\check-docker.bat" -ForegroundColor White
    Write-Host "4. Or try: scripts\ensure-docker-running.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✓ Docker Desktop is running" -ForegroundColor Green
Write-Host ""

# Main execution
if ([string]::IsNullOrEmpty($ServiceName)) {
    # Test all services
    Write-Host "Testing build for all services...`n" -ForegroundColor Yellow
    
    $failed = 0
    $passed = 0
    
    foreach ($service in $Services) {
        if (Test-BuildService -ServiceDir $service.Name -Port $service.Port) {
            $passed++
        } else {
            $failed++
        }
        Write-Host ""
    }
    
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "Summary:" -ForegroundColor Yellow
    Write-Host "Passed: $passed" -ForegroundColor Green
    Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
    Write-Host "========================================" -ForegroundColor Yellow
    
    if ($failed -eq 0) {
        Write-Host "All builds successful! ✓" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "Some builds failed. Check logs above." -ForegroundColor Red
        exit 1
    }
} else {
    # Test single service
    $service = $Services | Where-Object { $_.Name -eq $ServiceName }
    
    if ($null -eq $service) {
        Write-Host "Error: Service '$ServiceName' not found" -ForegroundColor Red
        Write-Host "Available services:"
        foreach ($s in $Services) {
            Write-Host "  - $($s.Name)"
        }
        exit 1
    }
    
    if (Test-BuildService -ServiceDir $service.Name -Port $service.Port) {
        exit 0
    } else {
        exit 1
    }
}

