# PEMS API Documentation

## Overview

The PEMS (Property and Education Management System) API provides a comprehensive RESTful interface for managing users, tenants, and system resources. This documentation covers all available endpoints, authentication requirements, and usage examples.

## Base URL

```
Development: http://localhost:3002
Production: https://api.pems.com
```

## Authentication

### Session-Based Authentication

The API uses BetterAuth session-based authentication. Sessions can be provided via:

1. **Authorization Header** (Bearer Token):

   ```
   Authorization: Bearer <session_token>
   ```

2. **Cookie**:
   ```
   better-auth.session_token=<session_token>
   ```

### Multi-Tenant Support

For multi-tenant operations, include the tenant ID in requests:

```
X-Tenant-ID: <tenant_id>
```

System administrators can access any tenant by providing the tenant ID in headers or query parameters.

## Security Features

- **Rate Limiting**: Configurable limits per endpoint type
- **CORS**: Cross-origin resource sharing with proper validation
- **Security Headers**: OWASP-recommended security headers
- **Request Validation**: Zod-based input validation
- **Error Handling**: Structured error responses with correlation IDs

## Response Format

### Success Response

```json
{
  "success": true,
  "data": <response_data>,
  "message": "Operation completed successfully",
  "pagination": { // For paginated responses
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {
    // Additional error details in development
    "field": "validation error"
  },
  "requestId": "req_123456789",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/login

Authenticate user and create session.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "tenantId": "tenant-uuid" // Optional
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "tenantId": "tenant-uuid"
    },
    "session": {
      "token": "session-token",
      "expiresAt": "2024-01-08T00:00:00.000Z"
    }
  },
  "message": "Login successful"
}
```

**Rate Limiting:** 5 requests per 15 minutes

#### POST /api/auth/register

Register new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "tenantId": "tenant-uuid" // Optional, defaults to current tenant
}
```

**Rate Limiting:** 5 requests per 15 minutes

#### POST /api/auth/logout

Logout user and invalidate session.

**Headers:** Requires authentication

#### POST /api/auth/forgot-password

Request password reset email.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Rate Limiting:** 3 requests per 15 minutes

#### POST /api/auth/reset-password

Reset password using reset token.

**Request Body:**

```json
{
  "token": "reset-token",
  "newPassword": "new-password123"
}
```

### User Management Endpoints

#### GET /api/users

List users with pagination and filtering.

**Authentication:** Required
**Permissions:** `users:read`

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `search` (string): Search term for email/name
- `sortBy` (string): Field to sort by (default: createdAt)
- `sortOrder` (string): Sort order 'asc' or 'desc' (default: desc)
- `isActive` (boolean): Filter by active status

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "user-uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### GET /api/users/:id

Get user by ID.

**Authentication:** Required
**Permissions:** `users:read`

#### POST /api/users

Create new user.

**Authentication:** Required
**Permissions:** `users:create`

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "Jane Doe",
  "role": "user"
}
```

#### PUT /api/users/:id

Update user information.

**Authentication:** Required
**Permissions:** `users:update`

#### DELETE /api/users/:id

Delete user.

**Authentication:** Required
**Permissions:** `users:delete`

#### GET /api/users/profile

Get current user profile.

**Authentication:** Required

#### PUT /api/users/profile

Update current user profile.

**Authentication:** Required

#### POST /api/users/change-password

Change current user password.

**Authentication:** Required

**Request Body:**

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password123"
}
```

### Tenant Management Endpoints

#### GET /api/tenants

List tenants.

**Authentication:** Required
**Permissions:** `tenants:read`

#### GET /api/tenants/:id

Get tenant by ID.

**Authentication:** Required
**Permissions:** `tenants:read`

#### POST /api/tenants

Create new tenant.

**Authentication:** Required
**Permissions:** `tenants:create`

#### PUT /api/tenants/:id

Update tenant information.

**Authentication:** Required
**Permissions:** `tenants:update`

#### DELETE /api/tenants/:id

Delete tenant.

**Authentication:** Required
**Permissions:** `tenants:delete`

### System Endpoints

#### GET /

API information and status.

**Response:**

```json
{
  "message": "PEMS API is running",
  "version": "1.0.0",
  "features": {
    "multiTenancy": true,
    "rowLevelSecurity": true,
    "uuidv7": true
  }
}
```

#### GET /health

Health check with database status.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```

## Rate Limiting

