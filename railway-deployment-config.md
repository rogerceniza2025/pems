# Railway Deployment Configuration

This document contains all configuration files and setup instructions for deploying PEMS to Railway platform.

## Railway Service Configuration

### 1. Project Structure

```
pems/
├── railway.json                 # Main Railway configuration
├── apps/
│   ├── api/
│   │   └── railway.json        # API service configuration
│   ├── web/
│   │   └── railway.json        # Web app configuration
│   └── admin/
│       └── railway.json        # Admin panel configuration
├── packages/
│   └── infrastructure/
│       └── database/
│           └── railway.json    # Database service configuration
└── docker/
    └── railway/
        ├── Dockerfile.api       # API Dockerfile
        ├── Dockerfile.web       # Web app Dockerfile
        └── Dockerfile.admin    # Admin panel Dockerfile
```

### 2. Main Railway Configuration

### File: `railway.json`

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm build",
    "watchPatterns": [
      "src/**",
      "package.json",
      "pnpm-lock.yaml",
      "turbo.json"
    ]
  },
  "deploy": {
    "startCommand": "pnpm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  },
  "services": {
    "api": {
      "source": "apps/api",
      "build": {
        "builder": "NIXPACKS",
        "buildCommand": "cd apps/api && pnpm build",
        "watchPatterns": [
          "apps/api/src/**",
          "packages/**"
        ]
      },
      "deploy": {
        "startCommand": "cd apps/api && pnpm start",
        "healthcheckPath": "/api/health",
        "port": 3000
      }
    },
    "web": {
      "source": "apps/web",
      "build": {
        "builder": "NIXPACKS",
        "buildCommand": "cd apps/web && pnpm build",
        "watchPatterns": [
          "apps/web/src/**",
          "packages/**"
        ]
      },
      "deploy": {
        "startCommand": "cd apps/web && pnpm start",
        "healthcheckPath": "/",
        "port": 3001
      }
    },
    "admin": {
      "source": "apps/admin",
      "build": {
        "builder": "NIXPACKS",
        "buildCommand": "cd apps/admin && pnpm build",
        "watchPatterns": [
          "apps/admin/src/**",
          "packages/**"
        ]
      },
      "deploy": {
        "startCommand": "cd apps/admin && pnpm start",
        "healthcheckPath": "/",
        "port": 3002
      }
    }
  }
}
```

### 3. API Service Configuration

### File: `apps/api/railway.json`

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm build",
    "buildEnv": {
      "NODE_ENV": "production",
      "TURBO_TOKEN": "$TURBO_TOKEN",
      "TURBO_TEAM": "$TURBO_TEAM"
    }
  },
  "deploy": {
    "startCommand": "pnpm start:api",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "port": 3000,
    "env": {
      "NODE_ENV": "production",
      "PORT": "3000",
      "HOST": "0.0.0.0"
    }
  }
}
```

### 4. Web App Configuration

### File: `apps/web/railway.json`

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm build",
    "buildEnv": {
      "NODE_ENV": "production",
      "TURBO_TOKEN": "$TURBO_TOKEN",
      "TURBO_TEAM": "$TURBO_TEAM"
    }
  },
  "deploy": {
    "startCommand": "pnpm start:web",
    "healthcheckPath": "/",
    "healthcheckTimeout": 300,
    "port": 3001,
    "env": {
      "NODE_ENV": "production",
      "PORT": "3001",
      "HOST": "0.0.0.0"
    }
  }
}
```

### 5. Admin Panel Configuration

### File: `apps/admin/railway.json`

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm build",
    "buildEnv": {
      "NODE_ENV": "production",
      "TURBO_TOKEN": "$TURBO_TOKEN",
      "TURBO_TEAM": "$TURBO_TEAM"
    }
  },
  "deploy": {
    "startCommand": "pnpm start:admin",
    "healthcheckPath": "/",
    "healthcheckTimeout": 300,
    "port": 3002,
    "env": {
      "NODE_ENV": "production",
      "PORT": "3002",
      "HOST": "0.0.0.0"
    }
  }
}
```

