#!/usr/bin/env node

/**
 * Provider Contract Verification Script
 *
 * This script verifies provider implementations against published consumer contracts,
 * ensuring that API changes don't break existing consumer expectations.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const pactConfig = require('../pact-broker.config');

class ProviderContractVerifier {
  constructor(options = {}) {
    this.config = {
      ...pactConfig.pactBroker,
      ...options,
    };

    this.provider = options.provider || process.env.PROVIDER;
    this.providerUrl = options.providerUrl || process.env.PROVIDER_URL;
    this.providerVersion = options.providerVersion || process.env.PROVIDER_VERSION || this.getVersionFromPackage();

    this.verificationResults = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      details: [],
    };

    this.testResultsPath = path.join(__dirname, '../test-results/provider-verification');
    this.ensureResultsDirectory();
  }

  getVersionFromPackage() {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
      return packageJson.version || '1.0.0';
    } catch (error) {
      console.warn('Could not read version from package.json, using default');
      return '1.0.0';
    }
  }

  ensureResultsDirectory() {
    if (!fs.existsSync(this.testResultsPath)) {
      fs.mkdirSync(this.testResultsPath, { recursive: true });
    }
  }

  async verifyAllProviders() {
    console.log('🔍 Starting provider contract verification for all providers...');
    console.log(`📊 Pact Broker: ${this.config.url}`);
    console.log(`📝 Provider Version: ${this.providerVersion}`);
    console.log('');

    try {
      await this.verifyPactBrokerConnection();

      const providers = this.config.providers;
      console.log(`📋 Found ${providers.length} providers to verify`);

      if (providers.length === 0) {
        console.log('ℹ️ No providers found to verify');
        return;
      }

      // Verify each provider in parallel
      const verificationPromises = providers.map(provider =>
        this.verifyProvider(provider.name, provider.url, provider.verificationOptions)
      );

      await Promise.all(verificationPromises);

      await this.generateVerificationReport();

      if (this.verificationResults.failed > 0) {
        console.error(`❌ ${this.verificationResults.failed} provider verifications failed`);
        process.exit(1);
      } else {
        console.log(`✅ All ${this.verificationResults.passed} provider verifications passed`);
        process.exit(0);
      }

    } catch (error) {
      console.error('💥 Provider verification failed:', error.message);
      process.exit(1);
    }
  }

  async verifyProvider(providerName, providerUrl, options = {}) {
    if (!providerName) {
      throw new Error('Provider name is required');
    }

    console.log(`🔍 Verifying provider: ${providerName}`);
    console.log(`🔗 URL: ${providerUrl || this.providerUrl}`);

    try {
      // Ensure provider service is running
      await this.verifyProviderHealth(providerUrl || this.providerUrl);

      // Setup provider states
      if (options.providerStatesSetupUrl) {
        await this.setupProviderStates(providerName, options.providerStatesSetupUrl);
      }

      // Run pact verification
      const verificationResult = await this.runPactVerification(providerName, providerUrl, options);

      this.verificationResults.total++;

      if (verificationResult.success) {
        this.verificationResults.passed++;
        console.log(`✅ ${providerName} verification passed`);
      } else {
        this.verificationResults.failed++;
        console.error(`❌ ${providerName} verification failed`);
      }

      if (verificationResult.warnings) {
        this.verificationResults.warnings += verificationResult.warnings;
      }

      this.verificationResults.details.push({
        provider: providerName,
        ...verificationResult,
      });

    } catch (error) {
      this.verificationResults.total++;
      this.verificationResults.failed++;

      console.error(`❌ ${providerName} verification error: ${error.message}`);

      this.verificationResults.details.push({
        provider: providerName,
        success: false,
        error: error.message,
      });
    }
  }

  async verifyPactBrokerConnection() {
    try {
      const response = await axios.get(`${this.config.url}/hb`, {
        headers: this.getAuthHeaders(),
        timeout: 10000,
      });

      if (response.status !== 200) {
        throw new Error(`Pact broker health check failed: ${response.status}`);
      }

      console.log('✅ Pact broker connection verified');
    } catch (error) {
      throw new Error(`Cannot connect to Pact broker: ${error.message}`);
    }
  }

  async verifyProviderHealth(providerUrl) {
    if (!providerUrl) {
      console.warn('⚠️ No provider URL specified, skipping health check');
      return;
    }

    const maxRetries = 30;
    const retryDelay = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.get(`${providerUrl}/health`, {
          timeout: 5000,
        });

        if (response.status === 200) {
          console.log(`✅ Provider health check passed for ${providerUrl}`);
          return;
        }
      } catch (error) {
        if (attempt === maxRetries) {
          throw new Error(`Provider health check failed after ${maxRetries} attempts: ${error.message}`);
        }

        console.log(`⏳ Waiting for provider ${providerUrl}... (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  async setupProviderStates(providerName, providerStatesSetupUrl) {
    console.log(`🔧 Setting up provider states for ${providerName}`);

    const providerStates = this.getProviderStates(providerName);

    for (const state of providerStates) {
      try {
        await axios.post(providerStatesSetupUrl, state, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN || 'test-token'}`,
          },
          timeout: 10000,
        });

        console.log(`✅ Setup provider state: ${state.state}`);
      } catch (error) {
        console.warn(`⚠️ Failed to setup provider state ${state.state}: ${error.message}`);
      }
    }
  }

  getProviderStates(providerName) {
    const baseStates = [
      {
        consumer: 'pems-frontend',
        state: 'user exists',
        params: {
          userId: 'test-user-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          tenantId: 'test-tenant-123',
        },
      },
      {
        consumer: 'pems-frontend',
        state: 'user does not exist',
        params: {
          userId: 'nonexistent-user',
          email: 'nonexistent@example.com',
        },
      },
      {
        consumer: 'pems-admin',
        state: 'admin user exists',
        params: {
          userId: 'admin-user-123',
          email: 'admin@example.com',
          role: 'admin',
          permissions: ['read', 'write', 'delete', 'manage_users'],
        },
      },
    ];

    // Add provider-specific states
    switch (providerName) {
      case 'pems-auth-service':
        return [
          ...baseStates,
          {
            consumer: 'pems-frontend',
            state: 'valid authentication credentials',
            params: {
              email: 'valid@example.com',
              password: 'ValidPassword123!',
            },
          },
          {
            consumer: 'pems-frontend',
            state: 'invalid authentication credentials',
            params: {
              email: 'invalid@example.com',
              password: 'WrongPassword123!',
            },
          },
        ];

      case 'pems-user-service':
        return [
          ...baseStates,
          {
            consumer: 'pems-frontend',
            state: 'user profile exists',
            params: {
              userId: 'profile-user-123',
              profile: {
                firstName: 'Profile',
                lastName: 'User',
                avatar: 'https://example.com/avatar.jpg',
                preferences: {
                  theme: 'light',
                  language: 'en',
                },
              },
            },
          },
        ];

      case 'pems-tenant-service':
        return [
          ...baseStates,
          {
            consumer: 'pems-frontend',
            state: 'tenant exists',
            params: {
              tenantId: 'test-tenant-123',
              name: 'Test Tenant',
              domain: 'test.example.com',
              plan: 'professional',
              status: 'active',
            },
          },
          {
            consumer: 'pems-frontend',
            state: 'tenant does not exist',
            params: {
              tenantId: 'nonexistent-tenant',
            },
          },
        ];

      case 'pems-notification-service':
        return [
          ...baseStates,
          {
            consumer: 'pems-frontend',
            state: 'notification channel available',
            params: {
              channelId: 'email-channel-123',
              type: 'email',
              status: 'active',
            },
          },
        ];

      default:
        return baseStates;
    }
  }

  async runPactVerification(providerName, providerUrl, options = {}) {
    const pactCommand = [
      'pact-broker',
      'verify-provider',
      '--provider', providerName,
      '--provider-base-url', providerUrl || this.providerUrl,
      '--provider-version', this.providerVersion,
      '--broker-base-url', this.config.url,
      '--publish-verification-results',
      '--verbose',
    ];

    // Add authentication
    if (this.config.auth.token) {
      pactCommand.push('--broker-token', this.config.auth.token);
    } else if (this.config.auth.username) {
      pactCommand.push('--broker-username', this.config.auth.username);
      pactCommand.push('--broker-password', this.config.auth.password);
    }

    // Add custom verification options
    if (options.providerStatesSetupUrl) {
      pactCommand.push('--provider-states-setup-url', options.providerStatesSetupUrl);
    }

    // Add custom request filter if specified
    if (options.requestFilter) {
      // Note: requestFilter needs to be implemented as a separate module
      pactCommand.push('--custom-provider-header', 'Authorization: Bearer ' + (process.env.TEST_AUTH_TOKEN || 'test-token'));
    }

    // Add verification timeouts
    pactCommand.push('--verification-timeout', '120000'); // 2 minutes

    // Add tags for this verification
    const tags = ['verification', 'ci'];
    if (process.env.GITHUB_REF_NAME) {
      tags.push(process.env.GITHUB_REF_NAME);
    }

    pactCommand.push('--consumer-version-tag', ...tags);

    return new Promise((resolve, reject) => {
      const child = spawn('npx', pactCommand, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          PACT_INTERACTION_RERUN_COMMAND: 'true',
        },
      });

      let stdout = '';
      let stderr = '';
      let success = true;
      let warnings = 0;

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;

        // Parse output for real-time feedback
        if (output.includes('✓')) {
          console.log('  ' + output.trim());
        } else if (output.includes('✗') || output.includes('Failed')) {
          console.error('  ' + output.trim());
          success = false;
        } else if (output.includes('WARNING')) {
          console.warn('  ' + output.trim());
          warnings++;
        } else if (output.trim()) {
          console.log('  ' + output.trim());
        }
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.error('  ERROR: ' + output.trim());
        success = false;
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            warnings,
            stdout,
            stderr,
          });
        } else {
          resolve({
            success: false,
            warnings,
            stdout,
            stderr,
            exitCode: code,
          });
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to execute pact verification: ${error.message}`));
      });
    });
  }

  async generateVerificationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      config: {
        brokerUrl: this.config.url,
        providerVersion: this.providerVersion,
      },
      summary: this.verificationResults,
      details: this.verificationResults.details,
      recommendations: this.generateRecommendations(),
    };

    // Save detailed report
    const reportPath = path.join(this.testResultsPath, 'verification-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReportPath = path.join(this.testResultsPath, 'verification-report.html');
    await this.generateHtmlReport(report, htmlReportPath);

    // Generate JUnit XML for CI integration
    const junitReportPath = path.join(this.testResultsPath, 'junit-report.xml');
    await this.generateJunitReport(report, junitReportPath);

    console.log(`📊 Verification report saved to: ${reportPath}`);
    console.log(`🌐 HTML report saved to: ${htmlReportPath}`);
    console.log(`📋 JUnit report saved to: ${junitReportPath}`);

    // Print summary
    this.printSummary();
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.verificationResults.failed > 0) {
      recommendations.push({
        type: 'error',
        title: 'Failed Verifications',
        message: `${this.verificationResults.failed} providers failed verification. Review the detailed report and fix contract violations.`,
      });
    }

    if (this.verificationResults.warnings > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Verification Warnings',
        message: `${this.verificationResults.warnings} warnings detected. Consider addressing these to improve contract quality.`,
      });
    }

    const failedProviders = this.verificationResults.details.filter(d => !d.success);
    if (failedProviders.length > 0) {
      recommendations.push({
        type: 'action',
        title: 'Required Actions',
        message: `Fix the following providers: ${failedProviders.map(p => p.provider).join(', ')}`,
        providers: failedProviders.map(p => p.provider),
      });
    }

    return recommendations;
  }

  printSummary() {
    console.log('');
    console.log('📊 Provider Verification Summary:');
    console.log(`   Total providers: ${this.verificationResults.total}`);
    console.log(`   Passed: ${this.verificationResults.passed}`);
    console.log(`   Failed: ${this.verificationResults.failed}`);
    console.log(`   Warnings: ${this.verificationResults.warnings}`);

    if (this.verificationResults.details.length > 0) {
      console.log('');
      console.log('📋 Provider Results:');
      this.verificationResults.details.forEach(detail => {
        const status = detail.success ? '✅' : '❌';
        const warnings = detail.warnings > 0 ? ` (${detail.warnings} warnings)` : '';
        console.log(`   ${status} ${detail.provider}${warnings}`);

        if (!detail.success && detail.error) {
          console.log(`      Error: ${detail.error}`);
        }
      });
    }
  }

  async generateHtmlReport(report, filePath) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Provider Contract Verification Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; margin-bottom: 20px; }
        .metric { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; }
        .success { background: #d4edda; color: #155724; }
        .failure { background: #f8d7da; color: #721c24; }
        .warning { background: #fff3cd; color: #856404; }
        .provider { border: 1px solid #ddd; margin-bottom: 10px; padding: 15px; border-radius: 5px; }
        .provider-header { font-weight: bold; margin-bottom: 10px; }
        .details { margin-top: 20px; }
        .recommendations { background: #e7f3ff; padding: 15px; border-radius: 5px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Provider Contract Verification Report</h1>
        <p><strong>Generated:</strong> ${report.timestamp}</p>
        <p><strong>Provider Version:</strong> ${report.config.providerVersion}</p>
    </div>

    <div class="summary">
        <div class="metric ${report.summary.passed > 0 ? 'success' : ''}">
            <h3>✅ ${report.summary.passed}</h3>
            <p>Passed</p>
        </div>
        <div class="metric ${report.summary.failed > 0 ? 'failure' : ''}">
            <h3>❌ ${report.summary.failed}</h3>
            <p>Failed</p>
        </div>
        <div class="metric ${report.summary.warnings > 0 ? 'warning' : ''}">
            <h3>⚠️ ${report.summary.warnings}</h3>
            <p>Warnings</p>
        </div>
        <div class="metric">
            <h3>📊 ${report.summary.total}</h3>
            <p>Total</p>
        </div>
    </div>

    <div class="details">
        <h2>Provider Results</h2>
        ${report.details.map(provider => `
            <div class="provider">
                <div class="provider-header">
                    ${provider.success ? '✅' : '❌'} ${provider.provider}
                    ${provider.warnings > 0 ? ` (${provider.warnings} warnings)` : ''}
                </div>
                ${provider.error ? `<p><strong>Error:</strong> ${provider.error}</p>` : ''}
                ${provider.stdout ? `<pre>${provider.stdout}</pre>` : ''}
            </div>
        `).join('')}
    </div>

    ${report.recommendations.length > 0 ? `
        <div class="recommendations">
            <h2>💡 Recommendations</h2>
            ${report.recommendations.map(rec => `
                <p><strong>${rec.title}:</strong> ${rec.message}</p>
            `).join('')}
        </div>
    ` : ''}
</body>
</html>`;

    fs.writeFileSync(filePath, html);
  }

  async generateJunitReport(report, filePath) {
    const testCases = report.details.map(provider => {
      const testCase = `
    <testcase classname="provider-contract-verification" name="${provider.provider}">
        ${provider.success ? '' : `
        <failure message="${provider.error || 'Verification failed'}">
            ${provider.stderr || provider.stdout || 'No details available'}
        </failure>`}
        ${provider.warnings > 0 ? `
        <skipped message="${provider.warnings} warnings detected"/>` : ''}
    </testcase>`;
      return testCase;
    }).join('\n');

    const junitXml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="Provider Contract Verification"
          tests="${report.summary.total}"
          failures="${report.summary.failed}"
          skipped="${report.summary.warnings}"
          timestamp="${report.timestamp}">
${testCases}
</testsuite>`;

    fs.writeFileSync(filePath, junitXml);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';

  const options = {};

  // Parse command line arguments
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--provider=')) {
      options.provider = arg.split('=')[1];
    } else if (arg.startsWith('--provider-url=')) {
      options.providerUrl = arg.split('=')[1];
    } else if (arg.startsWith('--version=')) {
      options.providerVersion = arg.split('=')[1];
    }
  }

  const verifier = new ProviderContractVerifier(options);

  switch (command) {
    case 'all':
      await verifier.verifyAllProviders();
      break;

    case 'provider':
      if (!options.provider) {
        console.error('❌ Provider name is required. Use --provider=<name>');
        process.exit(1);
      }
      await verifier.verifyProvider(options.provider, options.providerUrl);
      break;

    case 'help':
      console.log(`
Provider Contract Verification Script

Usage:
  node scripts/contract-verify.js [command] [options]

Commands:
  all           Verify all providers (default)
  provider      Verify a specific provider
  help          Show this help message

Options:
  --provider=<name>        Provider name to verify
  --provider-url=<url>     Provider service URL
  --version=<version>      Provider version

Environment Variables:
  PACT_BROKER_URL          URL of the Pact broker
  PACT_BROKER_TOKEN        Authentication token for Pact broker
  TEST_AUTH_TOKEN          Authentication token for provider services
  PROVIDER                 Default provider name
  PROVIDER_URL             Default provider URL
  PROVIDER_VERSION         Default provider version
      `);
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Use "help" to see available commands');
      process.exit(1);
  }
}

// Run script if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = ProviderContractVerifier;