The API implements different rate limits for different endpoint types:

| Endpoint Type  | Limit        | Window     |
| -------------- | ------------ | ---------- |
| Authentication | 5 requests   | 15 minutes |
| General        | 100 requests | 15 minutes |
| Upload         | 10 requests  | 1 minute   |
| Sensitive      | 3 requests   | 15 minutes |

Rate limit headers are included in responses:

- `X-RateLimit-Limit`: Total requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `Retry-After`: Seconds to wait when rate limited

## Error Codes

| Code                       | Description                     | HTTP Status |
| -------------------------- | ------------------------------- | ----------- |
| `VALIDATION_ERROR`         | Request validation failed       | 400         |
| `AUTH_FAILED`              | Authentication failed           | 401         |
| `NO_SESSION_TOKEN`         | No session token provided       | 401         |
| `INVALID_SESSION`          | Invalid or expired session      | 401         |
| `SESSION_EXPIRED`          | Session has expired             | 401         |
| `USER_NOT_AUTHENTICATED`   | User not authenticated          | 401         |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions | 403         |
| `INSUFFICIENT_ROLES`       | User lacks required roles       | 403         |
| `SYSTEM_ADMIN_REQUIRED`    | System admin access required    | 403         |
| `NOT_FOUND`                | Resource not found              | 404         |
| `CONFLICT`                 | Resource already exists         | 409         |
| `RATE_LIMIT_EXCEEDED`      | Rate limit exceeded             | 429         |
| `INTERNAL_ERROR`           | Internal server error           | 500         |
| `SERVICE_UNAVAILABLE`      | Service temporarily unavailable | 503         |

## Permissions System

### Permission Format

Permissions follow the format: `resource:action`

**Resources:**

- `users` - User management
- `tenants` - Tenant management
- `system` - System administration

**Actions:**

- `read` - View resources
- `create` - Create new resources
- `update` - Modify existing resources
- `delete` - Remove resources
- `manage` - Full CRUD access
- `config` - System configuration
- `audit` - View audit logs

### Common Permissions

- `users:read` - View user information
- `users:create` - Create new users
- `users:update` - Modify user information
- `users:delete` - Delete users
- `users:manage` - Full user management access
- `tenants:read` - View tenant information
- `tenants:create` - Create new tenants
- `tenants:update` - Modify tenant information
- `tenants:delete` - Delete tenants
- `tenants:manage` - Full tenant management access
- `system:config` - Access system configuration
- `system:audit` - View audit logs

### Role Hierarchy

1. **Super Admin** - All permissions (`*:*`)
2. **System Admin** - System-level permissions (`system:*`)
3. **Tenant Admin** - Tenant management (`tenants:*`, `users:*`)
4. **Manager** - User management within tenant (`users:read`, `users:update`)
5. **User** - Basic access (`users:read` own profile)

## SDK and Libraries

### JavaScript/TypeScript

```bash
npm install @pems/api-client
```

```typescript
import { PEMSClient } from '@pems/api-client'

const client = new PEMSClient({
  baseURL: 'http://localhost:3002',
  authToken: 'your-session-token',
})

// Get users
const users = await client.users.list({
  page: 1,
  limit: 20,
  search: 'john',
})

// Create user
const user = await client.users.create({
  email: 'newuser@example.com',
  password: 'password123',
  name: 'New User',
})
```

## Testing

### Postman Collection

A Postman collection is available with all API endpoints and authentication setup.

### Environment Variables

```bash
# API Configuration
PEMS_API_URL=http://localhost:3002
PEMS_API_TOKEN=your-session-token
PEMS_TENANT_ID=your-tenant-id

# Development
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Security
SESSION_SECRET=your-session-secret
JWT_SECRET=your-jwt-secret

# Rate Limiting
REDIS_URL=redis://localhost:6379
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Changelog

### v1.0.0 (Current)

- Initial API release
- Authentication endpoints
- User management
- Tenant management
- Rate limiting
- Security headers
- Multi-tenant support

### Upcoming Features

- MFA (Multi-Factor Authentication)
- OAuth2 integration
- Webhook support
- Advanced audit logging
- API versioning
- GraphQL endpoint

## Support

For API support and questions:

- Documentation: https://docs.pems.com
- GitHub Issues: https://github.com/pems/api/issues
- Email: api-support@pems.com

## License

This API is licensed under the MIT License. See LICENSE.md for details.
