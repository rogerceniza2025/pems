// Student Registration Load Testing Script
// Tests the performance of user registration and student creation under load

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import {
  getRandomStudentData,
  getRandomPassword,
  commonHeaders,
  BASE_URL,
  API_BASE_URL,
  safeExecute,
  logPerformanceMetrics,
  cleanupTestData
} from './config/load-test.js';

// Performance metrics
const registrationSuccessRate = new Rate('registration_success_rate');
const registrationResponseTime = new Trend('registration_response_time');
const studentCreationSuccessRate = new Rate('student_creation_success_rate');
const validationErrorRate = new Rate('validation_error_rate');

// Data storage for cleanup
let createdUsers = [];

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Warm up with 20 users
    { duration: '3m', target: 100 },  // Ramp to 100 users
    { duration: '5m', target: 200 },  // Ramp to 200 users
    { duration: '3m', target: 300 },  // Ramp to 300 users (peak)
    { duration: '5m', target: 300 },  // Stay at peak
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'registration_response_time': ['p(95)<800', 'p(99)<1500'],
    'registration_success_rate': ['rate>0.90'],
    'student_creation_success_rate': ['rate>0.85'],
    'http_req_duration': ['p(95)<1000'],
    'http_req_failed': ['rate<0.1'],
  },
};

// Test data generators for different scenarios
function getValidStudentData() {
  return getRandomStudentData();
}

function getInvalidStudentData() {
  return {
    firstName: '', // Empty first name
    lastName: 'Smith',
    email: 'invalid-email', // Invalid email format
    grade: '13', // Invalid grade
    dateOfBirth: '2025-01-01', // Future date
  };
}

function getEdgeCaseStudentData() {
  const longName = 'A'.repeat(100);
  return {
    firstName: longName,
    lastName: longName,
    email: `user${Date.now()}@example.com`,
    grade: '1',
    dateOfBirth: '2010-01-01',
  };
}

// Validation helper functions
function validateStudentResponse(response) {
  const success = check(response, {
    'registration successful': (r) => r.status === 201,
    'user ID returned': (r) => r.json('user.id') !== undefined,
    'student data correct': (r) => {
      const user = r.json('user');
      return user.firstName && user.lastName && user.email;
    },
  });

  if (success) {
    registrationSuccessRate.add(1);
    studentCreationSuccessRate.add(1);
  } else {
    registrationSuccessRate.add(0);
    studentCreationSuccessRate.add(0);

    // Check if it's a validation error (expected for bad data)
    if (response.status === 400) {
      validationErrorRate.add(1);
    }
  }

  return success;
}

function authenticateUser(email, password) {
  const loginPayload = JSON.stringify({
    email,
    password,
  });

  const loginResponse = http.post(`${API_BASE_URL}/auth/login`, loginPayload, {
    headers: commonHeaders,
  });

  return loginResponse.status === 200 ? {
    token: loginResponse.json('token'),
    userId: loginResponse.json('user.id'),
    headers: {
      ...commonHeaders,
      'Authorization': `Bearer ${loginResponse.json('token')}`,
    },
  } : null;
}

