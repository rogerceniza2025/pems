import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Latency injection testing for resilience validation
export let options = {
  vus: 15,
  duration: '3m',
  thresholds: {
    http_req_duration: ['p(95)<3000'], // More lenient with latency injection
    http_req_failed: ['rate<0.15'], // Higher failure rate expected
    low_latency_performance: ['p(95)<1000'],
    medium_latency_performance: ['p(95)<2000'],
    high_latency_performance: ['p(95)<3000'],
  },
};

// Custom metrics
export let errorRate = new Rate('errors');
export let lowLatencyTime = new Trend('low_latency_performance');
export let mediumLatencyTime = new Trend('medium_latency_performance');
export let highLatencyTime = new Trend('high_latency_performance');
export let timeoutCount = new Trend('timeout_occurrences');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Latency injection scenarios
const latencyScenarios = [
  { name: 'Low Latency', delay: 100, description: 'Normal network conditions' },
  { name: 'Medium Latency', delay: 500, description: 'Moderate network delay' },
  { name: 'High Latency', delay: 1000, description: 'Poor network conditions' },
  { name: 'Very High Latency', delay: 2000, description: 'Extreme network conditions' },
];

export function setup() {
  console.log('🚀 Starting Latency Injection Performance Test');
  console.log(`📊 Target URL: ${BASE_URL}`);
  console.log(`👥 Virtual Users: ${options.vus}`);
  console.log(`⏱️ Duration: ${options.duration}`);
  console.log(`🐌 Testing with various latency levels: ${latencyScenarios.map(s => s.name).join(', ')}`);
}

