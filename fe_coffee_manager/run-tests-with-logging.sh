#!/bin/bash
# Bash script to run frontend tests with detailed logging
# Usage: 
#   ./run-tests-with-logging.sh                          # Chạy tất cả tests (npm test)
#   ./run-tests-with-logging.sh ui                       # Chạy tests với UI (npm run test:ui)
#   ./run-tests-with-logging.sh coverage                 # Chạy tests với coverage (npm run test:coverage)
#   ./run-tests-with-logging.sh test GoodsReceiptModal   # Chạy test cụ thể (npm test)
#   ./run-tests-with-logging.sh ui                       # Chạy test với UI (npm run test:ui)

MODE="${1:-test}"
TEST_PATTERN="${2:-}"

# Validate mode
if [[ ! "$MODE" =~ ^(test|ui|coverage)$ ]]; then
    # If first arg is not a mode, treat it as test pattern
    TEST_PATTERN="$MODE"
    MODE="test"
fi

# Create log directory if it doesn't exist
LOG_DIR="test-logs"
mkdir -p "$LOG_DIR"

# Clean old log files before running tests
if [ -d "$LOG_DIR" ]; then
    OLD_LOGS=$(find "$LOG_DIR" -name "*.log" -type f 2>/dev/null)
    if [ -n "$OLD_LOGS" ]; then
        COUNT=$(echo "$OLD_LOGS" | wc -l)
        echo "$OLD_LOGS" | xargs rm -f
        echo "Cleaned $COUNT old log file(s)"
    fi
fi

# Generate timestamp for log file
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="$LOG_DIR/test-run-$TIMESTAMP.log"
ERROR_LOG_FILE="$LOG_DIR/test-errors-$TIMESTAMP.log"

echo "========================================"
echo "Running Frontend Tests with Logging"
echo "========================================"
echo "Mode: $MODE"
if [ -n "$TEST_PATTERN" ]; then
    echo "Test Pattern: $TEST_PATTERN"
else
    echo "Running all tests"
fi
echo "Log File: $LOG_FILE"
echo "Error Log: $ERROR_LOG_FILE"
echo "========================================"
echo ""

# Determine npm command based on mode
case "$MODE" in
    "ui")
        NPM_CMD="npm run test:ui"
        ;;
    "coverage")
        NPM_CMD="npm run test:coverage"
        ;;
    *)
        NPM_CMD="npm test"
        ;;
esac

# Function to strip ANSI codes
strip_ansi() {
    sed 's/\x1b\[[0-9;]*[a-zA-Z]//g'
}

# Run tests and capture output
if [ -n "$TEST_PATTERN" ]; then
    echo "Running tests matching: $TEST_PATTERN (Mode: $MODE)"
    if [ "$MODE" = "ui" ]; then
        # UI mode doesn't support test pattern filtering
        echo "Note: UI mode runs all tests"
        $NPM_CMD 2>&1 | tee >(strip_ansi > "$LOG_FILE")
    else
        # Add flags for test mode to get detailed error output
        if [ "$MODE" = "test" ]; then
            # --reporter=verbose: Show detailed error messages
            # --no-color: Remove ANSI codes
            # --run: Run once (not watch mode)
            NPM_CMD="$NPM_CMD -- --reporter=verbose --no-color --run"
        fi
        $NPM_CMD -- "$TEST_PATTERN" 2>&1 | tee >(strip_ansi > "$LOG_FILE")
    fi
else
    echo "Running all tests (Mode: $MODE)..."
    # Add flags for test mode to get detailed error output
    if [ "$MODE" = "test" ]; then
        # --reporter=verbose: Show detailed error messages
        # --no-color: Remove ANSI codes
        # --run: Run once (not watch mode)
        NPM_CMD="$NPM_CMD -- --reporter=verbose --no-color --run"
    fi
    $NPM_CMD 2>&1 | tee >(strip_ansi > "$LOG_FILE")
fi

# Extract errors from log file (already cleaned of ANSI codes)
# Vitest error patterns: FAIL, Error, AssertionError, TypeError, etc.
ERROR_LINES=$(grep -i -E "FAIL|Error|AssertionError|TypeError|ReferenceError|SyntaxError|FAILED|failed|×|✗" "$LOG_FILE" | \
    grep -v -i -E "Errors:\s*0|No errors|No Errors|PASS|✓|passed|Tests:\s*\d+\s*passed" || true)

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
if [ -f "$ERROR_LOG_FILE" ]; then
    echo "Error log: $ERROR_LOG_FILE"
fi
echo "Test reports: coverage/"