// Main test function
export default function studentRegistrationLoadTest() {
  group('Student Registration Flow', function () {
    // 80% valid registrations, 20% edge cases to test validation
    const useValidData = Math.random() < 0.8;

    const studentData = useValidData
      ? getValidStudentData()
      : (Math.random() < 0.5 ? getInvalidStudentData() : getEdgeCaseStudentData());

    const password = getRandomPassword();

    const registrationStart = Date.now();

    group('User Registration', function () {
      const registrationPayload = JSON.stringify({
        ...studentData,
        password,
        confirmPassword: password,
      });

      const registrationResponse = http.post(`${API_BASE_URL}/auth/register`, registrationPayload, {
        headers: commonHeaders,
      });

      logPerformanceMetrics(registrationResponse, 'user_registration');
      registrationResponseTime.add(Date.now() - registrationStart);

      const registrationSuccess = validateStudentResponse(registrationResponse);

      if (registrationSuccess && registrationResponse.json('user.id')) {
        const userId = registrationResponse.json('user.id');
        createdUsers.push({
          id: userId,
          email: studentData.email,
          password,
        });

        // Test immediate login after registration
        group('Post-Registration Login', function () {
          const authResult = authenticateUser(studentData.email, password);

          check(authResult, {
            'login after registration successful': (r) => r !== null,
            'user session established': (r) => r && r.token && r.userId === userId,
          });

          if (authResult) {
            // Test user data retrieval
            group('User Data Retrieval', function () {
              const userResponse = http.get(`${API_BASE_URL}/users/${userId}`, {
                headers: authResult.headers,
              });

              check(userResponse, {
                'user data retrieved': (r) => r.status === 200,
                'student profile complete': (r) => {
                  const user = r.json('user');
                  return user.firstName === studentData.firstName &&
                         user.lastName === studentData.lastName &&
                         user.email === studentData.email;
                },
              });
            });

            // Test student profile updates
            group('Profile Update', function () {
              const updatePayload = JSON.stringify({
                firstName: `${studentData.firstName} (Updated)`,
                lastName: studentData.lastName,
                grade: (parseInt(studentData.grade) + 1).toString(),
              });

              const updateResponse = http.put(`${API_BASE_URL}/users/${userId}`, updatePayload, {
                headers: authResult.headers,
              });

              check(updateResponse, {
                'profile update successful': (r) => r.status === 200,
                'updated data persisted': (r) => {
                  const user = r.json('user');
                  return user.firstName.includes('Updated');
                },
              });
            });
          }
        });
      }

      // Test duplicate registration handling
      if (registrationSuccess && Math.random() < 0.1) { // 10% of the time
        group('Duplicate Registration Prevention', function () {
          const duplicatePayload = JSON.stringify({
            ...studentData,
            password,
            confirmPassword: password,
          });

          const duplicateResponse = http.post(`${API_BASE_URL}/auth/register`, duplicatePayload, {
            headers: commonHeaders,
          });

          check(duplicateResponse, {
            'duplicate registration prevented': (r) => r.status === 409 || r.status === 400,
            'appropriate error message': (r) => {
              const error = r.json('message') || r.json('error');
              return error && (error.toLowerCase().includes('already exists') ||
                            error.toLowerCase().includes('duplicate'));
            },
          });
        });
      }
    });

    // Simulate realistic user behavior
    sleep(Math.random() * 2 + 0.5); // Random delay between 0.5-2.5 seconds
  });

  // Periodic cleanup to avoid memory issues
  if (createdUsers.length > 500) {
    cleanupBatch();
  }
}

function cleanupBatch() {
  const batchToClean = createdUsers.slice(0, 100);
  createdUsers = createdUsers.slice(100);

  for (const user of batchToClean) {
    try {
      const authResult = authenticateUser(user.email, user.password);
      if (authResult) {
        cleanupTestData(user.id, authResult.headers);
      }
    } catch (error) {
      console.log(`Failed to cleanup user ${user.id}: ${error.message}`);
    }
  }
}

// Teardown function
export function teardown() {
  console.log(`Cleaning up ${createdUsers.length} created users...`);

  for (const user of createdUsers) {
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
    'registration-performance-report.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const result = [];

  result.push('👨‍🎓 Student Registration Performance Test Results');
  result.push('===============================================');
  result.push('');

  // Registration metrics
  if (data.metrics.registration_success_rate) {
    result.push(`📊 Registration Success Rate: ${(data.metrics.registration_success_rate.rate * 100).toFixed(2)}%`);
  }

  if (data.metrics.registration_response_time) {
    result.push(`⏱️  Registration Response Time (P95): ${data.metrics.registration_response_time.p95.toFixed(2)}ms`);
  }

  // Student creation metrics
  if (data.metrics.student_creation_success_rate) {
    result.push(`🎓 Student Creation Success Rate: ${(data.metrics.student_creation_success_rate.rate * 100).toFixed(2)}%`);
  }

  // Validation metrics
  if (data.metrics.validation_error_rate) {
    result.push(`✅ Validation Error Rate: ${(data.metrics.validation_error_rate.rate * 100).toFixed(2)}%`);
  }

  // General HTTP metrics
  if (data.metrics.http_req_duration) {
    result.push(`🌐 HTTP Response Time (P95): ${data.metrics.http_req_duration.p95.toFixed(2)}ms`);
  }

  if (data.metrics.http_req_failed) {
    result.push(`❌ HTTP Error Rate: ${(data.metrics.http_req_failed.rate * 100).toFixed(2)}%`);
  }

  // VUs and duration
  if (data.metrics.vus) {
    result.push(`👥 Peak Virtual Users: ${data.metrics.vus.max}`);
  }

  result.push('');
  result.push('🎯 Performance SLAs:');
  result.push(`✅ Registration Response Time < 800ms: ${data.metrics.registration_response_time?.p95 < 800 ? 'PASSED' : 'FAILED'}`);
  result.push(`✅ Registration Success Rate > 90%: ${(data.metrics.registration_success_rate?.rate * 100) > 90 ? 'PASSED' : 'FAILED'}`);
  result.push(`✅ Student Creation Success Rate > 85%: ${(data.metrics.student_creation_success_rate?.rate * 100) > 85 ? 'PASSED' : 'FAILED'}`);
  result.push(`✅ HTTP Error Rate < 10%: ${data.metrics.http_req_failed?.rate < 0.1 ? 'PASSED' : 'FAILED'}`);

  return result.join('\n');
}