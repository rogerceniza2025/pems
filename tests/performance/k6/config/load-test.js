// Performance Testing Configuration for PEMS
// Supports 1,000-10,000 concurrent users load testing

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics for performance monitoring
export const errorRate = new Rate('errors');
export const responseTime = new Rate('response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users (baseline)
    { duration: '3m', target: 1000 }, // Ramp up to 1,000 users
    { duration: '5m', target: 1000 }, // Stay at 1,000 users (target)
    { duration: '3m', target: 5000 }, // Ramp up to 5,000 users
    { duration: '5m', target: 5000 }, // Stay at 5,000 users (moderate load)
    { duration: '2m', target: 10000 }, // Spike to 10,000 users
    { duration: '3m', target: 10000 }, // Stay at 10,000 users (stress test)
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // API Response Time SLAs
    http_req_failed: ['rate<0.1'], // Error rate < 10%
    checks: ['rate>0.9'], // 90%+ check pass rate
  },
  ext: {
    loadimpact: {
      projectID: 3594638, // k6 Cloud project ID (optional)
      name: 'PEMS Performance Test',
    },
  },
};

// Configuration for different test types
export const testConfigs = {
  light: {
    vus: 100,
    duration: '2m',
    thresholds: {
      http_req_duration: ['p(95)<300'],
      http_req_failed: ['rate<0.05'],
    },
  },
  moderate: {
    vus: 1000,
    duration: '5m',
    thresholds: {
      http_req_duration: ['p(95)<500'],
      http_req_failed: ['rate<0.08'],
    },
  },
  heavy: {
    vus: 5000,
    duration: '10m',
    thresholds: {
      http_req_duration: ['p(95)<800'],
      http_req_failed: ['rate<0.1'],
    },
  },
  stress: {
    vus: 10000,
    duration: '15m',
    thresholds: {
      http_req_duration: ['p(95)<1000'],
      http_req_failed: ['rate<0.15'],
    },
  },
};

// Base URL configuration
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const API_BASE_URL = `${BASE_URL}/api`;

// Common headers for API requests
export const commonHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'k6-PEMS-Performance-Test',
};

// Helper functions for authentication and testing
export function getRandomEmail() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `user${timestamp}${random}@example.com`;
}

export function getRandomPassword() {
  return `Pass${Math.random().toString(36).substring(7)}!123`;
}

export function getRandomStudentData() {
  const firstName = ['John', 'Jane', 'Michael', 'Sarah', 'Robert', 'Emily'][Math.floor(Math.random() * 6)];
  const lastName = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'][Math.floor(Math.random() * 6)];
  const grade = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'][Math.floor(Math.random() * 12)];

  return {
    firstName,
    lastName,
    email: getRandomEmail(),
    grade,
    dateOfBirth: '2008-01-01',
  };
}

export function authenticateUser(email, password) {
  const loginPayload = JSON.stringify({
    email,
    password,
  });

  const loginResponse = http.post(`${API_BASE_URL}/auth/login`, loginPayload, {
    headers: commonHeaders,
  });

  const loginSuccess = check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'token received': (r) => r.json('token') !== undefined,
  });

  if (loginSuccess) {
    return {
      token: loginResponse.json('token'),
      userId: loginResponse.json('user.id'),
      headers: {
        ...commonHeaders,
        'Authorization': `Bearer ${loginResponse.json('token')}`,
      },
    };
  }

  return null;
}

// Performance monitoring functions
export function logPerformanceMetrics(response, operation) {
  const metrics = {
    operation,
    status: response.status,
    duration: response.timings.duration,
    size: response.body.length,
    timestamp: new Date().toISOString(),
  };

  console.log(JSON.stringify(metrics));

  return metrics;
}

export function measureDatabaseQuery(queryName, queryFunction) {
  const start = Date.now();
  const result = queryFunction();
  const duration = Date.now() - start;

  console.log(`Database Query: ${queryName} took ${duration}ms`);

  return {
    result,
    duration,
  };
}

// Cleanup function for test data
export function cleanupTestData(userId, authHeaders) {
  // Clean up created test data to avoid database bloat
  try {
    http.del(`${API_BASE_URL}/users/${userId}`, null, {
      headers: authHeaders,
    });
  } catch (error) {
    console.log('Cleanup failed:', error.message);
  }
}

// Sleep function with configurable duration
export function smartSleep(seconds = 1) {
  sleep(seconds);
}

// Error handling wrapper
export function safeExecute(operation, ...args) {
  try {
    return operation(...args);
  } catch (error) {
    console.error(`Operation failed: ${error.message}`);
    errorRate.add(1);
    return null;
  }
}