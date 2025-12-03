import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

/**
 * Event-Driven Integration Tests
 *
 * This test suite validates the integration between microservices using
 * event-driven communication patterns, ensuring proper event publishing,
 * consumption, and event-driven workflows.
 */

describe('Event-Driven Integration', () => {
  let eventBroker: EventEmitter;
  let eventClients: Map<string, WebSocket> = new Map();
  let capturedEvents: Array<{ event: string; data: any; timestamp: number }> = [];

  beforeAll(async () => {
    // Initialize event broker (mock for testing)
    eventBroker = new EventEmitter();
    eventBroker.setMaxListeners(100);

    // Setup event capture
    eventBroker.onAny((event: string, ...args: any[]) => {
      capturedEvents.push({
        event,
        data: args[0],
        timestamp: Date.now(),
      });
    });
  });

  afterAll(async () => {
    // Cleanup WebSocket connections
    for (const [name, ws] of eventClients.entries()) {
      ws.close();
    }
    eventClients.clear();
  });

  beforeEach(() => {
    capturedEvents = [];
  });

  function setupEventClient(serviceName: string): WebSocket {
    const ws = new WebSocket(`ws://localhost:8080/events/${serviceName}`);

    ws.on('message', (data) => {
      const event = JSON.parse(data.toString());
      eventBroker.emit(event.type, event);
    });

    eventClients.set(serviceName, ws);
    return ws;
  }

  function publishEvent(eventType: string, data: any, source: string = 'test-service'): void {
    const event = {
      id: generateEventId(),
      type: eventType,
      source,
      data,
      timestamp: new Date().toISOString(),
      version: '1.0',
    };

    eventBroker.emit(eventType, event);
  }

  function generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  function waitForEvent(eventType: string, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Event ${eventType} not received within ${timeout}ms`));
      }, timeout);

      const handler = (event: any) => {
        clearTimeout(timer);
        resolve(event);
      };

      eventBroker.once(eventType, handler);
    });
  }

  describe('User Registration Event Flow', () => {
    let authClient: WebSocket;
    let userClient: WebSocket;
    let notificationClient: WebSocket;
    let analyticsClient: WebSocket;

    beforeEach(() => {
      authClient = setupEventClient('auth-service');
      userClient = setupEventClient('user-service');
      notificationClient = setupEventClient('notification-service');
      analyticsClient = setupEventClient('analytics-service');
    });

    it('should trigger complete event chain for user registration', async () => {
      const userData = {
        id: 'user_123',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 'tenant_456',
      };

      try {
        // Simulate user registration in auth service
        publishEvent('user.registered', userData, 'auth-service');

        // Wait for expected events
        const [profileCreated, welcomeEmail, analyticsEvent] = await Promise.all([
          waitForEvent('user.profile.created'),
          waitForEvent('notification.email.sent'),
          waitForEvent('analytics.user.registered'),
        ]);

        // Verify profile creation event
        expect(profileCreated.data.userId).toBe(userData.id);
        expect(profileCreated.data.email).toBe(userData.email);

        // Verify welcome email notification
        expect(welcomeEmail.data.type).toBe('welcome_email');
        expect(welcomeEmail.data.recipient).toBe(userData.email);

        // Verify analytics event
        expect(analyticsEvent.data.userId).toBe(userData.id);
        expect(analyticsEvent.data.event).toBe('user_registration');

        // Verify event ordering
        const userRegisteredEvents = capturedEvents.filter(e => e.event === 'user.registered');
        const profileCreatedEvents = capturedEvents.filter(e => e.event === 'user.profile.created');

        expect(userRegisteredEvents).toHaveLength(1);
        expect(profileCreatedEvents.length).toBeGreaterThan(0);

      } catch (error) {
        console.error('User registration event flow test failed:', error);
        throw error;
      }
    });

    it('should handle event processing failures gracefully', async () => {
      const userData = {
        id: 'user_error_123',
        email: 'error.user@example.com',
      };

      try {
        // Simulate user registration with missing required data
        publishEvent('user.registered', userData, 'auth-service');

        // Wait for error handling events
        const [errorEvent, retryEvent] = await Promise.all([
          waitForEvent('user.registration.failed'),
          waitForEvent('user.registration.retry'),
        ]);

        expect(errorEvent.data.error).toBeDefined();
        expect(errorEvent.data.userId).toBe(userData.id);

        expect(retryEvent.data.attempt).toBe(1);
        expect(retryEvent.data.maxRetries).toBe(3);

      } catch (error) {
        console.error('Event failure handling test failed:', error);
        throw error;
      }
    });
  });

  describe('Tenant Management Event Flow', () => {
    let tenantClient: WebSocket;
    let billingClient: WebSocket;
    let securityClient: WebSocket;

    beforeEach(() => {
      tenantClient = setupEventClient('tenant-service');
      billingClient = setupEventClient('billing-service');
      securityClient = setupEventClient('security-service');
    });

    it('should propagate tenant creation events to all services', async () => {
      const tenantData = {
        id: 'tenant_789',
        name: 'New Company',
        domain: 'newcompany.example.com',
        plan: 'professional',
        maxUsers: 100,
      };

      try {
        // Simulate tenant creation
        publishEvent('tenant.created', tenantData, 'tenant-service');

        // Wait for service responses
        const [billingAccount, securityPolicy, analyticsSetup] = await Promise.all([
          waitForEvent('billing.account.created'),
          waitForEvent('security.policy.initialized'),
          waitForEvent('analytics.tenant.setup.completed'),
        ]);

        // Verify billing account creation
        expect(billingAccount.data.tenantId).toBe(tenantData.id);
        expect(billingAccount.data.plan).toBe(tenantData.plan);

        // Verify security policy initialization
        expect(securityPolicy.data.tenantId).toBe(tenantData.id);
        expect(securityPolicy.data.defaultPolicy).toBe(true);

        // Verify analytics setup
        expect(analyticsSetup.data.tenantId).toBe(tenantData.id);
        expect(analyticsSetup.data.trackingEnabled).toBe(true);

      } catch (error) {
        console.error('Tenant creation event flow test failed:', error);
        throw error;
      }
    });

    it('should handle tenant configuration updates', async () => {
      const configUpdate = {
        tenantId: 'tenant_789',
        configuration: {
          features: ['user-management', 'notifications', 'reporting'],
          limits: {
            maxUsers: 200,
            maxApiCalls: 1000000,
          },
        },
      };

      try {
        // Simulate configuration update
        publishEvent('tenant.configuration.updated', configUpdate, 'tenant-service');

        // Wait for configuration propagation
        const [userLimitsUpdate, billingUpdate, securityUpdate] = await Promise.all([
          waitForEvent('tenant.user.limits.updated'),
          waitForEvent('tenant.billing.plan.updated'),
          waitForEvent('tenant.security.rules.updated'),
        ]);

        expect(userLimitsUpdate.data.tenantId).toBe(configUpdate.tenantId);
        expect(userLimitsUpdate.data.maxUsers).toBe(configUpdate.configuration.limits.maxUsers);

        expect(billingUpdate.data.tenantId).toBe(configUpdate.tenantId);

        expect(securityUpdate.data.tenantId).toBe(configUpdate.tenantId);

      } catch (error) {
        console.error('Configuration update event flow test failed:', error);
        throw error;
      }
    });
  });

  describe('Security Event Integration', () => {
    let securityClient: WebSocket;
    let authClient: WebSocket;
    let auditClient: WebSocket;

    beforeEach(() => {
      securityClient = setupEventClient('security-service');
      authClient = setupEventClient('auth-service');
      auditClient = setupEventClient('audit-service');
    });

    it('should handle security threat events across services', async () => {
      const securityEvent = {
        userId: 'user_threat_123',
        ipAddress: '192.168.1.100',
        threatType: 'brute_force_attack',
        severity: 'high',
        details: {
          failedAttempts: 10,
          timeWindow: '5 minutes',
        },
      };

      try {
        // Simulate security threat detection
        publishEvent('security.threat.detected', securityEvent, 'security-service');

        // Wait for security response events
        const [accountLocked, alertSent, auditLogged] = await Promise.all([
          waitForEvent('security.account.locked'),
          waitForEvent('security.alert.sent'),
          waitForEvent('audit.security.event.logged'),
        ]);

        // Verify account lockout
        expect(accountLocked.data.userId).toBe(securityEvent.userId);
        expect(accountLocked.data.reason).toBe('security_threat');

        // Verify security alert
        expect(alertSent.data.type).toBe('security_breach');
        expect(alertSent.data.severity).toBe('high');

        // Verify audit logging
        expect(auditLogged.data.eventType).toBe('security_threat_detected');
        expect(auditLogged.data.userId).toBe(securityEvent.userId);

      } catch (error) {
        console.error('Security event integration test failed:', error);
        throw error;
      }
    });

    it('should handle successful authentication events', async () => {
      const authEvent = {
        userId: 'user_auth_123',
        email: 'user@example.com',
        tenantId: 'tenant_456',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        timestamp: new Date().toISOString(),
      };

      try {
        // Simulate successful authentication
        publishEvent('authentication.success', authEvent, 'auth-service');

        // Wait for authentication processing events
        const [lastLoginUpdate, analyticsEvent, auditEvent] = await Promise.all([
          waitForEvent('user.last_login.updated'),
          waitForEvent('analytics.authentication.success'),
          waitForEvent('audit.authentication.logged'),
        ]);

        // Verify last login update
        expect(lastLoginUpdate.data.userId).toBe(authEvent.userId);
        expect(lastLoginUpdate.data.lastLoginAt).toBe(authEvent.timestamp);

        // Verify analytics tracking
        expect(analyticsEvent.data.userId).toBe(authEvent.userId);
        expect(analyticsEvent.data.event).toBe('successful_login');

        // Verify audit logging
        expect(auditEvent.data.userId).toBe(authEvent.userId);
        expect(auditEvent.data.success).toBe(true);

      } catch (error) {
        console.error('Authentication event integration test failed:', error);
        throw error;
      }
    });
  });

  describe('Data Synchronization Events', () => {
    let userClient: WebSocket;
    let analyticsClient: WebSocket;
    let cacheClient: WebSocket;

    beforeEach(() => {
      userClient = setupEventClient('user-service');
      analyticsClient = setupEventClient('analytics-service');
      cacheClient = setupEventClient('cache-service');
    });

    it('should synchronize user profile updates across services', async () => {
      const profileUpdate = {
        userId: 'user_sync_123',
        updates: {
          firstName: 'Updated',
          lastName: 'Name',
          preferences: {
            theme: 'dark',
            language: 'en-US',
            notifications: {
              email: true,
              push: false,
            },
          },
        },
        updatedAt: new Date().toISOString(),
      };

      try {
        // Simulate profile update
        publishEvent('user.profile.updated', profileUpdate, 'user-service');

        // Wait for synchronization events
        const [cacheUpdate, analyticsUpdate, searchIndex] = await Promise.all([
          waitForEvent('cache.user.updated'),
          waitForEvent('analytics.user.profile.changed'),
          waitForEvent('search.user.index.updated'),
        ]);

        // Verify cache update
        expect(cacheUpdate.data.userId).toBe(profileUpdate.userId);
        expect(cacheUpdate.data.updates).toEqual(profileUpdate.updates);

        // Verify analytics tracking
        expect(analyticsUpdate.data.userId).toBe(profileUpdate.userId);
        expect(analyticsUpdate.data.changes).toEqual(profileUpdate.updates);

        // Verify search index update
        expect(searchIndex.data.userId).toBe(profileUpdate.userId);

      } catch (error) {
        console.error('Data synchronization event test failed:', error);
        throw error;
      }
    });

    it('should handle batch operations', async () => {
      const batchUpdate = {
        tenantId: 'tenant_batch_456',
        operation: 'bulk_update',
        entities: [
          { type: 'user', id: 'user_1', data: { status: 'active' } },
          { type: 'user', id: 'user_2', data: { status: 'active' } },
          { type: 'user', id: 'user_3', data: { status: 'inactive' } },
        ],
      };

      try {
        // Simulate batch update
        publishEvent('batch.operation.started', batchUpdate, 'user-service');

        // Wait for batch processing events
        const [batchProgress, batchCompleted] = await Promise.all([
          waitForEvent('batch.operation.progress'),
          waitForEvent('batch.operation.completed'),
        ]);

        // Verify progress tracking
        expect(batchProgress.data.tenantId).toBe(batchUpdate.tenantId);
        expect(batchProgress.data.processed).toBeGreaterThan(0);
        expect(batchProgress.data.total).toBe(batchUpdate.entities.length);

        // Verify completion
        expect(batchCompleted.data.tenantId).toBe(batchUpdate.tenantId);
        expect(batchCompleted.data.successful).toBe(2); // 2 active users
        expect(batchCompleted.data.failed).toBe(1); // 1 inactive user

      } catch (error) {
        console.error('Batch operations event test failed:', error);
        throw error;
      }
    });
  });

  describe('Event Ordering and Consistency', () => {
    it('should maintain event ordering for user workflows', async () => {
      const userId = 'user_order_123';
      const events = [
        { type: 'user.registered', data: { id: userId, email: 'user@example.com' } },
        { type: 'user.profile.created', data: { id: userId, firstName: 'John' } },
        { type: 'user.preferences.set', data: { id: userId, theme: 'light' } },
        { type: 'user.welcome.sent', data: { id: userId, recipient: 'user@example.com' } },
      ];

      try {
        // Publish events in sequence
        events.forEach((event, index) => {
          setTimeout(() => {
            publishEvent(event.type, event.data, 'user-service');
          }, index * 100); // 100ms delay between events
        });

        // Wait for all events to be processed
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify event ordering in captured events
        const capturedOrder = capturedEvents
          .filter(e => e.data.id === userId)
          .sort((a, b) => a.timestamp - b.timestamp)
          .map(e => e.event);

        const expectedOrder = events.map(e => e.type);
        expect(capturedOrder).toEqual(expectedOrder);

      } catch (error) {
        console.error('Event ordering test failed:', error);
        throw error;
      }
    });

    it('should handle duplicate events idempotently', async () => {
      const duplicateEvent = {
        id: 'evt_duplicate_test',
        type: 'user.profile.updated',
        data: {
          userId: 'user_duplicate_123',
          updates: { firstName: 'Duplicate Test' },
        },
      };

      try {
        // Publish the same event multiple times
        publishEvent(duplicateEvent.type, duplicateEvent.data, 'user-service');
        publishEvent(duplicateEvent.type, duplicateEvent.data, 'user-service');
        publishEvent(duplicateEvent.type, duplicateEvent.data, 'user-service');

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify event was only processed once
        const processedEvents = capturedEvents.filter(e => e.event === duplicateEvent.type);
        expect(processedEvents.length).toBeLessThanOrEqual(1);

      } catch (error) {
        console.error('Duplicate event handling test failed:', error);
        throw error;
      }
    });
  });
});

/**
 * Event-Driven Integration Test Utilities
 */
export class EventIntegrationUtils {
  static createEventBus(): EventEmitter {
    const bus = new EventEmitter();
    bus.setMaxListeners(100);
    return bus;
  }

  static async publishEventAndWaitForResponse(
    eventBus: EventEmitter,
    eventType: string,
    eventData: any,
    responseEventType: string,
    timeout: number = 5000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Response event not received within ${timeout}ms`));
      }, timeout);

      eventBus.once(responseEventType, (response) => {
        clearTimeout(timer);
        resolve(response);
      });

      eventBus.emit(eventType, eventData);
    });
  }

  static validateEventStructure(event: any): boolean {
    return (
      event.id &&
      event.type &&
      event.source &&
      event.timestamp &&
      event.version &&
      event.data
    );
  }

  static generateEventCorrelationId(): string {
    return `correlation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static async waitForMultipleEvents(
    eventBus: EventEmitter,
    eventTypes: string[],
    timeout: number = 10000
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    const promises = eventTypes.map(eventType =>
      new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Event ${eventType} not received`));
        }, timeout);

        eventBus.once(eventType, (event) => {
          clearTimeout(timer);
          results.set(eventType, event);
          resolve();
        });
      })
    );

    await Promise.all(promises);
    return results;
  }
}