#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[TDD]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[TDD]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[TDD]${NC} $1"
}

print_error() {
    echo -e "${RED}[TDD]${NC} $1"
}

# Check if we're in a TDD cycle
TDD_MODE=${1:-"watch"}

print_status "Starting TDD workflow in $TDD_MODE mode..."

case $TDD_MODE in
    "watch")
        print_status "Starting TDD watch mode..."
        pnpm test:unit -- --watch --coverage
        ;;
    "domain")
        print_status "Running domain layer tests..."
        pnpm test:unit tests/unit/domain/** -- --watch
        ;;
    "integration")
        print_status "Running integration tests..."
        pnpm test:integration -- --watch
        ;;
    "e2e")
        print_status "Running E2E tests..."
        pnpm test:e2e
        ;;
    "coverage")
        print_status "Running tests with coverage..."
        pnpm test:coverage
        ;;
    "changed")
        print_status "Running tests for changed files..."
        pnpm test:unit -- --changed --since=main
        ;;
    *)
        print_error "Unknown TDD mode: $TDD_MODE"
        echo "Available modes: watch, domain, integration, e2e, coverage, changed"
        exit 1
        ;;
esac