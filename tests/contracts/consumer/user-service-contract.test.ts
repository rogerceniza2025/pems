import { Pact } from '@pact-foundation/pact';
import { describe, it, expect } from '@jest/globals';

/**
 * Consumer-Driven Contract Testing - User Service
 *
 * This test suite defines contracts between the PEMS frontend application
 * and the user management service, ensuring API compatibility and
 * data structure consistency.
 *
 * Contract Definition:
 * - Consumer: PEMS Frontend Application
 * - Provider: User Management Service
 * - Purpose: Define user management API behavior and data structures
 */

const provider = new Pact({
  consumer: 'pems-frontend',
  provider: 'pems-user-service',
  port: 1235,
  log: process.env.NODE_ENV === 'development',
  logLevel: process.env.NODE_ENV === 'development' ? 'DEBUG' : 'WARN',
});

describe('User Service Contract', () => {
  beforeAll(async () => {
    await provider.setup();
  });

  afterAll(async () => {
    await provider.finalize();
  });

  describe('User Profile API', () => {
    it('should get current user profile', async () => {
      await provider
        .given('an authenticated user')
        .uponReceiving('a GET request to /api/v1/users/me')
        .withRequest({
          method: 'GET',
          path: '/api/v1/users/me',
          headers: {
            'Authorization': expect.stringMatching(/^Bearer [A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.([A-Za-z0-9-_=]+)$/),
            'Content-Type': 'application/json',
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            data: {
              id: expect.stringMatching(/^[a-zA-Z0-9-]+$/),
              email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
              firstName: expect.stringMatching(/^[A-Za-z]{2,}$/),
              lastName: expect.stringMatching(/^[A-Za-z]{2,}$/),
              displayName: expect.stringMatching(/^[A-Za-z\s]+$/),
              avatar: expect.stringMatching(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/),
              role: expect.oneOf(['user', 'admin', 'viewer', 'manager']),
              tenantId: expect.stringMatching(/^[a-zA-Z0-9-]+$/),
              isActive: expect.boolean(),
              emailVerified: expect.boolean(),
              lastLoginAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
              createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
              updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
              preferences: {
                language: expect.stringMatching(/^[a-z]{2}-[A-Z]{2}$/),
                timezone: expect.stringMatching(/^[A-Za-z_]+\/[A-Za-z_]+$/),
                theme: expect.oneOf(['light', 'dark', 'auto']),
                notifications: {
                  email: expect.boolean(),
                  push: expect.boolean(),
                  inApp: expect.boolean(),
                },
              },
            },
          },
        });

      // Test getting user profile
      const response = await fetch(`${provider.mockService.baseUrl}/api/v1/users/me`, {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token',
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.id).toBeDefined();
      expect(responseBody.data.email).toBeDefined();
    });

    it('should update user profile', async () => {
      await provider
        .given('an authenticated user')
        .uponReceiving('a PUT request to /api/v1/users/me')
        .withRequest({
          method: 'PUT',
          path: '/api/v1/users/me',
          headers: {
            'Authorization': expect.stringMatching(/^Bearer [A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.([A-Za-z0-9-_=]+)$/),
            'Content-Type': 'application/json',
          },
          body: {
            firstName: expect.stringMatching(/^[A-Za-z]{2,}$/),
            lastName: expect.stringMatching(/^[A-Za-z]{2,}$/),
            displayName: expect.stringMatching(/^[A-Za-z\s]+$/),
            avatar: expect.stringMatching(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/),
            preferences: {
              language: expect.stringMatching(/^[a-z]{2}-[A-Z]{2}$/),
              timezone: expect.stringMatching(/^[A-Za-z_]+\/[A-Za-z_]+$/),
              theme: expect.oneOf(['light', 'dark', 'auto']),
              notifications: {
                email: expect.boolean(),
                push: expect.boolean(),
                inApp: expect.boolean(),
              },
            },
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            message: 'Profile updated successfully',
            data: {
              id: expect.stringMatching(/^[a-zA-Z0-9-]+$/),
              email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
              firstName: expect.stringMatching(/^[A-Za-z]{2,}$/),
              lastName: expect.stringMatching(/^[A-Za-z]{2,}$/),
              displayName: expect.stringMatching(/^[A-Za-z\s]+$/),
              avatar: expect.stringMatching(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/),
              preferences: {
                language: expect.stringMatching(/^[a-z]{2}-[A-Z]{2}$/),
                timezone: expect.stringMatching(/^[A-Za-z_]+\/[A-Za-z_]+$/),
                theme: expect.oneOf(['light', 'dark', 'auto']),
                notifications: {
                  email: expect.boolean(),
                  push: expect.boolean(),
                  inApp: expect.boolean(),
                },
              },
              updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
            },
          },
        });

      // Test profile update
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        displayName: 'Jane Smith',
        avatar: 'https://example.com/avatar.jpg',
        preferences: {
          language: 'en-US',
          timezone: 'America/New_York',
          theme: 'dark',
          notifications: {
            email: true,
            push: false,
            inApp: true,
          },
        },
      };

      const response = await fetch(`${provider.mockService.baseUrl}/api/v1/users/me`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.firstName).toBe('Jane');
      expect(responseBody.data.lastName).toBe('Smith');
    });

    it('should validate profile update data', async () => {
      await provider
        .given('invalid profile update data')
        .uponReceiving('a PUT request to /api/v1/users/me with validation errors')
        .withRequest({
          method: 'PUT',
          path: '/api/v1/users/me',
          headers: {
            'Authorization': expect.stringMatching(/^Bearer [A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.([A-Za-z0-9-_=]+)$/),
            'Content-Type': 'application/json',
          },
          body: expect.anything(),
        })
        .willRespondWith({
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: false,
            message: expect.stringMatching(/Validation failed/),
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: expect.stringMatching(/firstName|lastName|displayName|preferences/),
                message: expect.stringMatching(/required|invalid/),
              }),
            ]),
          },
        });

      // Test validation errors
      const invalidUpdateData = {
        firstName: '',
        lastName: '',
        displayName: 123,
        avatar: 'invalid-url',
        preferences: {
          language: 'invalid',
          timezone: 'invalid',
          theme: 'invalid',
        },
      };

      const response = await fetch(`${provider.mockService.baseUrl}/api/v1/users/me`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidUpdateData),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.success).toBe(false);
      expect(responseBody.errors).toBeDefined();
    });
  });

  describe('User Search API', () => {
    it('should search users with valid query', async () => {
      await provider
        .given('user search functionality')
        .uponReceiving('a GET request to /api/v1/users/search')
        .withRequest({
          method: 'GET',
          path: '/api/v1/users/search',
          headers: {
            'Authorization': expect.stringMatching(/^Bearer [A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.([A-Za-z0-9-_=]+)$/),
            'Content-Type': 'application/json',
          },
          query: {
            q: expect.stringMatching(/^[a-zA-Z0-9\s]+$/),
            page: expect.stringMatching(/^\d+$/),
            limit: expect.stringMatching(/^[1-9]\d*$/),
            role: expect.oneOf(['user', 'admin', 'viewer', 'manager']),
            tenantId: expect.stringMatching(/^[a-zA-Z0-9-]+$/),
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            data: {
              users: expect.arrayContaining([
                expect.objectContaining({
                  id: expect.stringMatching(/^[a-zA-Z0-9-]+$/),
                  email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
                  firstName: expect.stringMatching(/^[A-Za-z]{2,}$/),
                  lastName: expect.stringMatching(/^[A-Za-z]{2,}$/),
                  displayName: expect.stringMatching(/^[A-Za-z\s]+$/),
                  avatar: expect.stringMatching(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/),
                  role: expect.oneOf(['user', 'admin', 'viewer', 'manager']),
                  isActive: expect.boolean(),
                  lastLoginAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
                }),
              ]),
            },
            pagination: {
              page: expect.numberMatching(/^\d+$/),
              limit: expect.numberMatching(/^\d+$/),
              total: expect.numberMatching(/^\d+$/),
              totalPages: expect.numberMatching(/^\d+$/),
              hasNext: expect.boolean(),
              hasPrev: expect.boolean(),
            },
          },
        });

      // Test user search
      const response = await fetch(
        `${provider.mockService.baseUrl}/api/v1/users/search?q=john&page=1&limit=10&role=user&tenantId=tenant-1`,
        {
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.users).toBeDefined();
      expect(responseBody.data.pagination).toBeDefined();
    });

    it('should handle empty search results', async () => {
      await provider
        .given('no users found for search query')
        .uponReceiving('a GET request to /api/v1/users/search with no results')
        .withRequest({
          method: 'GET',
          path: '/api/v1/users/search',
          headers: {
            'Authorization': expect.stringMatching(/^Bearer [A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.([A-Za-z0-9-_=]+)$/),
            'Content-Type': 'application/json',
          },
          query: {
            q: expect.stringMatching(/^[a-zA-Z0-9\s]+$/),
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            data: {
              users: [],
            },
            pagination: {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            },
          },
        });

      // Test empty search results
      const response = await fetch(
        `${provider.mockService.baseUrl}/api/v1/users/search?q=nonexistentuser`,
        {
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.users).toEqual([]);
      expect(responseBody.data.pagination.total).toBe(0);
    });
  });

  describe('User Preferences API', () => {
    it('should get user preferences', async () => {
      await provider
        .given('an authenticated user')
        .uponReceiving('a GET request to /api/v1/users/me/preferences')
        .withRequest({
          method: 'GET',
          path: '/api/v1/users/me/preferences',
          headers: {
            'Authorization': expect.stringMatching(/^Bearer [A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.([A-Za-z0-9-_=]+)$/),
            'Content-Type': 'application/json',
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            data: {
              language: expect.stringMatching(/^[a-z]{2}-[A-Z]{2}$/),
              timezone: expect.stringMatching(/^[A-Za-z_]+\/[A-Za-z_]+$/),
              theme: expect.oneOf(['light', 'dark', 'auto']),
              notifications: {
                email: expect.boolean(),
                push: expect.boolean(),
                inApp: expect.boolean(),
                security: {
                  loginAlerts: expect.boolean(),
                  passwordChangeAlerts: expect.boolean(),
                  twoFactorReminder: expect.boolean(),
                },
                marketing: {
                  newsletter: expect.boolean(),
                  productUpdates: expect.boolean(),
                  betaFeatures: expect.boolean(),
                },
              },
              accessibility: {
                highContrast: expect.boolean(),
                largeText: expect.boolean(),
                reducedMotion: expect.boolean(),
                screenReader: expect.boolean(),
              },
              privacy: {
                dataSharing: expect.boolean(),
                analytics: expect.boolean(),
                tracking: expect.boolean(),
              },
              features: {
                betaAccess: expect.boolean(),
                advancedMode: expect.boolean(),
                developerMode: expect.boolean(),
              },
            },
          },
        });

      // Test getting preferences
      const response = await fetch(`${provider.mockService.baseUrl}/api/v1/users/me/preferences`, {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token',
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.language).toBeDefined();
      expect(responseBody.data.theme).toBeDefined();
    });

    it('should update user preferences', async () => {
      await provider
        .given('an authenticated user')
        .uponReceiving('a PUT request to /api/v1/users/me/preferences')
        .withRequest({
          method: 'PUT',
          path: '/api/v1/users/me/preferences',
          headers: {
            'Authorization': expect.stringMatching(/^Bearer [A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.([A-Za-z0-9-_=]+)$/),
            'Content-Type': 'application/json',
          },
          body: {
            language: expect.stringMatching(/^[a-z]{2}-[A-Z]{2}$/),
            timezone: expect.stringMatching(/^[A-Za-z_]+\/[A-Za-z_]+$/),
            theme: expect.oneOf(['light', 'dark', 'auto']),
            notifications: {
              email: expect.boolean(),
              push: expect.boolean(),
              inApp: expect.boolean(),
              security: {
                loginAlerts: expect.boolean(),
                passwordChangeAlerts: expect.boolean(),
                twoFactorReminder: expect.boolean(),
              },
              marketing: {
                newsletter: expect.boolean(),
                productUpdates: expect.boolean(),
                betaFeatures: expect.boolean(),
              },
              accessibility: {
                highContrast: expect.boolean(),
                largeText: expect.boolean(),
                reducedMotion: expect.boolean(),
                screenReader: expect.boolean(),
              },
              privacy: {
                dataSharing: expect.boolean(),
                analytics: expect.boolean(),
                tracking: expect.boolean(),
              },
              features: {
                betaAccess: expect.boolean(),
                advancedMode: expect.boolean(),
                developerMode: expect.boolean(),
              },
            },
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            message: 'Preferences updated successfully',
            data: {
              language: expect.stringMatching(/^[a-z]{2}-[A-Z]{2}$/),
              timezone: expect.stringMatching(/^[A-Za-z_]+\/[A-Za-z_]+$/),
              theme: expect.oneOf(['light', 'dark', 'auto']),
              notifications: {
                email: expect.boolean(),
                push: expect.boolean(),
                inApp: expect.boolean(),
                security: {
                  loginAlerts: expect.boolean(),
                  passwordChangeAlerts: expect.boolean(),
                  twoFactorReminder: expect.boolean(),
                },
                marketing: {
                  newsletter: expect.boolean(),
                  productUpdates: expect.boolean(),
                  betaFeatures: expect.boolean(),
                },
                accessibility: {
                  highContrast: expect.boolean(),
                  largeText: expect.boolean(),
                  reducedMotion: expect.boolean(),
                  screenReader: expect.boolean(),
                },
                privacy: {
                  dataSharing: expect.boolean(),
                  analytics: expect.boolean(),
                  tracking: expect.boolean(),
                },
                features: {
                  betaAccess: expect.boolean(),
                  advancedMode: expect.boolean(),
                  developerMode: expect.boolean(),
                },
              },
              updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
            },
          },
        });

      // Test updating preferences
      const preferencesData = {
        language: 'en-US',
        timezone: 'America/New_York',
        theme: 'dark',
        notifications: {
          email: true,
          push: false,
          inApp: true,
          security: {
            loginAlerts: true,
            passwordChangeAlerts: true,
            twoFactorReminder: false,
          },
          marketing: {
            newsletter: false,
            productUpdates: true,
            betaFeatures: false,
          },
          accessibility: {
            highContrast: false,
            largeText: false,
            reducedMotion: false,
            screenReader: false,
          },
          privacy: {
            dataSharing: false,
            analytics: true,
            tracking: true,
          },
          features: {
            betaAccess: false,
            advancedMode: false,
            developerMode: false,
          },
      };

      const response = await fetch(`${provider.mockService.baseUrl}/api/v1/users/me/preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferencesData),
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.language).toBe('en-US');
      expect(responseBody.data.theme).toBe('dark');
    });
  });

  describe('User Activity API', () => {
    it('should get user activity log', async () => {
      await provider
        .given('an authenticated user')
        .uponReceiving('a GET request to /api/v1/users/me/activity')
        .withRequest({
          method: 'GET',
          path: '/api/v1/users/me/activity',
          headers: {
            'Authorization': expect.stringMatching(/^Bearer [A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.([A-Za-z0-9-_=]+)$/),
            'Content-Type': 'application/json',
          },
          query: {
            page: expect.stringMatching(/^\d+$/),
            limit: expect.stringMatching(/^[1-9]\d*$/),
            action: expect.oneOf(['login', 'logout', 'password_change', 'profile_update', 'setting_change', 'api_access']),
            dateFrom: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
            dateTo: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            data: {
              activities: expect.arrayContaining([
                expect.objectContaining({
                  id: expect.stringMatching(/^[a-zA-Z0-9-]+$/),
                  action: expect.oneOf(['login', 'logout', 'password_change', 'profile_update', 'setting_change', 'api_access']),
                  description: expect.string(),
                  timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
                  ipAddress: expect.stringMatching(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/),
                  userAgent: expect.string(),
                  metadata: expect.object(),
                }),
              ]),
            },
            pagination: {
              page: expect.numberMatching(/^\d+$/),
              limit: expect.numberMatching(/^\d+$/),
              total: expect.numberMatching(/^\d+$/),
              totalPages: expect.numberMatching(/^\d+$/),
              hasNext: expect.boolean(),
              hasPrev: expect.boolean(),
            },
          },
        });

      // Test getting user activity
      const response = await fetch(
        `${provider.mockService.baseUrl}/api/v1/users/me/activity?page=1&limit=20&action=login`,
        {
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.activities).toBeDefined();
      expect(responseBody.data.pagination).toBeDefined();
    });
  });
});

/**
 * User Service Contract Testing Utilities
 */
export class UserServiceContractUtils {
  static generateValidUserUpdateData() {
    return {
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'John Doe',
      avatar: 'https://example.com/avatar.jpg',
      preferences: {
        language: 'en-US',
        timezone: 'America/New_York',
        theme: 'light',
        notifications: {
          email: true,
          push: false,
          inApp: true,
        },
      },
    };
  }

  static generateValidPreferencesData() {
    return {
      language: 'en-US',
      timezone: 'America/New_York',
      theme: 'light',
      notifications: {
        email: true,
        push: false,
        inApp: true,
        security: {
          loginAlerts: true,
          passwordChangeAlerts: true,
          twoFactorReminder: false,
        },
        marketing: {
          newsletter: false,
          productUpdates: true,
          betaFeatures: false,
        },
        accessibility: {
          highContrast: false,
          largeText: false,
          reducedMotion: false,
          screenReader: false,
        },
        privacy: {
          dataSharing: false,
          analytics: true,
          tracking: true,
        },
        features: {
          betaAccess: false,
          advancedMode: false,
          developerMode: false,
        },
      },
    };
  }

  static generateInvalidUserUpdateData() {
    return {
      firstName: '',
      lastName: '',
      displayName: 123,
      avatar: 'invalid-url',
      preferences: {
        language: 'invalid',
        timezone: 'invalid',
        theme: 'invalid',
        notifications: {
          email: 'invalid',
          push: 'invalid',
          inApp: 'invalid',
        },
      },
    };
  }

  static validateUserStructure(user: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!user.id || !/^[a-zA-Z0-9-]+$/.test(user.id)) {
      errors.push('Invalid user ID');
    }

    if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      errors.push('Invalid email format');
    }

    if (!user.firstName || !/^[A-Za-z]{2,}$/.test(user.firstName)) {
      errors.push('Invalid first name');
    }

    if (!user.lastName || !/^[A-Za-z]{2,}$/.test(user.lastName)) {
      errors.push('Invalid last name');
    }

    const validRoles = ['user', 'admin', 'viewer', 'manager'];
    if (!user.role || !validRoles.includes(user.role)) {
      errors.push('Invalid user role');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validatePreferencesStructure(preferences: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!preferences.language || !/^[a-z]{2}-[A-Z]{2}$/.test(preferences.language)) {
      errors.push('Invalid language format');
    }

    if (!preferences.theme || !['light', 'dark', 'auto'].includes(preferences.theme)) {
      errors.push('Invalid theme value');
    }

    if (preferences.notifications && typeof preferences.notifications !== 'object') {
      errors.push('Invalid notifications structure');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validatePaginationStructure(pagination: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!pagination.page || typeof pagination.page !== 'number') {
      errors.push('Invalid page number');
    }

    if (!pagination.limit || typeof pagination.limit !== 'number' || pagination.limit < 1 || pagination.limit > 100) {
      errors.push('Invalid limit value');
    }

    if (!pagination.total || typeof pagination.total !== 'number') {
      errors.push('Invalid total count');
    }

    if (typeof pagination.hasNext !== 'boolean') {
      errors.push('Invalid hasNext value');
    }

    if (typeof pagination.hasPrev !== 'boolean') {
      errors.push('Invalid hasPrev value');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}