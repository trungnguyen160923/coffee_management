# PowerShell script to clean frontend test logs
# Usage: .\clean-test-logs.ps1

$logDir = "test-logs"

if (Test-Path $logDir) {
    $oldLogs = Get-ChildItem -Path $logDir -Filter "*.log" -ErrorAction SilentlyContinue
    if ($oldLogs) {
        $count = $oldLogs.Count
        $oldLogs | Remove-Item -Force
        Write-Host "Cleaned $count old log file(s) from $logDir" -ForegroundColor Green
    } else {
        Write-Host "No log files found in $logDir" -ForegroundColor Yellow
    }
} else {
    Write-Host "Log directory $logDir does not exist" -ForegroundColor Yellow
}

