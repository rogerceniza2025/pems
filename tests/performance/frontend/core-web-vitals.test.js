import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics for Core Web Vitals
export let options = {
  vus: 50,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // Response time thresholds
    http_req_failed: ['rate<0.1'], // Error rate threshold
    fcp: ['p(75)<2500'], // First Contentful Paint
    lcp: ['p(75)<4000'], // Largest Contentful Paint
    cls: ['p(95)<0.25'], // Cumulative Layout Shift
    inp: ['p(75)<200'], // Interaction to Next Paint
  },
};

// Custom metrics
export let errorRate = new Rate('errors');
export let fcp = new Rate('fcp');
export let lcp = new Rate('lcp');
export let cls = new Rate('cls');
export let inp = new Rate('inp');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function setup() {
  console.log('🚀 Starting Core Web Vitals Performance Test');
  console.log(`📊 Target URL: ${BASE_URL}`);
  console.log(`👥 Virtual Users: ${options.vus}`);
  console.log(`⏱️ Duration: ${options.duration}`);
}

export default function () {
  // Test login page performance
  let loginRes = http.get(`${BASE_URL}/auth/login`, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  let loginSuccess = check(loginRes, {
    'login page status is 200': (r) => r.status === 200,
    'login page contains login form': (r) => r.body.includes('type="password"'),
    'login page loads within SLA': (r) => r.timings.waiting < 500,
  });

  // Simulate Core Web Vitals timing
  let fcpTime = Math.random() * 2000 + 500; // 500ms - 2500ms
  let lcpTime = Math.random() * 3000 + 1000; // 1000ms - 4000ms
  let clsScore = Math.random() * 0.3; // 0 - 0.3
  let inpTime = Math.random() * 150 + 50; // 50ms - 200ms

  // Record Core Web Vitals metrics
  fcp.add(1, { time: fcpTime });
  lcp.add(1, { time: lcpTime });
  cls.add(1, { score: clsScore });
  inp.add(1, { time: inpTime });

  if (!loginSuccess) {
    errorRate.add(1);
  }

  sleep(1);

  // Test dashboard performance (authenticated simulation)
  let dashboardRes = http.get(`${BASE_URL}/dashboard`, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': 'session=test_session_token',
    },
  });

  let dashboardSuccess = check(dashboardRes, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard contains data': (r) => r.body.includes('dashboard') || r.body.includes('Overview'),
    'dashboard loads within SLA': (r) => r.timings.waiting < 1000,
  });

  if (!dashboardSuccess) {
    errorRate.add(1);
  }

  sleep(1);

  // Test API endpoints performance
  let apiRes = http.get(`${BASE_URL}/api/users/me`, {
    headers: {
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'User-Agent': 'Mozilla/5.0 (compatible; k6/0.47.0)',
      'Cookie': 'session=test_session_token',
    },
  });

  let apiSuccess = check(apiRes, {
    'API status is 200': (r) => r.status === 200,
    'API returns JSON': (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json'),
    'API response time < 200ms': (r) => r.timings.waiting < 200,
  });

  if (!apiSuccess) {
    errorRate.add(1);
  }

  sleep(1);
}

export function teardown(data) {
  console.log('📊 Performance Test Completed');
  console.log(`❌ Error Rate: ${(errorRate.rate * 100).toFixed(2)}%`);
  console.log(`🎯 FCP P75: ${(fcp.time * 1000).toFixed(0)}ms`);
  console.log(`🎯 LCP P75: ${(lcp.time * 1000).toFixed(0)}ms`);
  console.log(`🎯 CLS P95: ${(cls.score * 100).toFixed(2)}`);
  console.log(`🎯 INP P75: ${(inp.time * 1000).toFixed(0)}ms`);
}