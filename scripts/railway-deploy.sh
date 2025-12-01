#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[RAILWAY]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[RAILWAY]${NC} $1"
}

print_error() {
    echo -e "${RED}[RAILWAY]${NC} $1"
}

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI is not installed. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway
print_status "Logging into Railway..."
railway login --token "$RAILWAY_TOKEN"

# Set project
print_status "Setting Railway project..."
railway project "$RAILWAY_PROJECT_ID"

# Get current branch
BRANCH=${GITHUB_REF_NAME:-main}
print_status "Deploying branch: $BRANCH"

# Build and deploy API
print_status "Building and deploying API service..."
cd apps/api
pnpm build
railway up --service api
cd ../..

# Build and deploy Web app
print_status "Building and deploying Web service..."
cd apps/web
pnpm build
railway up --service web
cd ../..

# Build and deploy Admin panel
print_status "Building and deploying Admin service..."
cd apps/admin
pnpm build
railway up --service admin
cd ../..

# Wait for deployment
print_status "Waiting for deployment to complete..."
sleep 60

# Get deployment URLs
API_URL=$(railway variables get API_URL --service api)
WEB_URL=$(railway variables get WEB_URL --service web)
ADMIN_URL=$(railway variables get ADMIN_URL --service admin)

print_status "Deployment URLs:"
echo "  API: $API_URL"
echo "  Web: $WEB_URL"
echo "  Admin: $ADMIN_URL"

# Health checks
print_status "Performing health checks..."

# Check API health
if curl -f "$API_URL/api/health" > /dev/null 2>&1; then
    print_status "✅ API health check passed"
else
    print_error "❌ API health check failed"
    exit 1
fi

# Check Web app
if curl -f "$WEB_URL" > /dev/null 2>&1; then
    print_status "✅ Web app health check passed"
else
    print_error "❌ Web app health check failed"
    exit 1
fi

# Check Admin panel
if curl -f "$ADMIN_URL" > /dev/null 2>&1; then
    print_status "✅ Admin panel health check passed"
else
    print_error "❌ Admin panel health check failed"
    exit 1
fi

print_status "🎉 Deployment completed successfully!"