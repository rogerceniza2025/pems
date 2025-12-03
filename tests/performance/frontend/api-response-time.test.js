import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for API performance
export let options = {
  vus: 100,
  duration: '3m',
  thresholds: {
    http_req_duration: ['p(90)<200', 'p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.02'],
    api_response_time_auth: ['p(95)<300'],
    api_response_time_users: ['p(95)<400'],
    api_response_time_dashboard: ['p(95)<500'],
  },
};

// Custom metrics
export let errorRate = new Rate('errors');
export let authApiTime = new Trend('api_response_time_auth');
export let usersApiTime = new Trend('api_response_time_users');
export let dashboardApiTime = new Trend('api_response_time_dashboard');
export let tenantApiTime = new Trend('api_response_time_tenant');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_VERSION = 'api/v1';

export function setup() {
  console.log('🚀 Starting API Response Time Performance Test');
  console.log(`📊 Target URL: ${BASE_URL}`);
  console.log(`👥 Virtual Users: ${options.vus}`);
  console.log(`⏱️ Duration: ${options.duration}`);
}

export default function () {
  // Simulate different API endpoints
  const endpoints = [
    {
      name: 'Authentication Health Check',
      path: `/${API_VERSION}/auth/health`,
      expectedStatus: 200,
      timeout: 200,
      metric: authApiTime,
    },
    {
      name: 'User Profile',
      path: `/${API_VERSION}/users/me`,
      expectedStatus: 200,
      timeout: 400,
      metric: usersApiTime,
      requiresAuth: true,
    },
    {
      name: 'Dashboard Data',
      path: `/${API_VERSION}/dashboard/overview`,
      expectedStatus: 200,
      timeout: 500,
      metric: dashboardApiTime,
      requiresAuth: true,
    },
    {
      name: 'Tenant Information',
      path: `/${API_VERSION}/tenant/current`,
      expectedStatus: 200,
      timeout: 300,
      metric: tenantApiTime,
      requiresAuth: true,
    },
    {
      name: 'User Search',
      path: `/${API_VERSION}/users/search?q=test&page=1&limit=10`,
      expectedStatus: 200,
      timeout: 600,
      metric: usersApiTime,
      requiresAuth: true,
    },
  ];

  for (const endpoint of endpoints) {
    const startTime = Date.now();

    const headers = {
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.5',
      'User-Agent': 'Mozilla/5.0 (compatible; k6/0.47.0; API-Performance-Test)',
    };

    // Add authentication if required
    if (endpoint.requiresAuth) {
      headers['Authorization'] = 'Bearer test_session_token';
    }

    const response = http.get(`${BASE_URL}${endpoint.path}`, {
      headers: headers,
      timeout: endpoint.timeout + 1000, // Add buffer to K6 timeout
    });

    const responseTime = Date.now() - startTime;
    endpoint.metric.add(responseTime);

    const success = check(response, {
      [`${endpoint.name} status is ${endpoint.expectedStatus}`]: (r) => r.status === endpoint.expectedStatus,
      [`${endpoint.name} returns JSON`]: (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json'),
      [`${endpoint.name} response time < ${endpoint.timeout}ms`]: (r) => responseTime < endpoint.timeout,
    });

    if (!success) {
      errorRate.add(1);
      console.log(`❌ ${endpoint.name} failed - Status: ${response.status}, Time: ${responseTime}ms`);
    } else {
      console.log(`✅ ${endpoint.name} - Time: ${responseTime}ms`);
    }

    // Add small delay between API calls to simulate real user behavior
    sleep(0.1);
  }

  sleep(1);
}

export function teardown(data) {
  console.log('📊 API Response Time Performance Test Completed');
  console.log(`❌ Error Rate: ${(errorRate.rate * 100).toFixed(2)}%`);
  console.log(`🎯 Auth API P95: ${(authApiTime.p(95)).toFixed(0)}ms`);
  console.log(`🎯 Users API P95: ${(usersApiTime.p(95)).toFixed(0)}ms`);
  console.log(`🎯 Dashboard API P95: ${(dashboardApiTime.p(95)).toFixed(0)}ms`);
  console.log(`🎯 Tenant API P95: ${(tenantApiTime.p(95)).toFixed(0)}ms`);
}