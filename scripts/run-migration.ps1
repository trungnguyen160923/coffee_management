# PowerShell script để chạy database migration trên production
# Usage: .\scripts\run-migration.ps1 -MigrationFile <path> -DatabaseName <name>

param(
    [Parameter(Mandatory=$true)]
    [string]$MigrationFile,
    
    [Parameter(Mandatory=$true)]
    [string]$DatabaseName,
    
    [string]$ContainerName = "coffee-mysql",
    
    [string]$MysqlRootPassword = $env:MYSQL_ROOT_PASSWORD
)

if (-not $MysqlRootPassword) {
    Write-Host "Error: MYSQL_ROOT_PASSWORD environment variable is not set" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $MigrationFile)) {
    Write-Host "Error: Migration file not found: $MigrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Running Migration" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "File: $MigrationFile"
Write-Host "Database: $DatabaseName"
Write-Host "Container: $ContainerName"
Write-Host "==========================================" -ForegroundColor Cyan

# Check if container is running
$containerRunning = docker ps --filter "name=$ContainerName" --format "{{.Names}}"
if (-not $containerRunning) {
    Write-Host "Error: MySQL container '$ContainerName' is not running" -ForegroundColor Red
    exit 1
}

# Create backup before migration
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backup_${DatabaseName}_${timestamp}.sql"
Write-Host "Creating backup: $backupFile" -ForegroundColor Yellow

docker exec $ContainerName mysqldump -u root -p"$MysqlRootPassword" $DatabaseName | Out-File -FilePath $backupFile -Encoding utf8

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Backup created successfully: $backupFile" -ForegroundColor Green
} else {
    Write-Host "✗ Backup failed!" -ForegroundColor Red
    exit 1
}

# Run migration
Write-Host "Running migration..." -ForegroundColor Yellow
Get-Content $MigrationFile | docker exec -i $ContainerName mysql -u root -p"$MysqlRootPassword" $DatabaseName

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Migration completed successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Migration failed!" -ForegroundColor Red
    Write-Host "You can restore from backup: $backupFile" -ForegroundColor Yellow
    exit 1
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Migration completed successfully!" -ForegroundColor Green
Write-Host "Backup saved at: $backupFile" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan

