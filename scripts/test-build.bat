@echo off
REM Batch script to test build Docker images
REM Usage: scripts\test-build.bat [service-name]

if "%1"=="" (
    echo Testing build for all services...
    powershell -ExecutionPolicy Bypass -File "%~dp0test-build.ps1"
) else (
    echo Testing build for service: %1
    powershell -ExecutionPolicy Bypass -File "%~dp0test-build.ps1" %1
)

