import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Network condition simulation
export let options = {
  vus: 20,
  duration: '4m',
  thresholds: {
    http_req_duration: ['p(95)<2000'], // More lenient for slow networks
    http_req_failed: ['rate<0.1'],
    network_3g_performance: ['p(95)<3000'],
    network_4g_performance: ['p(95)<1500'],
    network_5g_performance: ['p(95)<800'],
  },
};

// Custom metrics
export let errorRate = new Rate('errors');
export let network3GTime = new Trend('network_3g_performance');
export let network4GTime = new Trend('network_4g_performance');
export let network5GTime = new Trend('network_5g_performance');
export let offlineFallbackTime = new Trend('offline_fallback_performance');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Network configuration profiles
const networkProfiles = {
  '3g': {
    bandwidth: '750kb/s',     // 3G speed
    latency: '100ms',         # High latency
    packetLoss: '2%',         # Some packet loss
    timeout: 5000,
  },
  '4g': {
    bandwidth: '3Mb/s',       # 4G speed
    latency: '40ms',          # Moderate latency
    packetLoss: '0.5%',       # Low packet loss
    timeout: 3000,
  },
  '5g': {
    bandwidth: '10Mb/s',      # 5G speed
    latency: '10ms',          # Low latency
    packetLoss: '0.1%',       # Very low packet loss
    timeout: 2000,
  },
  'offline': {
    bandwidth: '0kb/s',       # Offline
    latency: '0ms',           # No latency
    packetLoss: '100%',       # Complete packet loss
    timeout: 1000,
  }
};

export function setup() {
  console.log('🚀 Starting Network Conditions Performance Test');
  console.log(`📊 Target URL: ${BASE_URL}`);
  console.log(`👥 Virtual Users: ${options.vus}`);
  console.log(`⏱️ Duration: ${options.duration}`);
  console.log(`🌐 Testing 3G, 4G, 5G, and offline conditions`);
}