export default function () {
  const vuId = __VU;

  // Select latency scenario based on VU ID for distribution
  const scenarioIndex = vuId % latencyScenarios.length;
  const scenario = latencyScenarios[scenarioIndex];

  console.log(`🐌 Testing with ${scenario.name} (${scenario.delay}ms delay): ${scenario.description}`);

  // Critical API endpoints that should be resilient to latency
  const criticalEndpoints = [
    {
      name: 'Health Check',
      path: '/api/v1/health',
      method: 'GET',
      timeout: scenario.delay + 1000,
      metric: scenario.delay <= 300 ? lowLatencyTime : scenario.delay <= 1000 ? mediumLatencyTime : highLatencyTime,
      critical: true,
    },
    {
      name: 'Authentication Status',
      path: '/api/v1/auth/status',
      method: 'GET',
      timeout: scenario.delay + 1500,
      metric: scenario.delay <= 300 ? lowLatencyTime : scenario.delay <= 1000 ? mediumLatencyTime : highLatencyTime,
      critical: true,
      requiresAuth: true,
    },
    {
      name: 'User Profile',
      path: '/api/v1/users/me',
      method: 'GET',
      timeout: scenario.delay + 2000,
      metric: scenario.delay <= 300 ? lowLatencyTime : scenario.delay <= 1000 ? mediumLatencyTime : highLatencyTime,
      critical: true,
      requiresAuth: true,
    },
    {
      name: 'Dashboard Data',
      path: '/api/v1/dashboard/stats',
      method: 'GET',
      timeout: scenario.delay + 3000,
      metric: scenario.delay <= 300 ? lowLatencyTime : scenario.delay <= 1000 ? mediumLatencyTime : highLatencyTime,
      critical: false,
      requiresAuth: true,
    },
  ];

  for (const endpoint of criticalEndpoints) {
    const startTime = Date.now();

    // Prepare headers with timeout considerations
    const headers = {
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.5',
      'User-Agent': `Mozilla/5.0 (compatible; k6/0.47.0; Latency-Test-${scenario.name.replace(' ', '')})`,
      'X-Test-Latency': scenario.delay.toString(),
      'Connection': 'keep-alive',
    };

    if (endpoint.requiresAuth) {
      headers['Authorization'] = 'Bearer test_session_token';
    }

    // Simulate network delay before request
    if (scenario.delay > 0) {
      sleep(scenario.delay / 1000);
    }

    let response;
    let requestSuccess = true;

    try {
      response = http.get(`${BASE_URL}${endpoint.path}`, {
        headers: headers,
        timeout: endpoint.timeout,
      });
    } catch (error) {
      if (error.name === 'TimeoutError') {
        timeoutCount.add(1);
        console.log(`⏰ ${endpoint.name} timed out after ${endpoint.timeout}ms (${scenario.name})`);
      } else {
        console.log(`❌ Unexpected error for ${endpoint.name}: ${error.message}`);
        errorRate.add(1);
      }
      requestSuccess = false;
    }

    if (requestSuccess) {
      const responseTime = Date.now() - startTime;
      endpoint.metric.add(responseTime);

      // Validate response considering latency conditions
      const acceptableResponseTime = scenario.delay + (endpoint.critical ? 500 : 1000);

      const success = check(response, {
        [`${endpoint.name} status is 200`]: (r) => r.status === 200,
        [`${endpoint.name} response within acceptable time`]: (r) => responseTime <= acceptableResponseTime,
        [`${endpoint.name} returns valid JSON`]: (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json'),
      });

      if (!success) {
        if (endpoint.critical) {
          errorRate.add(1);
          console.log(`❌ Critical endpoint ${endpoint.name} failed - Status: ${response.status}, Time: ${responseTime}ms (${scenario.name})`);
        } else {
          console.log(`⚠️ Non-critical endpoint ${endpoint.name} degraded - Status: ${response.status}, Time: ${responseTime}ms (${scenario.name})`);
        }
      } else {
        console.log(`✅ ${endpoint.name} - Time: ${responseTime}ms (${scenario.name})`);
      }
    }

    // Rest between requests to avoid overwhelming the server
    sleep(1);
  }

  // Test timeout handling with artificial delays
  console.log('🧪 Testing timeout handling...');

  const timeoutTestScenarios = [
    { delay: 100, shouldSucceed: true, description: 'Short delay' },
    { delay: 500, shouldSucceed: true, description: 'Medium delay' },
    { delay: 1500, shouldSucceed: false, description: 'Long delay (timeout expected)' },
  ];

  for (const timeoutTest of timeoutTestScenarios) {
    const testStartTime = Date.now();

    // Pre-delay to simulate network conditions
    sleep(timeoutTest.delay / 1000);

    try {
      const timeoutResponse = http.get(`${BASE_URL}/api/v1/health`, {
        headers: {
          'X-Test-Timeout': 'true',
          'X-Test-Delay': timeoutTest.delay.toString(),
        },
        timeout: 1000, // Fixed 1 second timeout for this test
      });

      const testResponseTime = Date.now() - testStartTime;

      if (timeoutTest.shouldSucceed) {
        check(timeoutResponse, {
          'timeout test succeeded when expected': (r) => r.status === 200,
          'timeout test completed within expected time': (r) => testResponseTime < 2000,
        });
        console.log(`✅ Timeout test succeeded for ${timeoutTest.description}`);
      } else {
        console.log(`⚠️ Timeout test unexpectedly succeeded for ${timeoutTest.description}`);
      }
    } catch (error) {
      if (!timeoutTest.shouldSucceed) {
        console.log(`✅ Timeout test correctly failed for ${timeoutTest.description}: ${error.message}`);
      } else {
        console.log(`❌ Timeout test unexpectedly failed for ${timeoutTest.description}: ${error.message}`);
        errorRate.add(1);
      }
    }

    sleep(0.5);
  }
}

export function teardown(data) {
  console.log('📊 Latency Injection Performance Test Completed');
  console.log(`❌ Error Rate: ${(errorRate.rate * 100).toFixed(2)}%`);
  console.log(`⏰ Timeout Occurrences: ${timeoutCount.count}`);
  console.log(`🎯 Low Latency Performance P95: ${(lowLatencyTime.p(95)).toFixed(0)}ms`);
  console.log(`🎯 Medium Latency Performance P95: ${(mediumLatencyTime.p(95)).toFixed(0)}ms`);
  console.log(`🎯 High Latency Performance P95: ${(highLatencyTime.p(95)).toFixed(0)}ms`);
}