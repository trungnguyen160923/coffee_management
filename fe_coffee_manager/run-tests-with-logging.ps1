# PowerShell script to run frontend tests with detailed logging
# Usage: 
#   .\run-tests-with-logging.ps1                          # Chạy tất cả tests (npm test)
#   .\run-tests-with-logging.ps1 -Mode ui                 # Chạy tests với UI (npm run test:ui)
#   .\run-tests-with-logging.ps1 -Mode coverage           # Chạy tests với coverage (npm run test:coverage)
#   .\run-tests-with-logging.ps1 GoodsReceiptModal        # Chạy test cụ thể (npm test)
#   .\run-tests-with-logging.ps1 -Mode ui GoodsReceiptModal  # Chạy test cụ thể với UI

param(
    [ValidateSet("test", "ui", "coverage")]
    [string]$Mode = "test",
    [string]$TestPattern = ""
)

# Create log directory if it doesn't exist
$logDir = "test-logs"
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
Write-Host "Running Frontend Tests with Logging" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Mode: $Mode" -ForegroundColor Yellow
if ($TestPattern) {
    Write-Host "Test Pattern: $TestPattern" -ForegroundColor Yellow
} else {
    Write-Host "Running all tests" -ForegroundColor Yellow
}
Write-Host "Log File: $logFile" -ForegroundColor Yellow
Write-Host "Error Log: $errorLogFile" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to strip ANSI escape codes
function Remove-AnsiCodes {
    param([string]$Text)
    # Remove ANSI escape sequences (ESC[ followed by numbers/letters)
    $Text -replace '\x1b\[[0-9;]*[a-zA-Z]', ''
}

# Determine npm command based on mode
$npmCommand = switch ($Mode) {
    "ui" { "npm run test:ui" }
    "coverage" { "npm run test:coverage" }
    default { "npm test" }
}

# Add flags for test mode to get detailed error output
if ($Mode -eq "test") {
    # --reporter=verbose: Show detailed error messages
    # --no-color: Remove ANSI codes
    # --run: Run once (not watch mode)
    $npmCommand = "$npmCommand -- --reporter=verbose --no-color --run"
}

# Run tests and capture output
if ($TestPattern) {
    Write-Host "Running tests matching: $TestPattern (Mode: $Mode)" -ForegroundColor Green
    if ($Mode -eq "ui") {
        # UI mode doesn't support test pattern filtering
        Write-Host "Note: UI mode runs all tests" -ForegroundColor Yellow
        # Capture output, strip ANSI codes, and write to file
        $output = Invoke-Expression "$npmCommand" 2>&1 | Out-String
        $cleanOutput = Remove-AnsiCodes -Text $output
        $cleanOutput | Out-File -FilePath $logFile -Encoding UTF8
        # Display original output to console
        Write-Host $output
    } else {
        # Capture output, strip ANSI codes, and write to file
        $output = Invoke-Expression "$npmCommand -- $TestPattern" 2>&1 | Out-String
        $cleanOutput = Remove-AnsiCodes -Text $output
        $cleanOutput | Out-File -FilePath $logFile -Encoding UTF8
        # Display original output to console
        Write-Host $output
    }
} else {
    Write-Host "Running all tests (Mode: $Mode)..." -ForegroundColor Green
    # Capture output, strip ANSI codes, and write to file
    $output = Invoke-Expression "$npmCommand" 2>&1 | Out-String
    $cleanOutput = Remove-AnsiCodes -Text $output
    $cleanOutput | Out-File -FilePath $logFile -Encoding UTF8
    # Display original output to console
    Write-Host $output
}

# Extract errors from log file (already cleaned of ANSI codes)
# Vitest error patterns: FAIL, Error, AssertionError, TypeError, etc.
$errorLines = Get-Content $logFile | Select-String -Pattern "FAIL|Error|AssertionError|TypeError|ReferenceError|SyntaxError|FAILED|failed|×|✗" -Context 3,3 | 
    Where-Object { 
        $_.Line -notmatch "Errors:\s*0|No errors|No Errors|PASS|✓|passed|Tests:\s*\d+\s*passed" 
    }
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
if (Test-Path $errorLogFile) {
    Write-Host "Error log: $errorLogFile" -ForegroundColor Cyan
}
Write-Host "Test reports: coverage/" -ForegroundColor Cyan

