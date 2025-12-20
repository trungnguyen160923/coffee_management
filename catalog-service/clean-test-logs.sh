#!/bin/bash
# Bash script to clean test logs
# Usage: ./clean-test-logs.sh

LOG_DIR="target/test-logs"

if [ -d "$LOG_DIR" ]; then
    OLD_LOGS=$(find "$LOG_DIR" -name "*.log" -type f 2>/dev/null)
    if [ -n "$OLD_LOGS" ]; then
        COUNT=$(echo "$OLD_LOGS" | wc -l)
        echo "$OLD_LOGS" | xargs rm -f
        echo "Cleaned $COUNT old log file(s) from $LOG_DIR"
    else
        echo "No log files found in $LOG_DIR"
    fi
else
    echo "Log directory $LOG_DIR does not exist"
fi

