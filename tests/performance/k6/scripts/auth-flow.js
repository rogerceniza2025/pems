// Authentication Load Testing Script
// Tests the performance of login, logout, and token refresh operations

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import {
  authenticateUser,
  getRandomEmail,
  getRandomPassword,
  getRandomStudentData,
  commonHeaders,
  BASE_URL,
  API_BASE_URL,
  safeExecute,
  logPerformanceMetrics,
  cleanupTestData
} from './config/load-test.js';

// Performance metrics
const loginSuccessRate = new Rate('login_success_rate');
const loginResponseTime = new Trend('login_response_time');
const logoutSuccessRate = new Rate('logout_success_rate');
const tokenRefreshSuccessRate = new Rate('token_refresh_success_rate');

// Test data pool
const testUsers = [];

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Warm up with 50 users
    { duration: '3m', target: 200 },  // Ramp to 200 users
    { duration: '5m', target: 500 },  // Ramp to 500 users
    { duration: '3m', target: 1000 }, // Ramp to 1000 users
    { duration: '5m', target: 1000 }, // Stay at 1000 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'login_response_time': ['p(95)<500', 'p(99)<1000'],
    'login_success_rate': ['rate>0.95'],
    'logout_success_rate': ['rate>0.99'],
    'http_req_duration': ['p(95)<600'],
    'http_req_failed': ['rate<0.05'],
  },
};

// Setup function - create test users before load test
export function setup() {
  console.log('Setting up test users...');

  // Create 100 test users for the load test
  for (let i = 0; i < 100; i++) {
    const userData = getRandomStudentData();
    const password = getRandomPassword();

    const registerPayload = JSON.stringify({
      ...userData,
      password,
      confirmPassword: password,
    });

    const registerResponse = http.post(`${API_BASE_URL}/auth/register`, registerPayload, {
      headers: commonHeaders,
    });

    if (registerResponse.status === 201) {
      testUsers.push({
        email: userData.email,
        password,
        id: registerResponse.json('user.id'),
      });
    }

    sleep(0.1); // Small delay to avoid overwhelming the system
  }

  console.log(`Created ${testUsers.length} test users`);
  return { testUsers };
}

// Main test function
export default function authLoadTest(data) {
  const { testUsers: users } = data;

  // Select random test user
  const testUser = users[Math.floor(Math.random() * users.length)];

  group('Authentication Flow', function () {
    // Login test
    group('Login', function () {
      const loginStart = Date.now();

      const authResult = safeExecute(authenticateUser, testUser.email, testUser.password);

      if (authResult) {
        loginSuccessRate.add(1);
        loginResponseTime.add(Date.now() - loginStart);

        check(authResult, {
          'authentication successful': (r) => r !== null,
          'token received': (r) => r.token && r.token.length > 0,
          'user ID received': (r) => r.userId !== undefined,
        });

        // Token validation test
        group('Token Validation', function () {
          const tokenValidationResponse = http.get(`${API_BASE_URL}/auth/validate`, {
            headers: authResult.headers,
          });

          check(tokenValidationResponse, {
            'token validation successful': (r) => r.status === 200,
            'user data returned': (r) => r.json('user.id') === testUser.id,
          });
        });

        // Logout test
        group('Logout', function () {
          const logoutResponse = http.post(`${API_BASE_URL}/auth/logout`, null, {
            headers: authResult.headers,
          });

          const logoutSuccess = check(logoutResponse, {
            'logout successful': (r) => r.status === 200,
          });

          if (logoutSuccess) {
            logoutSuccessRate.add(1);
          }
        });

        // Token refresh test (if supported)
        group('Token Refresh', function () {
          const refreshResponse = http.post(`${API_BASE_URL}/auth/refresh`, null, {
            headers: {
              ...authResult.headers,
              'Refresh-Token': authResult.token,
            },
          });

          const refreshSuccess = check(refreshResponse, {
            'token refresh successful': (r) => r.status === 200,
            'new token received': (r) => r.json('token') !== undefined,
          });

          if (refreshSuccess) {
            tokenRefreshSuccessRate.add(1);
          }
        });
      } else {
        loginSuccessRate.add(0);
        console.log(`Login failed for user: ${testUser.email}`);
      }
    });

    // Rate limiting test
    group('Rate Limiting', function () {
      const rapidLoginAttempts = [];

      // Simulate rapid login attempts to test rate limiting
      for (let i = 0; i < 5; i++) {
        const loginPayload = JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        });

        const response = http.post(`${API_BASE_URL}/auth/login`, loginPayload, {
          headers: commonHeaders,
        });

        rapidLoginAttempts.push(response.status);
        sleep(0.1); // 100ms between attempts
      }

      // Check if rate limiting is working (should start blocking after several attempts)
      const rateLimitedAttempts = rapidLoginAttempts.filter(status => status === 429);

      check(rateLimitedAttempts, {
        'rate limiting active': (attempts) => attempts.length >= 1,
      });
    });

    // Simulate realistic user behavior with delays
    sleep(Math.random() * 3 + 1); // Random delay between 1-4 seconds
  });
}

// Teardown function - clean up test data
export function teardown(data) {
  console.log('Cleaning up test users...');

  const { testUsers: users } = data;

  for (const user of users) {
    try {
      const authResult = authenticateUser(user.email, user.password);
      if (authResult) {
        cleanupTestData(user.id, authResult.headers);
      }
    } catch (error) {
      console.log(`Failed to cleanup user ${user.id}: ${error.message}`);
    }
  }

  console.log('Cleanup completed');
}

// Export metrics for reporting
export function handleSummary(data) {
  return {
    'auth-performance-report.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const result = [];

  result.push('🔐 Authentication Performance Test Results');
  result.push('==========================================');
  result.push('');

  // Login metrics
  if (data.metrics.login_success_rate) {
    result.push(`📊 Login Success Rate: ${(data.metrics.login_success_rate.rate * 100).toFixed(2)}%`);
  }

  if (data.metrics.login_response_time) {
    result.push(`⏱️  Login Response Time (P95): ${data.metrics.login_response_time.p95.toFixed(2)}ms`);
  }

  // Logout metrics
  if (data.metrics.logout_success_rate) {
    result.push(`📤 Logout Success Rate: ${(data.metrics.logout_success_rate.rate * 100).toFixed(2)}%`);
  }

  // Token refresh metrics
  if (data.metrics.token_refresh_success_rate) {
    result.push(`🔄 Token Refresh Success Rate: ${(data.metrics.token_refresh_success_rate.rate * 100).toFixed(2)}%`);
  }

  // General HTTP metrics
  if (data.metrics.http_req_duration) {
    result.push(`🌐 HTTP Response Time (P95): ${data.metrics.http_req_duration.p95.toFixed(2)}ms`);
  }

  if (data.metrics.http_req_failed) {
    result.push(`❌ HTTP Error Rate: ${(data.metrics.http_req_failed.rate * 100).toFixed(2)}%`);
  }

  result.push('');
  result.push('🎯 Performance SLAs:');
  result.push(`✅ Login Response Time < 500ms: ${data.metrics.login_response_time?.p95 < 500 ? 'PASSED' : 'FAILED'}`);
  result.push(`✅ Login Success Rate > 95%: ${(data.metrics.login_success_rate?.rate * 100) > 95 ? 'PASSED' : 'FAILED'}`);
  result.push(`✅ HTTP Error Rate < 5%: ${data.metrics.http_req_failed?.rate < 0.05 ? 'PASSED' : 'FAILED'}`);

  return result.join('\n');
}