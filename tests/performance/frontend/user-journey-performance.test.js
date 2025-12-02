import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for user journey performance
export let options = {
  vus: 30,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    http_req_failed: ['rate<0.05'],
    user_journey_duration: ['p(95)<10000'], // Complete journey in < 10s
  },
};

// Custom metrics
export let errorRate = new Rate('errors');
export let loginJourney = new Trend('login_journey_duration');
export let registrationJourney = new Trend('registration_journey_duration');
export let dashboardJourney = new Trend('dashboard_journey_duration');
export let userJourney = new Trend('complete_user_journey_duration');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Helper functions
function generateRandomEmail() {
  return `testuser${Math.floor(Math.random() * 100000)}@example.com`;
}

function generateRandomPassword() {
  return `TestPass${Math.floor(Math.random() * 10000)}!`;
}

export function setup() {
  console.log('🚀 Starting User Journey Performance Test');
  console.log(`📊 Target URL: ${BASE_URL}`);
  console.log(`👥 Virtual Users: ${options.vus}`);
  console.log(`⏱️ Duration: ${options.duration}`);
}

export default function () {
  const startTime = Date.now();
  const email = generateRandomEmail();
  const password = generateRandomPassword();
  const firstName = 'Test';
  const lastName = 'User';

  // Journey Step 1: Registration Flow
  const regStartTime = Date.now();

  // GET registration page
  let regPageRes = http.get(`${BASE_URL}/auth/register`, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  check(regPageRes, {
    'registration page loads': (r) => r.status === 200,
    'registration page contains form': (r) => r.body.includes('type="email"'),
  }) || errorRate.add(1);

  sleep(0.5);

  // POST registration data
  let regData = {
    firstName: firstName,
    lastName: lastName,
    email: email,
    password: password,
    confirmPassword: password,
    acceptTerms: true,
  };

  let regSubmitRes = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify(regData), {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; k6/0.47.0)',
    },
  });

  let regSuccess = check(regSubmitRes, {
    'registration succeeds': (r) => r.status >= 200 && r.status < 300,
    'registration returns user data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.user && body.user.email;
      } catch (e) {
        return false;
      }
    },
  });

  const regEndTime = Date.now();
  registrationJourney.add(regEndTime - regStartTime);

  if (regSuccess) {
    console.log(`✅ Registration successful for ${email}`);
  } else {
    errorRate.add(1);
    console.log(`❌ Registration failed for ${email}`);
  }

  sleep(1);

  // Journey Step 2: Login Flow
  const loginStartTime = Date.now();

  // GET login page
  let loginPageRes = http.get(`${BASE_URL}/auth/login`, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  check(loginPageRes, {
    'login page loads': (r) => r.status === 200,
    'login page contains form': (r) => r.body.includes('type="password"'),
  }) || errorRate.add(1);

  sleep(0.5);

  // POST login credentials
  let loginData = {
    email: email,
    password: password,
  };

  let loginSubmitRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(loginData), {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; k6/0.47.0)',
    },
  });

  let loginSuccess = check(loginSubmitRes, {
    'login succeeds': (r) => r.status >= 200 && r.status < 300,
    'login returns session token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.token || body.session;
      } catch (e) {
        return false;
      }
    },
  });

  const loginEndTime = Date.now();
  loginJourney.add(loginEndTime - loginStartTime);

  if (loginSuccess) {
    console.log(`✅ Login successful for ${email}`);

    // Extract session token for subsequent requests
    let sessionToken = '';
    try {
      const responseBody = JSON.parse(loginSubmitRes.body);
      sessionToken = responseBody.token || responseBody.session || '';
    } catch (e) {
      console.log('⚠️ Could not extract session token');
    }

    // Journey Step 3: Dashboard Navigation
    const dashboardStartTime = Date.now();

    // Visit dashboard
    let dashboardRes = http.get(`${BASE_URL}/dashboard`, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    let dashboardSuccess = check(dashboardRes, {
      'dashboard loads': (r) => r.status === 200,
      'dashboard contains content': (r) => r.body.includes('dashboard') || r.body.includes('Overview'),
    });

    // Test dashboard API endpoints
    let profileRes = http.get(`${BASE_URL}/api/users/me`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
        'User-Agent': 'Mozilla/5.0 (compatible; k6/0.47.0)',
      },
    });

    check(profileRes, {
      'profile API works': (r) => r.status === 200,
      'profile returns user data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.email === email;
        } catch (e) {
          return false;
        }
      },
    }) || errorRate.add(1);

    const dashboardEndTime = Date.now();
    dashboardJourney.add(dashboardEndTime - dashboardStartTime);

    if (dashboardSuccess) {
      console.log(`✅ Dashboard navigation successful for ${email}`);
    } else {
      errorRate.add(1);
      console.log(`❌ Dashboard navigation failed for ${email}`);
    }

    sleep(1);

    // Journey Step 4: User Settings (optional feature testing)
    let settingsRes = http.get(`${BASE_URL}/settings/profile`, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    check(settingsRes, {
      'settings page loads': (r) => r.status === 200,
      'settings contains form': (r) => r.body.includes('form'),
    }) || errorRate.add(1);

    sleep(0.5);

  } else {
    errorRate.add(1);
    console.log(`❌ Login failed for ${email}`);
  }

  const totalJourneyTime = Date.now() - startTime;
  userJourney.add(totalJourneyTime);

  console.log(`📊 Journey completed for ${email} in ${totalJourneyTime}ms`);

  sleep(2); // Rest between journeys
}

export function teardown(data) {
  console.log('📊 User Journey Performance Test Completed');
  console.log(`❌ Error Rate: ${(errorRate.rate * 100).toFixed(2)}%`);
  console.log(`🎯 Registration Journey P95: ${(registrationJourney.p(95)).toFixed(0)}ms`);
  console.log(`🎯 Login Journey P95: ${(loginJourney.p(95)).toFixed(0)}ms`);
  console.log(`🎯 Dashboard Journey P95: ${(dashboardJourney.p(95)).toFixed(0)}ms`);
  console.log(`🎯 Complete User Journey P95: ${(userJourney.p(95)).toFixed(0)}ms`);
}