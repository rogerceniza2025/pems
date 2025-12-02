/**
 * Pact Broker Configuration
 *
 * Central configuration for consumer-driven contract testing with Pact.
 * This file defines settings for publishing and verifying contracts
 * between microservices in the PEMS system.
 */

module.exports = {
  // Pact Broker Configuration
  pactBroker: {
    // URL of the Pact broker server
    url: process.env.PACT_BROKER_URL || 'http://localhost:9292',

    // Authentication credentials (if required)
    auth: {
      username: process.env.PACT_BROKER_USERNAME || '',
      password: process.env.PACT_BROKER_PASSWORD || '',
      token: process.env.PACT_BROKER_TOKEN || '',
    },

    // Consumer and Provider settings
    consumers: [
      {
        name: 'pems-frontend',
        version: process.env.FRONTEND_VERSION || '1.0.0',
        branch: process.env.GIT_BRANCH || 'main',
        tags: ['frontend', 'web'],
      },
      {
        name: 'pems-admin',
        version: process.env.ADMIN_VERSION || '1.0.0',
        branch: process.env.GIT_BRANCH || 'main',
        tags: ['admin', 'web'],
      },
    ],

    providers: [
      {
        name: 'pems-auth-service',
        version: process.env.AUTH_SERVICE_VERSION || '1.0.0',
        url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
        tags: ['authentication', 'security'],
        verificationOptions: {
          providerStatesSetupUrl: `${process.env.AUTH_SERVICE_URL || 'http://localhost:3001'}/api/v1/pact/states`,
          requestFilter: (req) => {
            // Add authentication headers for provider verification
            req.headers['Authorization'] = `Bearer ${process.env.TEST_AUTH_TOKEN || 'test-token'}`;
            req.headers['X-Test-Mode'] = 'contract-verification';
            return req;
          },
        },
      },
      {
        name: 'pems-user-service',
        version: process.env.USER_SERVICE_VERSION || '1.0.0',
        url: process.env.USER_SERVICE_URL || 'http://localhost:3002',
        tags: ['user-management', 'profile'],
        verificationOptions: {
          providerStatesSetupUrl: `${process.env.USER_SERVICE_URL || 'http://localhost:3002'}/api/v1/pact/states`,
          requestFilter: (req) => {
            req.headers['Authorization'] = `Bearer ${process.env.TEST_AUTH_TOKEN || 'test-token'}`;
            req.headers['X-Tenant-Id'] = 'test-tenant-123';
            return req;
          },
        },
      },
      {
        name: 'pems-tenant-service',
        version: process.env.TENANT_SERVICE_VERSION || '1.0.0',
        url: process.env.TENANT_SERVICE_URL || 'http://localhost:3004',
        tags: ['tenant-management', 'multi-tenant'],
        verificationOptions: {
          providerStatesSetupUrl: `${process.env.TENANT_SERVICE_URL || 'http://localhost:3004'}/api/v1/pact/states`,
          requestFilter: (req) => {
            req.headers['Authorization'] = `Bearer ${process.env.TEST_AUTH_TOKEN || 'test-token'}`;
            req.headers['X-Admin-Access'] = 'true';
            return req;
          },
        },
      },
      {
        name: 'pems-notification-service',
        version: process.env.NOTIFICATION_SERVICE_VERSION || '1.0.0',
        url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003',
        tags: ['notifications', 'communication'],
        verificationOptions: {
          providerStatesSetupUrl: `${process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003'}/api/v1/pact/states`,
          requestFilter: (req) => {
            req.headers['Authorization'] = `Bearer ${process.env.TEST_AUTH_TOKEN || 'test-token'}`;
            return req;
          },
        },
      },
    ],

    // Publishing settings
    publishing: {
      // Automatically publish contracts after tests
      autoPublish: process.env.CI === 'true' || process.env.NODE_ENV === 'production',

      // Branch-specific publishing rules
      branchRules: {
        main: {
          // Publish all contracts on main branch
          publishAll: true,
          // Tag as production-ready
          tags: ['production'],
          // Trigger provider verification
          triggerVerification: true,
        },
        develop: {
          // Publish contracts on develop branch
          publishAll: true,
          // Tag as development
          tags: ['development', 'staging'],
          // Trigger provider verification for selected providers
          triggerVerification: ['pems-auth-service', 'pems-user-service'],
        },
        // Feature branches
        'feature/*': {
          // Only publish contracts for modified services
          publishAll: false,
          // Tag with feature branch name
          tags: ['feature', '{branch}'],
          // Don't trigger provider verification
          triggerVerification: false,
        },
      },

      // Versioning strategy
      versioning: {
        // Use semantic versioning
        strategy: 'semantic',
        // Include git commit SHA in version
        includeCommitSha: true,
        // Include branch name in version
        includeBranch: true,
        // Use package.json version as base
        packageVersion: true,
      },

      // Build information
      buildInfo: {
        // Include build URL in contract metadata
        includeBuildUrl: true,
        // Include CI job information
        includeCiInfo: true,
        // Include git information
        includeGitInfo: true,
      },
    },

    // Verification settings
    verification: {
      // Provider verification timeouts
      timeout: 60000, // 60 seconds

      // Retry failed verifications
      retryAttempts: 3,
      retryDelay: 5000, // 5 seconds

      // Verification thresholds
      thresholds: {
        // Maximum percentage of failing interactions
        maxFailurePercentage: 0,
        // Maximum number of warnings
        maxWarnings: 5,
      },

      // Notification settings
      notifications: {
        // Notify on verification failures
        onFailure: true,
        // Notify on warnings
        onWarning: true,
        // Slack webhook for notifications
        slackWebhook: process.env.PACT_SLACK_WEBHOOK_URL || '',
        // Email recipients for notifications
        emailRecipients: process.env.PACT_NOTIFICATION_EMAILS?.split(',') || [],
      },

      // Reporting
      reporting: {
        // Generate HTML reports
        htmlReports: true,
        // Generate JSON reports
        jsonReports: true,
        // Generate JUnit XML reports for CI integration
        junitReports: true,
        // Upload reports to artifact storage
        uploadReports: process.env.CI === 'true',
      },
    },

    // Contract validation rules
    validation: {
      // Strict validation (fails on any issues)
      strict: true,

      // Validation rules
      rules: {
        // Require all interactions to have examples
        requireExamples: true,
        // Validate response schemas
        validateResponseSchemas: true,
        // Validate request schemas
        validateRequestSchemas: true,
        // Check for duplicate interactions
        checkDuplicateInteractions: true,
        // Validate provider states
        validateProviderStates: true,
      },

      // Custom validators
      customValidators: [
        // Validate authentication headers
        (interaction) => {
          if (interaction.request.headers && !interaction.request.headers.authorization) {
            throw new Error('Missing authorization header in request');
          }
        },
        // Validate tenant context
        (interaction) => {
          if (interaction.provider === 'pems-tenant-service' ||
              interaction.provider === 'pems-user-service') {
            if (!interaction.request.headers['x-tenant-id']) {
              throw new Error('Missing x-tenant-id header for multi-tenant service');
            }
          }
        },
        // Validate API versioning
        (interaction) => {
          if (interaction.request.path && !interaction.request.path.includes('/api/v1/')) {
            throw new Error('API path should include version (/api/v1/)');
          }
        },
      ],
    },

    // Webhooks configuration
    webhooks: {
      // Webhook triggered when contracts are published
      onContractPublished: {
        url: process.env.WEBHOOK_CONTRACT_PUBLISHED || '',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WEBHOOK_AUTH_TOKEN || ''}`,
        },
        body: {
          event: 'contract.published',
          data: '${pact}', // Pact will substitute with contract data
        },
        enabled: !!process.env.WEBHOOK_CONTRACT_PUBLISHED,
      },

      // Webhook triggered when provider verification fails
      onVerificationFailed: {
        url: process.env.WEBHOOK_VERIFICATION_FAILED || '',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WEBHOOK_AUTH_TOKEN || ''}`,
        },
        body: {
          event: 'verification.failed',
          data: '${verification}', // Pact will substitute with verification data
        },
        enabled: !!process.env.WEBHOOK_VERIFICATION_FAILED,
      },
    },

    // Development and testing settings
    development: {
      // Enable debug logging
      debug: process.env.NODE_ENV === 'development' || process.env.PACT_DEBUG === 'true',

      // Log pact interactions
      logInteractions: true,

      // Save pact files locally
      saveLocally: true,

      // Local pact file directory
      localPactDir: './tests/contracts/pacts',

      // Skip verification in development (for faster iteration)
      skipVerification: process.env.NODE_ENV === 'development' && process.env.PACT_SKIP_VERIFICATION === 'true',
    },

    // CI/CD integration
    ci: {
      // Enable in CI environments
      enabled: process.env.CI === 'true',

      // Run provider verification in parallel
      parallelVerification: true,

      // Maximum parallel verification jobs
      maxParallelJobs: 4,

      // Fail CI on contract violations
      failOnViolation: true,

      // Generate CI reports
      generateReports: true,

      // Upload artifacts to CI
      uploadArtifacts: true,

      // Artifact retention period (days)
      artifactRetentionDays: 30,
    },

    // Security settings
    security: {
      // Require authentication for broker communication
      requireAuth: process.env.NODE_ENV === 'production',

      // SSL verification
      verifySsl: process.env.NODE_ENV !== 'development',

      // Allowed origins for webhooks
      allowedWebhookOrigins: [
        'https://github.com',
        'https://api.github.com',
        'https://vercel.com',
      ],

      // Encrypt sensitive data in contracts
      encryptSensitiveData: true,

      // Sanitize contract data before publishing
      sanitizeData: true,
    },

    // Performance settings
    performance: {
      // Contract publishing timeout
      publishTimeout: 30000, // 30 seconds

      // Provider verification timeout
      verificationTimeout: 120000, // 2 minutes

      // Maximum contract size (bytes)
      maxContractSize: 1024 * 1024, // 1MB

      // Rate limiting for broker requests
      rateLimit: {
        enabled: true,
        maxRequests: 100,
        windowMs: 60000, // 1 minute
      },
    },
  },
};