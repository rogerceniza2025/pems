# Port Configuration Documentation

## Port Assignment Overview

This document outlines the port assignments for all services and applications in the PEMS (Property and Energy Management System) project.

## Application Ports

### Frontend Applications
- **Port 3000** - Main Web Application
  - Primary user interface
  - Access: http://localhost:3000
  - Configuration: `apps/web/vite.config.ts`

- **Port 3001** - Admin Application
  - Administrative interface
  - Access: http://localhost:3001
  - Configuration: `apps/admin/vite.config.ts`

### Backend Services
- **Port 3002** - API Server
  - RESTful API endpoints
  - Access: http://localhost:3002
  - Configuration: `apps/api/src/server.ts`

### Development Tools
- **Port 3106** - Storybook
  - Component development and documentation
  - Access: http://localhost:3106
  - Configuration: `package.json` script: `"storybook": "storybook dev -p 3106"`

### Contract Testing Services
- **Port 3200** - Auth Service Provider
  - Authentication service contract testing
  - Configuration: `package.json` script: `"test:contracts:provider-auth"`

- **Port 3201** - User Service Provider
  - User service contract testing
  - Configuration: `package.json` script: `"test:contracts:provider-user"`

- **Port 3202** - Notification Service Provider
  - Notification service contract testing
  - Configuration: `package.json` script: `"test:contracts:provider-notification"`

- **Port 3203** - Tenant Service Provider
  - Tenant service contract testing
  - Configuration: `package.json` script: `"test:contracts:provider-tenant"`

## Infrastructure Ports

### External Dependencies
- **Port 5432** - PostgreSQL Database
- **Port 6379** - Redis Cache
- **Port 587** - SMTP Email Server

## Port Management Scripts

### Kill All Development Ports
```bash
npm run kill-ports
# or
pnpm kill-ports
```

This command will kill processes on all development ports:
- 3000 (Web App)
- 3001 (Admin App)
- 3002 (API Server)
- 3106 (Storybook)
- 3200-3203 (Contract Testing Services)

## Environment Configuration

### Development Environment Variables
```env
# Application Ports
# Web Application: http://localhost:3000
# Admin Application: http://localhost:3001
# API Server: http://localhost:3002
# Storybook: http://localhost:3106
```

### Testing Environment Variables
```bash
STORYBOOK_URL=http://localhost:3106
TEST_BASE_URL=http://localhost:3000
AUTH_SERVICE_URL=http://localhost:3200
USER_SERVICE_URL=http://localhost:3201
NOTIFICATION_SERVICE_URL=http://localhost:3202
TENANT_SERVICE_URL=http://localhost:3203
```

## Port Conflict Resolution

The port assignments are designed to avoid conflicts:

- **3000-3029**: Main applications (3000-3002) with room for additional apps
- **3100-3199**: Development tools (3106 for Storybook)
- **3200-3299**: Testing and service providers (3200-3203)
- **5000+**: External services (5432 for PostgreSQL, 6379 for Redis)

## Common Commands

### Start Development Servers
```bash
# Start all applications
pnpm dev

# Start individual applications
pnpm --filter web dev        # Port 3000
pnpm --filter admin dev      # Port 3001
pnpm --filter api dev        # Port 3002
```

### Start Storybook
```bash
pnpm storybook               # Port 3106
```

### Run Contract Tests
```bash
pnpm test:contracts:all      # Uses ports 3200-3203
```

## Deployment Configuration

### Railway Deployment
- Admin application is configured to use port 3001 in production
- Configuration: `apps/admin/railway.json`

### Local Development
- All applications use their designated ports as listed above
- No conflicts expected when running all services simultaneously

## Troubleshooting

### Port Already in Use
If you encounter "port already in use" errors:
1. Run `pnpm kill-ports` to clean up all development ports
2. Check for other applications using the same ports
3. Restart your development servers

### Service Not Reachable
If a service is not accessible:
1. Verify the service is running
2. Check the port configuration in the respective config file
3. Ensure no firewall is blocking the connection
4. Check for typos in the URL

## History of Changes

### Port Cleanup (Current)
- Moved Storybook from port 6006 to 3106
- Moved contract testing services from 3001-3004 to 3200-3203
- Updated all configuration files and test scripts
- Enhanced kill-ports.ps1 script with better logging

This port organization provides a clean separation of concerns and minimizes conflicts between development tools and application services.