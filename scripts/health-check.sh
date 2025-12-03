#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[HEALTH]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[HEALTH]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[HEALTH]${NC} $1"
}

print_error() {
    echo -e "${RED}[HEALTH]${NC} $1"
}

# Configuration
API_URL=${API_URL:-"http://localhost:3000"}
WEB_URL=${WEB_URL:-"http://localhost:3001"}
ADMIN_URL=${ADMIN_URL:-"http://localhost:3002"}
TIMEOUT=${HEALTH_TIMEOUT:-10}

# Health check function
check_service_health() {
    local service_name=$1
    local url=$2
    local timeout=${3:-$TIMEOUT}
    
    print_status "Checking $service_name health at $url..."
    
    # Use curl with timeout
    if curl -f -s --max-time $timeout "$url" > /dev/null 2>&1; then
        print_success "✅ $service_name is healthy"
        return 0
    else
        print_error "❌ $service_name is unhealthy or unreachable"
        return 1
    fi
}

# Detailed health check
check_detailed_health() {
    local service_name=$1
    local url=$2
    
    print_status "Performing detailed health check for $service_name..."
    
    # Get health response
    local response=$(curl -s --max-time $TIMEOUT "$url" 2>/dev/null || echo "{}")
    
    # Parse JSON response (basic parsing)
    if echo "$response" | grep -q '"status":"ok"'; then
        print_success "✅ $service_name reports healthy status"
    elif echo "$response" | grep -q '"status":"degraded"'; then
        print_warning "⚠️  $service_name reports degraded status"
    else
        print_error "❌ $service_name reports unhealthy status"
    fi
    
    # Check timestamp
    if echo "$response" | grep -q '"timestamp"'; then
        local timestamp=$(echo "$response" | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4)
        print_status "📅 $service_name last updated: $timestamp"
    fi
    
    # Check services
    if echo "$response" | grep -q '"services"'; then
        print_status "🔍 Checking $service_name dependencies..."
        echo "$response" | grep -o '"services":{[^}]*}' | sed 's/,/\n/g' | while read -r line; do
            if echo "$line" | grep -q '"status":"ok"'; then
                local service=$(echo "$line" | cut -d'"' -f2)
                print_success "  ✅ $service dependency is healthy"
            else
                local service=$(echo "$line" | cut -d'"' -f2)
                print_error "  ❌ $service dependency is unhealthy"
            fi
        done
    fi
}

# Performance check
check_performance() {
    local service_name=$1
    local url=$2
    
    print_status "🚀 Checking $service_name performance..."
    
    # Measure response time
    local start_time=$(date +%s%N)
    curl -s --max-time $TIMEOUT "$url" > /dev/null 2>&1
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    if [ $response_time -lt 200 ]; then
        print_success "✅ $service_name response time: ${response_time}ms (excellent)"
    elif [ $response_time -lt 500 ]; then
        print_warning "⚠️  $service_name response time: ${response_time}ms (acceptable)"
    else
        print_error "❌ $service_name response time: ${response_time}ms (poor)"
    fi
}

# Database health check
check_database_health() {
    print_status "🗄️  Checking database connectivity..."
    
    # This would depend on your database setup
    # Example for PostgreSQL
    if command -v psql &> /dev/null; then
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
            print_success "✅ Database connection is healthy"
        else
            print_error "❌ Database connection failed"
        fi
    else
        print_warning "⚠️  PostgreSQL client not available, skipping database check"
    fi
}

# Generate health report
generate_health_report() {
    local report_file="health-report-$(date +%Y%m%d-%H%M%S).json"
    
    print_status "📊 Generating health report..."
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "checks": {
    "api": {
      "url": "$API_URL/api/health",
      "status": "$(curl -s --max-time $TIMEOUT "$API_URL/api/health" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || 'unknown')"
    },
    "web": {
      "url": "$WEB_URL",
      "status": "$(curl -s --max-time $TIMEOUT "$WEB_URL" > /dev/null 2>&1 && echo 'healthy' || echo 'unhealthy')"
    },
    "admin": {
      "url": "$ADMIN_URL",
      "status": "$(curl -s --max-time $TIMEOUT "$ADMIN_URL" > /dev/null 2>&1 && echo 'healthy' || echo 'unhealthy')"
    }
  },
  "environment": {
    "api_url": "$API_URL",
    "web_url": "$WEB_URL",
    "admin_url": "$ADMIN_URL",
    "timeout": $TIMEOUT
  }
}
EOF
    
    print_success "📄 Health report saved to $report_file"
}

# Main health check execution
main() {
    print_status "🏥 Starting comprehensive health check..."
    echo "========================================"
    
    local overall_health=0
    
    # Basic health checks
    check_service_health "API" "$API_URL/api/health" || overall_health=1
    check_service_health "Web Application" "$WEB_URL" || overall_health=1
    check_service_health "Admin Panel" "$ADMIN_URL" || overall_health=1
    
    echo "========================================"
    
    # Detailed health checks
    check_detailed_health "API" "$API_URL/api/health"
    
    echo "========================================"
    
    # Performance checks
    check_performance "API" "$API_URL/api/health"
    check_performance "Web Application" "$WEB_URL"
    
    echo "========================================"
    
    # Database check
    check_database_health
    
    echo "========================================"
    
    # Generate report
    generate_health_report
    
    # Final status
    if [ $overall_health -eq 0 ]; then
        print_success "🎉 All services are healthy!"
        exit 0
    else
        print_error "💥 Some services are unhealthy!"
        exit 1
    fi
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --api-url URL     API health check URL (default: $API_URL)"
    echo "  --web-url URL    Web app URL (default: $WEB_URL)"
    echo "  --admin-url URL  Admin panel URL (default: $ADMIN_URL)"
    echo "  --timeout SEC    Health check timeout in seconds (default: $TIMEOUT)"
    echo "  --report-only    Only generate report, don't run checks"
    echo "  --help          Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  API_URL          API service URL"
    echo "  WEB_URL          Web application URL"
    echo "  ADMIN_URL        Admin panel URL"
    echo "  HEALTH_TIMEOUT    Health check timeout"
    echo "  DB_HOST          Database host"
    echo "  DB_USER          Database user"
    echo "  DB_PASSWORD      Database password"
    echo "  DB_NAME          Database name"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --api-url)
            API_URL="$2"
            shift 2
            ;;
        --web-url)
            WEB_URL="$2"
            shift 2
            ;;
        --admin-url)
            ADMIN_URL="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --report-only)
            generate_health_report
            exit 0
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Run main function
main