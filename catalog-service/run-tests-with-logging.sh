#!/bin/bash
# Bash script to run tests with detailed logging
# Usage: ./run-tests-with-logging.sh [TestClass]

TEST_CLASS="${1:-*}"

# Create log directory if it doesn't exist
LOG_DIR="target/test-logs"
mkdir -p "$LOG_DIR"

# Clean old log files before running tests
if [ -d "$LOG_DIR" ]; then
    OLD_LOGS=$(find "$LOG_DIR" -name "*.log" -type f 2>/dev/null)
    if [ -n "$OLD_LOGS" ]; then
        COUNT=$(echo "$OLD_LOGS" | wc -l)
        echo "$OLD_LOGS" | xargs rm -f
        echo "Cleaned $COUNT old log file(s)" -ForegroundColor Yellow
    fi
fi

# Generate timestamp for log file
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="$LOG_DIR/test-run-$TIMESTAMP.log"
ERROR_LOG_FILE="$LOG_DIR/test-errors-$TIMESTAMP.log"

echo "========================================"
echo "Running Tests with Logging"
echo "========================================"
echo "Test Class: $TEST_CLASS"
echo "Log File: $LOG_FILE"
echo "Error Log: $ERROR_LOG_FILE"
echo "========================================"
echo ""

# Run tests and capture output
# Note: Logback is Spring Boot default, so logback-test.xml will be used automatically
if [ "$TEST_CLASS" = "*" ]; then
    echo "Running all tests..."
    ./mvnw test -Dtest="$TEST_CLASS" 2>&1 | tee "$LOG_FILE"
else
    echo "Running tests: $TEST_CLASS"
    ./mvnw test -Dtest="$TEST_CLASS" 2>&1 | tee "$LOG_FILE"
fi

# Extract errors from log file
# Exclude false positives like "Errors: 0" or "No errors" - only match actual errors
ERROR_LINES=$(grep -i -E "\[ERROR\]|FAILURE|Exception|Error:" "$LOG_FILE" | grep -v -i -E "Errors:\s*0|No errors|No Errors" || true)
if [ -n "$ERROR_LINES" ]; then
    echo "$ERROR_LINES" > "$ERROR_LOG_FILE"
    echo ""
    echo "========================================"
    echo "Errors found! Check: $ERROR_LOG_FILE"
    echo "========================================"
else
    echo ""
    echo "========================================"
    echo "No errors found in test run!"
    echo "========================================"
    # Delete error log file if no errors found
    if [ -f "$ERROR_LOG_FILE" ]; then
        rm -f "$ERROR_LOG_FILE"
    fi
fi

echo ""
echo "Full log: $LOG_FILE"
echo "Error log: $ERROR_LOG_FILE"
echo "Test reports: target/surefire-reports"

