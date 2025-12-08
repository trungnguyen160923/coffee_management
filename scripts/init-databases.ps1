# PowerShell script để khởi tạo databases từ SQL files
# Usage: .\scripts\init-databases.ps1

param(
    [string]$ContainerName = "coffee-mysql",
    [string]$MysqlRootPassword = $env:MYSQL_ROOT_PASSWORD,
    [string]$SqlDir = "sql",
    [string]$ProjectDir = "/opt/coffee-management"
)

if (-not $MysqlRootPassword) {
    Write-Host "Error: MYSQL_ROOT_PASSWORD environment variable is not set" -ForegroundColor Red
    Write-Host "Please set it: `$env:MYSQL_ROOT_PASSWORD = 'your_password'" -ForegroundColor Yellow
    exit 1
}

$sqlPath = if (Test-Path $SqlDir) { $SqlDir } else { Join-Path $ProjectDir $SqlDir }

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Initializing Databases from SQL Files" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Container: $ContainerName"
Write-Host "SQL Directory: $sqlPath"
Write-Host "==========================================" -ForegroundColor Cyan

# Check if container is running
$containerRunning = docker ps --filter "name=$ContainerName" --format "{{.Names}}"
if (-not $containerRunning) {
    Write-Host "Error: MySQL container '$ContainerName' is not running" -ForegroundColor Red
    Write-Host "Please start MySQL container first:" -ForegroundColor Yellow
    Write-Host "  docker compose -f docker-compose.prod.yml up -d mysql" -ForegroundColor Yellow
    exit 1
}

# Wait for MySQL to be ready
Write-Host "Waiting for MySQL to be ready..." -ForegroundColor Yellow
for ($i = 1; $i -le 30; $i++) {
    $result = docker exec $ContainerName mysqladmin ping -h localhost -u root -p"$MysqlRootPassword" --silent 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ MySQL is ready" -ForegroundColor Green
        break
    }
    if ($i -eq 30) {
        Write-Host "✗ MySQL is not ready after 30 attempts" -ForegroundColor Red
        exit 1
    }
    Write-Host "  Attempt $i/30..." -ForegroundColor Gray
    Start-Sleep -Seconds 2
}

# Function to initialize database
function Init-Database {
    param(
        [string]$SqlFile,
        [string]$DbName
    )
    
    if (-not (Test-Path $SqlFile)) {
        Write-Host "⚠ Warning: SQL file not found: $SqlFile" -ForegroundColor Yellow
        return $false
    }
    
    Write-Host ""
    Write-Host "Initializing database: $DbName" -ForegroundColor Cyan
    Write-Host "  SQL file: $SqlFile"
    
    # Check if database already exists
    $dbExists = docker exec $ContainerName mysql -u root -p"$MysqlRootPassword" -e "SHOW DATABASES LIKE '$DbName';" 2>$null | Select-String -Pattern $DbName
    
    if ($dbExists) {
        Write-Host "  ⚠ Database '$DbName' already exists" -ForegroundColor Yellow
        $response = Read-Host "  Do you want to DROP and recreate it? (yes/no)"
        if ($response -notmatch "^[Yy][Ee][Ss]$") {
            Write-Host "  ⏭ Skipping $DbName" -ForegroundColor Gray
            return $true
        }
        Write-Host "  🗑 Dropping existing database..." -ForegroundColor Yellow
        docker exec $ContainerName mysql -u root -p"$MysqlRootPassword" -e "DROP DATABASE IF EXISTS $DbName;" | Out-Null
    }
    
    # Create database and import SQL
    Write-Host "  📥 Importing SQL file..." -ForegroundColor Yellow
    Get-Content $SqlFile | docker exec -i $ContainerName mysql -u root -p"$MysqlRootPassword"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Database '$DbName' initialized successfully" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ✗ Failed to initialize database '$DbName'" -ForegroundColor Red
        return $false
    }
}

# Initialize all databases
Write-Host ""
Write-Host "Starting database initialization..." -ForegroundColor Cyan
Write-Host ""

$databases = @{
    "$sqlPath/auth_db.sql" = "auth_db"
    "$sqlPath/profile_db.sql" = "profile_db"
    "$sqlPath/order_db.sql" = "order_db"
    "$sqlPath/catalog_db.sql" = "catalog_db"
    "$sqlPath/notification_db.sql" = "notification_db"
}

# Optional: analytics_db
if (Test-Path "$sqlPath/analytics_db.sql") {
    $databases["$sqlPath/analytics_db.sql"] = "analytics_db"
}

$failed = 0
foreach ($sqlFile in $databases.Keys) {
    $dbName = $databases[$sqlFile]
    if (-not (Init-Database -SqlFile $sqlFile -DbName $dbName)) {
        $failed++
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
if ($failed -eq 0) {
    Write-Host "✓ All databases initialized successfully!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Start all services: docker compose -f docker-compose.prod.yml up -d"
    Write-Host "2. Check services health: docker compose -f docker-compose.prod.yml ps"
    Write-Host ""
} else {
    Write-Host "✗ Some databases failed to initialize ($failed failed)" -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Cyan
    exit 1
}

