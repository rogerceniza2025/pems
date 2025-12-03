import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Bundle size impact analysis
export let options = {
  vus: 25,
  duration: '3m',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
    page_load_with_small_bundle: ['p(95)<1500'],
    page_load_with_large_bundle: ['p(95)<3000'],
    bundle_size_impact: ['p(95)<1000'], // Additional load time from larger bundles
  },
};

// Custom metrics
export let errorRate = new Rate('errors');
export let smallBundleLoad = new Trend('page_load_with_small_bundle');
export let largeBundleLoad = new Trend('page_load_with_large_bundle');
export let bundleImpact = new Trend('bundle_size_impact');
export let cacheHitRate = new Rate('cache_hit_rate');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Bundle scenarios to test
const bundleScenarios = [
  {
    name: 'Minimal Bundle',
    description: 'Optimized bundle with tree-shaking',
    headers: {
      'X-Bundle-Scenario': 'minimal',
      'X-Disable-Features': 'analytics,tracking,advanced-ui',
    },
    expectedBundleSize: 'small',
    expectedLoadTime: 1500,
  },
  {
    name: 'Standard Bundle',
    description: 'Default bundle with core features',
    headers: {
      'X-Bundle-Scenario': 'standard',
    },
    expectedBundleSize: 'medium',
    expectedLoadTime: 2000,
  },
  {
    name: 'Full Bundle',
    description: 'Complete bundle with all features',
    headers: {
      'X-Bundle-Scenario': 'full',
      'X-Enable-Features': 'analytics,tracking,advanced-ui,experimental',
    },
    expectedBundleSize: 'large',
    expectedLoadTime: 3000,
  },
];

export function setup() {
  console.log('🚀 Starting Bundle Size Impact Analysis');
  console.log(`📊 Target URL: ${BASE_URL}`);
  console.log(`👥 Virtual Users: ${options.vus}`);
  console.log(`⏱️ Duration: ${options.duration}`);
  console.log(`📦 Testing bundle scenarios: ${bundleScenarios.map(s => s.name).join(', ')}`);
}

