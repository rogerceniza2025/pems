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

TDD_MODE=${1:-"watch"}

print_status "Starting TDD workflow in $TDD_MODE mode..."

case $TDD_MODE in
    "watch")
        print_status "Starting TDD watch mode with coverage..."
        pnpm test:unit -- --watch --coverage
        ;;
    "domain")
        print_status "Running domain layer tests in watch mode..."
        pnpm test:domain -- --watch
        ;;
    "integration")
        print_status "Running integration tests in watch mode..."
        pnpm test:integration -- --watch
        ;;
    "strict")
        print_status "Running strict TDD mode (fail on any coverage drop)..."
        pnpm test:coverage -- --run --passWithNoTests=false
        ;;
    "changed")
        print_status "Running tests for changed files..."
        pnpm test:changed -- --watch
        ;;
    "validate")
        print_status "Running TDD validation..."
        pnpm test:enforce
        ;;
    *)
        print_error "Unknown TDD mode: $TDD_MODE"
        echo "Available modes: watch, domain, integration, strict, changed, validate"
        exit 1
        ;;
esac