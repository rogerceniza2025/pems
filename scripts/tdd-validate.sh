#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[TDD-VALIDATE]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[TDD-VALIDATE]${NC} $1"
}

print_error() {
    echo -e "${RED}[TDD-VALIDATE]${NC} $1"
}

# Validate TDD workflow
print_status "Validating TDD workflow..."

# Check if tests exist
if [ ! -d "tests" ]; then
    print_error "Tests directory not found!"
    exit 1
fi

# Check test coverage
print_status "Checking test coverage..."
pnpm test:coverage -- --reporter=json > coverage-report.json

# Extract coverage percentage
COVERAGE=$(cat coverage-report.json | jq '.total.lines.pct' 2>/dev/null || echo "0")

if [ "${COVERAGE%.*}" -lt 80 ]; then
    print_warning "Coverage is below 80%: ${COVERAGE}%"
    print_warning "Consider adding more tests before committing"
else
    print_status "Coverage is good: ${COVERAGE}%"
fi

# Check for failing tests
print_status "Running tests to check for failures..."
if ! pnpm test -- --run; then
    print_error "Tests are failing! Fix failing tests before continuing."
    exit 1
fi

print_status "✅ TDD validation passed!"