export default function () {
  const networkType = `${networkProfiles['3g']}`; // Default to 3G for general testing
  const vuId = __VU; // Get virtual user ID

  // Rotate network types based on VU ID for better coverage
  let currentNetwork;
  if (vuId % 4 === 0) {
    currentNetwork = networkProfiles['3g'];
    console.log('📱 Testing on 3G network');
  } else if (vuId % 4 === 1) {
    currentNetwork = networkProfiles['4g'];
    console.log('📶 Testing on 4G network');
  } else if (vuId % 4 === 2) {
    currentNetwork = networkProfiles['5g'];
    console.log('🚀 Testing on 5G network');
  } else {
    currentNetwork = networkProfiles['offline'];
    console.log('📡 Testing offline scenario');
  }

  // Test critical pages under current network conditions
  const endpoints = [
    { name: 'Login Page', path: '/auth/login', critical: true },
    { name: 'Registration Page', path: '/auth/register', critical: true },
    { name: 'Dashboard', path: '/dashboard', critical: true, requiresAuth: true },
    { name: 'User Profile API', path: '/api/v1/users/me', critical: true, requiresAuth: true, isApi: true },
    { name: 'Tenant Settings', path: '/settings/tenant', critical: false, requiresAuth: true },
  ];

  for (const endpoint of endpoints) {
    const startTime = Date.now();

    // Prepare headers
    const headers = {
      'Accept': endpoint.isApi ? 'application/json' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'User-Agent': `Mozilla/5.0 (compatible; k6/0.47.0; Network-Test-${currentNetwork === networkProfiles['3g'] ? '3G' : currentNetwork === networkProfiles['4g'] ? '4G' : currentNetwork === networkProfiles['5g'] ? '5G' : 'Offline'})`,
      'Connection': 'keep-alive',
    };

    if (endpoint.requiresAuth) {
      headers['Authorization'] = 'Bearer test_session_token';
    }

    // Simulate network latency before request
    if (currentNetwork.latency && currentNetwork.latency !== '0ms') {
      const latencyMs = parseInt(currentNetwork.latency);
      sleep(latencyMs / 1000);
    }

    let response;
    let requestSuccess = true;

    try {
      response = http.get(`${BASE_URL}${endpoint.path}`, {
        headers: headers,
        timeout: currentNetwork.timeout,
      });
    } catch (error) {
      if (currentNetwork === networkProfiles['offline']) {
        // Expected failure for offline testing
        console.log(`📡 Offline scenario: ${endpoint.name} failed as expected`);
        requestSuccess = false;
      } else {
        console.log(`❌ Unexpected error for ${endpoint.name}: ${error.message}`);
        errorRate.add(1);
      }
      continue;
    }

    const responseTime = Date.now() - startTime;

    // Record performance metrics
    if (currentNetwork === networkProfiles['3g']) {
      network3GTime.add(responseTime);
    } else if (currentNetwork === networkProfiles['4g']) {
      network4GTime.add(responseTime);
    } else if (currentNetwork === networkProfiles['5g']) {
      network5GTime.add(responseTime);
    } else if (currentNetwork === networkProfiles['offline']) {
      offlineFallbackTime.add(responseTime);
    }

    // Performance validation based on network type
    const successThreshold = currentNetwork === networkProfiles['3g'] ? 3000 :
                           currentNetwork === networkProfiles['4g'] ? 1500 :
                           currentNetwork === networkProfiles['5g'] ? 800 : 500;

    const success = check(response, {
      [`${endpoint.name} status is 200`]: (r) => r.status === 200,
      [`${endpoint.name} response within threshold`]: (r) => responseTime <= successThreshold,
      [`${endpoint.name} returns valid content-type`]: (r) => {
        if (endpoint.isApi) {
          return r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json');
        }
        return r.headers['Content-Type'] && (r.headers['Content-Type'].includes('text/html') || r.headers['Content-Type'].includes('text/plain'));
      },
    });

    if (!success) {
      if (currentNetwork === networkProfiles['offline'] && endpoint.critical) {
        console.log(`⚠️ Critical endpoint ${endpoint.name} failed on offline - should have fallback`);
      } else {
        errorRate.add(1);
        console.log(`❌ ${endpoint.name} failed on ${currentNetwork === networkProfiles['3g'] ? '3G' : currentNetwork === networkProfiles['4g'] ? '4G' : currentNetwork === networkProfiles['5G'] ? '5G' : 'Offline'} - Status: ${response.status}, Time: ${responseTime}ms`);
      }
    } else {
      console.log(`✅ ${endpoint.name} - ${currentNetwork === networkProfiles['3g'] ? '3G' : currentNetwork === networkProfiles['4G'] ? '4G' : currentNetwork === networkProfiles['5G'] ? '5G' : 'Offline'} - Time: ${responseTime}ms`);
    }

    // Simulate bandwidth limitations (sleep for slower networks)
    if (currentNetwork === networkProfiles['3g']) {
      sleep(0.5); // Simulate slower loading
    } else if (currentNetwork === networkProfiles['4g']) {
      sleep(0.2); // Moderate speed
    } else if (currentNetwork === networkProfiles['5g']) {
      sleep(0.05); # Fast speed
    }

    // Rest between requests
    sleep(0.5);
  }

  // Test offline scenario specifically
  if (currentNetwork === networkProfiles['offline']) {
    console.log('📡 Testing offline fallback mechanisms...');

    // Test Service Worker registration and cached content
    try {
      const offlineResponse = http.get(`${BASE_URL}/sw.js`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; k6/0.47.0; Offline-Test)' },
        timeout: 1000,
      });

      if (offlineResponse.status === 200) {
        console.log('✅ Service Worker available for offline support');
      }
    } catch (error) {
      console.log('⚠️ No Service Worker found for offline support');
    }
  }
}

export function teardown(data) {
  console.log('📊 Network Conditions Performance Test Completed');
  console.log(`❌ Error Rate: ${(errorRate.rate * 100).toFixed(2)}%`);
  console.log(`🎯 3G Performance P95: ${(network3GTime.p(95)).toFixed(0)}ms`);
  console.log(`🎯 4G Performance P95: ${(network4GTime.p(95)).toFixed(0)}ms`);
  console.log(`🎯 5G Performance P95: ${(network5GTime.p(95)).toFixed(0)}ms`);
  console.log(`🎯 Offline Fallback P95: ${(offlineFallbackTime.p(95)).toFixed(0)}ms`);
}