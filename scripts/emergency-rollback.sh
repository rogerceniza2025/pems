#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[ROLLBACK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[ROLLBACK]${NC} $1"
}

print_error() {
    echo -e "${RED}[ROLLBACK]${NC} $1"
}

# Emergency rollback function
emergency_rollback() {
    print_warning "Starting emergency rollback procedure..."
    
    # Check if Railway CLI is available
    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI not found. Installing..."
        npm install -g @railway/cli
    fi
    
    # Login to Railway
    print_status "Authenticating with Railway..."
    railway login --token "$RAILWAY_TOKEN"
    
    # Get current deployment info
    print_status "Getting current deployment info..."
    railway status
    
    # Rollback each service
    for service in api web admin; do
        print_warning "Rolling back $service service..."
        railway rollback --service $service
        
        # Wait for rollback to complete
        sleep 30
        
        # Verify rollback
        print_status "Verifying $service rollback..."
        if railway status --service $service | grep -q "healthy"; then
            print_status "✅ $service rollback successful"
        else
            print_error "❌ $service rollback failed"
        fi
    done
    
    # Run health checks
    print_status "Running post-rollback health checks..."
    ./scripts/health-check.sh
    
    print_status "🔄 Emergency rollback completed!"
}

# Health check after rollback
health_check() {
    local api_url=${1:-"https://staging-api.pems.com"}
    local web_url=${2:-"https://staging.pems.com"}
    local admin_url=${3:-"https://staging-admin.pems.com"}
    
    print_status "Checking API health..."
    if curl -f "$api_url/api/health" > /dev/null 2>&1; then
        print_status "✅ API is healthy"
    else
        print_error "❌ API is unhealthy"
        return 1
    fi
    
    print_status "Checking Web app..."
    if curl -f "$web_url" > /dev/null 2>&1; then
        print_status "✅ Web app is healthy"
    else
        print_error "❌ Web app is unhealthy"
        return 1
    fi
    
    print_status "Checking Admin panel..."
    if curl -f "$admin_url" > /dev/null 2>&1; then
        print_status "✅ Admin panel is healthy"
    else
        print_error "❌ Admin panel is unhealthy"
        return 1
    fi
    
    return 0
}

# Main execution
case "${1:-rollback}" in
    "rollback")
        emergency_rollback
        ;;
    "health")
        health_check "$2" "$3" "$4"
        ;;
    *)
        echo "Usage: $0 {rollback|health} [api_url] [web_url] [admin_url]"
        exit 1
        ;;
esac