## Docker Configuration

### 1. API Dockerfile

### File: `docker/railway/Dockerfile.api`

```dockerfile
# Base image
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Build stage
FROM base AS builder

# Copy source code
COPY . .

# Build applications and packages
RUN pnpm build

# Production stage
FROM base AS production

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/*/dist ./packages/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["pnpm", "start:api"]
```

### 2. Web App Dockerfile

### File: `docker/railway/Dockerfile.web`

```dockerfile
# Base image
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/ ./packages/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Build stage
FROM base AS builder

# Copy source code
COPY . .

# Build applications and packages
RUN pnpm build

# Production stage
FROM nginx:alpine AS production

# Copy built web app
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy nginx configuration
COPY docker/railway/nginx.conf /etc/nginx/nginx.conf

# Create non-root user
RUN addgroup -g 1001 -S nginx
RUN adduser -S nginx -u 1001

# Change ownership
RUN chown -R nginx:nginx /usr/share/nginx/html
USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### 3. Admin Panel Dockerfile

### File: `docker/railway/Dockerfile.admin`

```dockerfile
# Base image
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/ ./packages/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Build stage
FROM base AS builder

# Copy source code
COPY . .

# Build applications and packages
RUN pnpm build

# Production stage
FROM nginx:alpine AS production

# Copy built admin panel
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html

# Copy nginx configuration
COPY docker/railway/nginx.conf /etc/nginx/nginx.conf

# Create non-root user
RUN addgroup -g 1001 -S nginx
RUN adduser -S nginx -u 1001

# Change ownership
RUN chown -R nginx:nginx /usr/share/nginx/html
USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### 4. Nginx Configuration

### File: `docker/railway/nginx.conf`

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

        # Handle client-side routing
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Error pages
        error_page 404 /index.html;
    }
}
```

## Environment Variables Configuration

### 1. Staging Environment

```bash
# Core Configuration
NODE_ENV=staging
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:password@host:port/database
DATABASE_POOL_MAX=10
DATABASE_POOL_IDLE_TIMEOUT=30

# Redis
REDIS_URL=redis://host:port
REDIS_KEY_PREFIX=pems_staging:
REDIS_TTL_DEFAULT=300

# Authentication
JWT_SECRET=staging-jwt-secret-32-chars-minimum
SESSION_SECRET=staging-session-secret-32-chars-minimum
BETTER_AUTH_SECRET=staging-better-auth-secret-32-chars-minimum
BETTER_AUTH_URL=https://staging-api.pems.com

# API Configuration
CORS_ORIGIN=https://staging.pems.com,https://staging-admin.pems.com
API_RATE_LIMIT_REQUESTS=1000
API_RATE_LIMIT_WINDOW=60

# Feature Flags
ENABLE_SIGNUP=true
ENABLE_EMAIL_VERIFICATION=false
ENABLE_RATE_LIMITING=true
ENABLE_CACHE_DEBUG=false
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true

# External Services
SENTRY_DSN=https://sentry-dsn
POSTHOG_API_KEY=posthog-api-key

# Turbo
TURBO_TOKEN=turbo-api-token
TURBO_TEAM=pems-team
```

### 2. Production Environment (Future)

```bash
# Core Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:password@host:port/database
DATABASE_POOL_MAX=20
DATABASE_POOL_IDLE_TIMEOUT=30

# Redis
REDIS_URL=redis://host:port
REDIS_KEY_PREFIX=pems_production:
REDIS_TTL_DEFAULT=3600

# Authentication
JWT_SECRET=production-jwt-secret-32-chars-minimum
SESSION_SECRET=production-session-secret-32-chars-minimum
BETTER_AUTH_SECRET=production-better-auth-secret-32-chars-minimum
BETTER_AUTH_URL=https://api.pems.com

# API Configuration
CORS_ORIGIN=https://pems.com,https://admin.pems.com
API_RATE_LIMIT_REQUESTS=500
API_RATE_LIMIT_WINDOW=60

