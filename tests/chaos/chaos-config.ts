/**
 * Chaos Engineering Configuration
 *
 * Central configuration for chaos engineering experiments in PEMS.
 * Defines chaos scenarios, safety parameters, and experiment boundaries.
 */

export interface ChaosExperiment {
  id: string;
  name: string;
  description: string;
  type: 'network' | 'pod' | 'io' | 'time' | 'http' | 'database';
  severity: 'low' | 'medium' | 'high' | 'critical';
  duration: number; // seconds
  probability: number; // 0-1
  targetServices: string[];
  safeMode: boolean;
  rollback: boolean;
  metrics: string[];
  expectedBehavior: string[];
}

export interface NetworkChaosConfig {
  latency: {
    enabled: boolean;
    delay: number; // milliseconds
    jitter: number; // milliseconds
    correlation: number; // 0-1
  };
  loss: {
    enabled: boolean;
    percentage: number; // 0-100
    correlation: number; // 0-1
  };
  duplicate: {
    enabled: boolean;
    percentage: number; // 0-100
  };
  corrupt: {
    enabled: boolean;
    percentage: number; // 0-100
  };
  bandwidth: {
    enabled: boolean;
    rate: string; // e.g., '10mbit', '1gbit'
  };
}

export interface PodChaosConfig {
  kill: {
    enabled: boolean;
    gracefulPeriod: number; // seconds
  };
  containerFailure: {
    enabled: boolean;
    action: 'exit' | 'pause' | 'crash';
    exitCode: number;
  };
  resourceStress: {
    enabled: boolean;
    cpu: {
      enabled: boolean;
      cores: number;
      load: number; // 0-1
    };
    memory: {
      enabled: boolean;
      size: string; // e.g., '256Mi', '1Gi'
    };
  };
}

export interface DatabaseChaosConfig {
  connectionFailure: {
    enabled: boolean;
    percentage: number; // 0-100
    duration: number; // seconds
  };
  queryLatency: {
    enabled: boolean;
    delay: number; // milliseconds
    variance: number; // percentage
  };
  deadlock: {
    enabled: boolean;
    probability: number; // 0-1
    duration: number; // seconds
  };
  corruption: {
    enabled: boolean;
    percentage: number; // 0-100
    tables: string[];
  };
}

