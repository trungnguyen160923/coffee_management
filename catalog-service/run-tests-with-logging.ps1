# PowerShell script to run tests with detailed logging
# Usage: .\run-tests-with-logging.ps1 [TestClass]

param(
    [string]$TestClass = "*"
)

# Create log directory if it doesn't exist
$logDir = "target\test-logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    Write-Host "Created log directory: $logDir" -ForegroundColor Green
} else {
    # Clean old log files before running tests
    $oldLogs = Get-ChildItem -Path $logDir -Filter "*.log" -ErrorAction SilentlyContinue
    if ($oldLogs) {
        $oldLogs | Remove-Item -Force
        Write-Host "Cleaned $($oldLogs.Count) old log file(s)" -ForegroundColor Yellow
    }
}

# Generate timestamp for log file
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logFile = "$logDir\test-run-$timestamp.log"
$errorLogFile = "$logDir\test-errors-$timestamp.log"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Running Tests with Logging" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Class: $TestClass" -ForegroundColor Yellow
Write-Host "Log File: $logFile" -ForegroundColor Yellow
Write-Host "Error Log: $errorLogFile" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Run tests and capture output
# Note: Logback is Spring Boot default, so logback-test.xml will be used automatically
if ($TestClass -eq "*") {
    Write-Host "Running all tests..." -ForegroundColor Green
    & .\mvnw.cmd test "-Dtest=$TestClass" 2>&1 | Tee-Object -FilePath $logFile
} else {
    Write-Host "Running tests: $TestClass" -ForegroundColor Green
    & .\mvnw.cmd test "-Dtest=$TestClass" 2>&1 | Tee-Object -FilePath $logFile
}

# Extract errors from log file
# Exclude false positives like "Errors: 0" or "No errors" - only match actual errors
$errorLines = Get-Content $logFile | Select-String -Pattern "\[ERROR\]|FAILURE|Exception|Error:" -Context 5,5 | 
    Where-Object { $_.Line -notmatch "Errors:\s*0|No errors|No Errors" }
if ($errorLines) {
    $errorLines | Out-File -FilePath $errorLogFile -Encoding UTF8
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Errors found! Check: $errorLogFile" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "No errors found in test run!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    # Delete error log file if no errors found
    if (Test-Path $errorLogFile) {
        Remove-Item $errorLogFile -Force
    }
}

Write-Host ""
Write-Host "Full log: $logFile" -ForegroundColor Cyan
Write-Host "Error log: $errorLogFile" -ForegroundColor Cyan
Write-Host "Test reports: target\surefire-reports" -ForegroundColor Cyan