export default function () {
  const vuId = __VU;
  const scenarioIndex = vuId % bundleScenarios.length;
  const scenario = bundleScenarios[scenarioIndex];

  console.log(`📦 Testing ${scenario.name}: ${scenario.description}`);

  // Test pages with different bundle scenarios
  const testPages = [
    { name: 'Login Page', path: '/auth/login', critical: true },
    { name: 'Dashboard', path: '/dashboard', critical: true, requiresAuth: true },
    { name: 'User Profile', path: '/settings/profile', critical: false, requiresAuth: true },
    { name: 'Reports Page', path: '/reports', critical: false, requiresAuth: true },
  ];

  for (const page of testPages) {
    // First load (cold cache)
    const coldStartTime = Date.now();

    let coldResponse;
    try {
      const headers = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': `Mozilla/5.0 (compatible; k6/0.47.0; Bundle-Test-${scenario.name.replace(' ', '')})`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...scenario.headers,
      };

      if (page.requiresAuth) {
        headers['Authorization'] = 'Bearer test_session_token';
      }

      coldResponse = http.get(`${BASE_URL}${page.path}`, {
        headers: headers,
        timeout: 5000,
      });
    } catch (error) {
      console.log(`❌ Cold load failed for ${page.name}: ${error.message}`);
      errorRate.add(1);
      continue;
    }

    const coldLoadTime = Date.now() - coldStartTime;

    // Second load (warm cache)
    const warmStartTime = Date.now();

    let warmResponse;
    try {
      const headers = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': `Mozilla/5.0 (compatible; k6/0.47.0; Bundle-Test-${scenario.name.replace(' ', '')})`,
        'Cache-Control': 'max-age=0',
        ...scenario.headers,
      };

      if (page.requiresAuth) {
        headers['Authorization'] = 'Bearer test_session_token';
      }

      warmResponse = http.get(`${BASE_URL}${page.path}`, {
        headers: headers,
        timeout: 3000,
      });
    } catch (error) {
      console.log(`❌ Warm load failed for ${page.name}: ${error.message}`);
      errorRate.add(1);
      continue;
    }

    const warmLoadTime = Date.now() - warmStartTime;

    // Calculate cache hit rate
    const cacheHit = warmLoadTime < coldLoadTime * 0.5; // Significant improvement suggests cache hit
    if (cacheHit) {
      cacheHitRate.add(1);
    }

    // Record metrics based on bundle size
    if (scenario.expectedBundleSize === 'small') {
      smallBundleLoad.add(coldLoadTime);
    } else if (scenario.expectedBundleSize === 'large') {
      largeBundleLoad.add(coldLoadTime);
    }

    // Calculate bundle size impact
    const bundleSizeImpact = coldLoadTime - warmLoadTime;
    bundleImpact.add(bundleSizeImpact);

    // Validate performance
    const success = check(coldResponse, {
      [`${page.name} cold load status is 200`]: (r) => r.status === 200,
      [`${page.name} cold load within expected time`]: (r) => coldLoadTime <= scenario.expectedLoadTime,
    }) && check(warmResponse, {
      [`${page.name} warm load status is 200`]: (r) => r.status === 200,
      [`${page.name} warm load shows improvement`]: (r) => warmLoadTime < coldLoadTime,
    });

    if (!success) {
      errorRate.add(1);
      console.log(`❌ ${page.name} failed - Cold: ${coldLoadTime}ms, Warm: ${warmLoadTime}ms (${scenario.name})`);
    } else {
      console.log(`✅ ${page.name} - Cold: ${coldLoadTime}ms, Warm: ${warmLoadTime}ms (${scenario.name})`);
    }

    // Check bundle size headers
    if (coldResponse.headers) {
      const contentLength = coldResponse.headers['Content-Length'];
      const contentType = coldResponse.headers['Content-Type'];

      if (contentLength) {
        const sizeKB = (parseInt(contentLength) / 1024).toFixed(2);
        console.log(`📏 ${page.name} bundle size: ${sizeKB}KB`);
      }
    }

    sleep(1); // Rest between page loads
  }

  // Test bundle compression and minification
  console.log('🗜️ Testing bundle compression...');

  const compressionTests = [
    { encoding: 'gzip', header: 'Accept-Encoding: gzip' },
    { encoding: 'br', header: 'Accept-Encoding: br' },
    { encoding: 'none', header: 'Accept-Encoding: identity' },
  ];

  for (const test of compressionTests) {
    try {
      const response = http.get(`${BASE_URL}/static/js/main.js`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; k6/0.47.0; Compression-Test)',
          test.header,
        },
        timeout: 3000,
      });

      if (response.status === 200 && response.headers['Content-Length']) {
        const size = parseInt(response.headers['Content-Length']);
        const sizeKB = (size / 1024).toFixed(2);
        console.log(`🗜️ ${test.encoding} compression: ${sizeKB}KB`);
      }
    } catch (error) {
      console.log(`⚠️ Could not test ${test.encoding} compression`);
    }
  }

  sleep(1);
}

export function teardown(data) {
  console.log('📊 Bundle Size Impact Analysis Completed');
  console.log(`❌ Error Rate: ${(errorRate.rate * 100).toFixed(2)}%`);
  console.log(`🎯 Small Bundle Load P95: ${(smallBundleLoad.p(95)).toFixed(0)}ms`);
  console.log(`🎯 Large Bundle Load P95: ${(largeBundleLoad.p(95)).toFixed(0)}ms`);
  console.log(`🎯 Bundle Size Impact P95: ${(bundleImpact.p(95)).toFixed(0)}ms`);
  console.log(`🎯 Cache Hit Rate: ${(cacheHitRate.rate * 100).toFixed(1)}%`);
}