export const CHAOS_CONFIG = {
  // Global settings
  global: {
    enabled: process.env.CHAOS_ENABLED === 'true',
    dryRun: process.env.CHAOS_DRY_RUN === 'true',
    namespace: process.env.CHAOS_NAMESPACE || 'chaos-testing',
    environment: process.env.NODE_ENV || 'development',

    // Safety constraints
    safety: {
      maxExperiments: 5, // Maximum concurrent experiments
      minAvailableReplicas: 1, // Minimum replicas that must remain healthy
      blastRadius: 'limited', // 'limited', 'service', 'namespace', 'cluster'
      rollbackTimeout: 300, // seconds
      healthCheckInterval: 10, // seconds
      emergencyStop: process.env.CHAOS_EMERGENCY_STOP === 'true',
    },

    // Monitoring
    monitoring: {
      metricsCollection: true,
      alerting: true,
      logLevel: process.env.CHAOS_LOG_LEVEL || 'info',
      dashboardEnabled: process.env.CHAOS_DASHBOARD_ENABLED === 'true',
    },
  },

  // Network chaos configuration
  network: {
    enabled: true,
    config: {
      latency: {
        enabled: true,
        delay: 100, // 100ms base latency
        jitter: 50, // ±50ms jitter
        correlation: 0.25, // 25% correlation
      },
      loss: {
        enabled: true,
        percentage: 2, // 2% packet loss
        correlation: 0.5, // 50% correlation
      },
      duplicate: {
        enabled: true,
        percentage: 1, // 1% packet duplication
      },
      corrupt: {
        enabled: false, // Disabled by default for safety
        percentage: 0.1, // 0.1% packet corruption
      },
      bandwidth: {
        enabled: true,
        rate: '10mbit', // Limit to 10Mbps
      },
    } as NetworkChaosConfig,
  },

  // Pod chaos configuration
  pod: {
    enabled: true,
    config: {
      kill: {
        enabled: true,
        gracefulPeriod: 30, // 30 seconds
      },
      containerFailure: {
        enabled: true,
        action: 'exit',
        exitCode: 1,
      },
      resourceStress: {
        enabled: true,
        cpu: {
          enabled: true,
          cores: 1,
          load: 0.8, // 80% CPU load
        },
        memory: {
          enabled: true,
          size: '512Mi', // 512MB memory stress
        },
      },
    } as PodChaosConfig,
  },

  // Database chaos configuration
  database: {
    enabled: true,
    config: {
      connectionFailure: {
        enabled: true,
        percentage: 5, // 5% connection failure rate
        duration: 30, // 30 seconds
      },
      queryLatency: {
        enabled: true,
        delay: 200, // 200ms base delay
        variance: 50, // ±50% variance
      },
      deadlock: {
        enabled: false, // Disabled by default for safety
        probability: 0.01, // 1% probability
        duration: 10, // 10 seconds
      },
      corruption: {
        enabled: false, // Disabled by default for safety
        percentage: 0.1, // 0.1% corruption rate
        tables: [], // No tables by default
      },
    } as DatabaseChaosConfig,
  },

  // Predefined experiments
  experiments: [
    {
      id: 'network-latency-spike',
      name: 'Network Latency Spike',
      description: 'Injects network latency to simulate slow network conditions',
      type: 'network',
      severity: 'medium',
      duration: 300, // 5 minutes
      probability: 0.3, // 30% chance
      targetServices: ['auth-service', 'user-service', 'tenant-service'],
      safeMode: true,
      rollback: true,
      metrics: [
        'http_request_duration',
        'api_response_time',
        'user_login_duration',
        'database_query_time',
      ],
      expectedBehavior: [
        'API responses should remain < 2 seconds',
        'User authentication should not fail completely',
        'Circuit breaker should activate after repeated timeouts',
        'Retry mechanisms should handle temporary failures',
      ],
    },

    {
      id: 'database-connection-failure',
      name: 'Database Connection Failure',
      description: 'Simulates database connectivity issues',
      type: 'database',
      severity: 'high',
      duration: 180, // 3 minutes
      probability: 0.2, // 20% chance
      targetServices: ['auth-service', 'user-service', 'tenant-service'],
      safeMode: true,
      rollback: true,
      metrics: [
        'database_connection_errors',
        'api_error_rate_5xx',
        'service_availability',
        'fallback_response_rate',
      ],
      expectedBehavior: [
        'Services should fallback gracefully',
        'Cache should serve stale data when possible',
        'API should return 503 with proper error messages',
        'Services should recover automatically when database returns',
      ],
    },

    {
      id: 'pod-termination',
      name: 'Pod Termination',
      description: 'Terminates random pods to test Kubernetes orchestration',
      type: 'pod',
      severity: 'medium',
      duration: 600, // 10 minutes
      probability: 0.1, // 10% chance
      targetServices: ['auth-service', 'user-service', 'notification-service'],
      safeMode: true,
      rollback: true,
      metrics: [
        'pod_restart_count',
        'service_replicas_available',
        'api_response_time_during_failover',
        'user_experience_impact',
      ],
      expectedBehavior: [
        'Kubernetes should automatically restart failed pods',
        'Load balancer should redirect traffic to healthy pods',
        'API should remain available with minimal impact',
        'Zero-downtime deployment should work correctly',
      ],
    },

    {
      id: 'memory-pressure',
      name: 'Memory Pressure',
      description: 'Applies memory stress to test OOM handling',
      type: 'pod',
      severity: 'high',
      duration: 240, // 4 minutes
      probability: 0.15, // 15% chance
      targetServices: ['user-service', 'tenant-service'],
      safeMode: true,
      rollback: true,
      metrics: [
        'memory_usage_percent',
        'oom_killed_processes',
        'api_response_time',
        'error_rate_memory_related',
      ],
      expectedBehavior: [
        'Services should handle memory pressure gracefully',
        'Non-critical features should be disabled',
        'API should return 503 when overloaded',
        'Automatic recovery should occur when pressure subsides',
      ],
    },

    {
      id: 'http-failure-injection',
      name: 'HTTP Failure Injection',
      description: 'Injects HTTP failures to test resilience patterns',
      type: 'http',
      severity: 'medium',
      duration: 360, // 6 minutes
      probability: 0.25, // 25% chance
      targetServices: ['auth-service', 'user-service'],
      safeMode: true,
      rollback: true,
      metrics: [
        'http_5xx_error_rate',
        'circuit_breaker_state',
        'retry_attempts_count',
        'fallback_response_time',
      ],
      expectedBehavior: [
        'Circuit breaker should open after repeated failures',
        'Retry mechanisms should implement exponential backoff',
        'Fallback responses should be served when possible',
        'Error messages should be user-friendly',
      ],
    },

    {
      id: 'service-dependency-failure',
      name: 'Service Dependency Failure',
      description: 'Disrupts communication between services',
      type: 'network',
      severity: 'high',
      duration: 300, // 5 minutes
      probability: 0.2, // 20% chance
      targetServices: ['notification-service', 'analytics-service'],
      safeMode: true,
      rollback: true,
      metrics: [
        'inter_service_request_failure_rate',
        'service_dependency_availability',
        'graceful_degradation_features',
        'user_impact_score',
      ],
      expectedBehavior: [
        'Core functionality should remain available',
        'Non-critical features should be disabled',
        'Users should be informed of temporary limitations',
        'Services should recover automatically when dependencies return',
      ],
    },
  ] as ChaosExperiment[],

  // Service-specific configurations
  serviceConfigs: {
    'auth-service': {
      maxLatency: 2000, // 2 seconds
      maxErrorRate: 0.01, // 1%
      minReplicas: 2,
      criticalEndpoints: ['/api/v1/auth/login', '/api/v1/auth/register'],
      fallbackMode: 'cache-session',
    },
    'user-service': {
      maxLatency: 3000, // 3 seconds
      maxErrorRate: 0.02, // 2%
      minReplicas: 2,
      criticalEndpoints: ['/api/v1/users/profile', '/api/v1/users/search'],
      fallbackMode: 'stale-data',
    },
    'tenant-service': {
      maxLatency: 2000, // 2 seconds
      maxErrorRate: 0.01, // 1%
      minReplicas: 1,
      criticalEndpoints: ['/api/v1/tenants/current', '/api/v1/tenants/config'],
      fallbackMode: 'local-cache',
    },
    'notification-service': {
      maxLatency: 10000, // 10 seconds (non-critical)
      maxErrorRate: 0.1, // 10%
      minReplicas: 1,
      criticalEndpoints: [],
      fallbackMode: 'async-queue',
    },
  },

  // Chaos experiment schedules
  schedules: {
    development: {
      frequency: 'manual', // Only run manually in development
      experiments: ['network-latency-spike', 'http-failure-injection'],
    },
    staging: {
      frequency: 'daily', // Run daily in staging
      time: '02:00', // 2 AM UTC
      experiments: [
        'network-latency-spike',
        'database-connection-failure',
        'pod-termination',
        'memory-pressure',
      ],
    },
    production: {
      frequency: 'weekly', // Run weekly in production
      day: 'sunday', // Sunday
      time: '03:00', // 3 AM UTC
      experiments: ['network-latency-spike', 'http-failure-injection'],
      restricted: true, // Requires manual approval
    },
  },
};

export default CHAOS_CONFIG;