# Feature Flags
ENABLE_SIGNUP=false
ENABLE_EMAIL_VERIFICATION=true
ENABLE_RATE_LIMITING=true
ENABLE_CACHE_DEBUG=false
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true

# External Services
SENTRY_DSN=https://sentry-dsn
POSTHOG_API_KEY=posthog-api-key

# Turbo
TURBO_TOKEN=turbo-api-token
TURBO_TEAM=pems-team
```

## Railway CLI Setup Scripts

### 1. Deployment Script

### File: `scripts/railway-deploy.sh`

```bash
#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
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
```

### 2. Rollback Script

### File: `scripts/railway-rollback.sh`

```bash
#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI is not installed"
    exit 1
fi

# Login to Railway
print_status "Logging into Railway..."
railway login --token "$RAILWAY_TOKEN"

# Set project
print_status "Setting Railway project..."
railway project "$RAILWAY_PROJECT_ID"

# Rollback each service
print_warning "Rolling back API service..."
railway rollback --service api

print_warning "Rolling back Web service..."
railway rollback --service web

print_warning "Rolling back Admin service..."
railway rollback --service admin

print_status "Rollback completed. Waiting for services to be ready..."
sleep 30

# Health checks after rollback
print_status "Performing health checks after rollback..."

# Get deployment URLs
API_URL=$(railway variables get API_URL --service api)
WEB_URL=$(railway variables get WEB_URL --service web)
ADMIN_URL=$(railway variables get ADMIN_URL --service admin)

# Check API health
if curl -f "$API_URL/api/health" > /dev/null 2>&1; then
    print_status "✅ API health check passed after rollback"
else
    print_error "❌ API health check failed after rollback"
    exit 1
fi

# Check Web app
if curl -f "$WEB_URL" > /dev/null 2>&1; then
    print_status "✅ Web app health check passed after rollback"
else
    print_error "❌ Web app health check failed after rollback"
    exit 1
fi

# Check Admin panel
if curl -f "$ADMIN_URL" > /dev/null 2>&1; then
    print_status "✅ Admin panel health check passed after rollback"
else
    print_error "❌ Admin panel health check failed after rollback"
    exit 1
fi

print_status "🔄 Rollback completed successfully!"
```

## Railway Project Setup Instructions

### 1. Initial Setup

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway create pems

# Set up services
railway add --service api
railway add --service web
railway add --service admin

# Set up PostgreSQL
railway add postgresql

# Set up Redis
railway add redis
```

### 2. Environment Variables Setup

```bash
# Set environment variables for API service
railway variables set NODE_ENV=production --service api
railway variables set PORT=3000 --service api
railway variables set DATABASE_URL=$DATABASE_URL --service api
railway variables set REDIS_URL=$REDIS_URL --service api
railway variables set JWT_SECRET=$JWT_SECRET --service api
railway variables set BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET --service api

# Set environment variables for Web service
railway variables set NODE_ENV=production --service web
railway variables set PORT=3001 --service web
railway variables set API_URL=$API_URL --service web

# Set environment variables for Admin service
railway variables set NODE_ENV=production --service admin
railway variables set PORT=3002 --service admin
railway variables set API_URL=$API_URL --service admin
```

### 3. Domain Configuration

```bash
# Add custom domains
railway domains add api.pems.com --service api
railway domains add pems.com --service web
railway domains add admin.pems.com --service admin
```

## Monitoring and Logging

### 1. Railway Logs

```bash
# View logs for all services
railway logs

# View logs for specific service
railway logs --service api
railway logs --service web
railway logs --service admin

# View real-time logs
railway logs --follow
```

### 2. Health Monitoring

```bash
# Check service status
railway status

# View service metrics
railway metrics

# Check deployment history
railway deployments
```

This comprehensive Railway configuration provides a solid foundation for deploying PEMS with proper monitoring, health checks, and rollback capabilities.