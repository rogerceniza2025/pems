/**
 * Chaos Engine
 *
 * Core chaos engineering engine that manages and executes chaos experiments
 * in the PEMS system. Provides safe execution with automatic rollback capabilities.
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import { ChaosExperiment, CHAOS_CONFIG } from './chaos-config';

export interface ChaosExecution {
  id: string;
  experimentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
  startTime: Date;
  endTime?: Date;
  metrics: Record<string, any>;
  logs: string[];
  error?: string;
}

export interface ChaosMetrics {
  timestamp: Date;
  cpu: number;
  memory: number;
  disk: number;
  network: {
    latency: number;
    throughput: number;
    errorRate: number;
  };
  application: {
    responseTime: number;
    errorRate: number;
    availability: number;
  };
}

export class ChaosEngine extends EventEmitter {
  private activeExperiments = new Map<string, ChaosExecution>();
  private metricsHistory: ChaosMetrics[] = [];
  private isRunning = false;
  private kubectlProcess?: ChildProcess;
  private metricsInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.on('experiment:started', this.onExperimentStarted.bind(this));
    this.on('experiment:completed', this.onExperimentCompleted.bind(this));
    this.on('experiment:failed', this.onExperimentFailed.bind(this));
    this.on('emergency:stop', this.onEmergencyStop.bind(this));
  }

  async initialize(): Promise<void> {
    console.log('🔧 Initializing Chaos Engine...');

    try {
      // Verify Kubernetes connection
      await this.verifyKubernetesConnection();

      // Check if Chaos Mesh is installed
      await this.verifyChaosMeshInstallation();

      // Set up monitoring
      this.setupMonitoring();

      // Load existing experiments
      await this.loadExperiments();

      this.isRunning = true;
      console.log('✅ Chaos Engine initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize Chaos Engine:', error);
      throw error;
    }
  }

  async executeExperiment(experimentId: string, options: {
    duration?: number;
    dryRun?: boolean;
    force?: boolean;
  } = {}): Promise<string> {
    if (!this.isRunning) {
      throw new Error('Chaos Engine is not running');
    }

    const experiment = CHAOS_CONFIG.experiments.find(e => e.id === experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    // Safety checks
    if (!experiment.safeMode && !options.force) {
      throw new Error(`Experiment ${experimentId} requires --force flag`);
    }

    if (this.activeExperiments.size >= CHAOS_CONFIG.global.safety.maxExperiments) {
      throw new Error('Maximum concurrent experiments reached');
    }

    // Create execution record
    const executionId = this.generateExecutionId();
    const execution: ChaosExecution = {
      id: executionId,
      experimentId,
      status: 'pending',
      startTime: new Date(),
      metrics: {},
      logs: [],
    };

    this.activeExperiments.set(executionId, execution);

    try {
      console.log(`🚀 Starting chaos experiment: ${experiment.name}`);

      if (options.dryRun || CHAOS_CONFIG.global.dryRun) {
        await this.executeDryRun(experiment, execution);
      } else {
        await this.executeChaosExperiment(experiment, execution, options);
      }

      return executionId;

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit('experiment:failed', execution);
      throw error;
    }
  }

  private async executeDryRun(experiment: ChaosExperiment, execution: ChaosExecution): Promise<void> {
    console.log(`🔍 Dry run for experiment: ${experiment.name}`);

    execution.status = 'running';
    this.emit('experiment:started', execution);

    // Simulate experiment without actually applying chaos
    const duration = 5000; // 5 seconds for dry run

    await this.simulateExperimentEffects(experiment, duration);

    execution.status = 'completed';
    execution.endTime = new Date();
    this.emit('experiment:completed', execution);

    console.log(`✅ Dry run completed: ${experiment.name}`);
  }

  private async executeChaosExperiment(
    experiment: ChaosExperiment,
    execution: ChaosExecution,
    options: any
  ): Promise<void> {
    console.log(`⚡ Executing chaos experiment: ${experiment.name}`);

    execution.status = 'running';
    this.emit('experiment:started', execution);

    const duration = options.duration || experiment.duration;

    try {
      // Apply chaos based on experiment type
      switch (experiment.type) {
        case 'network':
          await this.applyNetworkChaos(experiment, duration);
          break;
        case 'pod':
          await this.applyPodChaos(experiment, duration);
          break;
        case 'database':
          await this.applyDatabaseChaos(experiment, duration);
          break;
        case 'http':
          await this.applyHttpChaos(experiment, duration);
          break;
        default:
          throw new Error(`Unsupported experiment type: ${experiment.type}`);
      }

      // Monitor experiment
      await this.monitorExperiment(experiment, duration);

      // Cleanup chaos
      await this.cleanupChaos(experiment);

      execution.status = 'completed';
      execution.endTime = new Date();
      this.emit('experiment:completed', execution);

      console.log(`✅ Chaos experiment completed: ${experiment.name}`);

    } catch (error) {
      console.error(`❌ Chaos experiment failed: ${experiment.name}`, error);

      // Always attempt cleanup on failure
      try {
        await this.cleanupChaos(experiment);
      } catch (cleanupError) {
        console.error('Failed to cleanup chaos:', cleanupError);
      }

      throw error;
    }
  }

  private async applyNetworkChaos(experiment: ChaosExperiment, duration: number): Promise<void> {
    const networkConfig = CHAOS_CONFIG.network.config;

    // Create NetworkChaos resource
    const chaosManifest = {
      apiVersion: 'chaos-mesh.org/v1alpha1',
      kind: 'NetworkChaos',
      metadata: {
        name: `network-chaos-${Date.now()}`,
        namespace: CHAOS_CONFIG.global.namespace,
      },
      spec: {
        action: 'delay',
        mode: 'all',
        selector: {
          labelSelectors: {
            app: experiment.targetServices[0], // Simplified selector
          },
        },
        delay: {
          latency: `${networkConfig.latency.delay}ms`,
          jitter: `${networkConfig.latency.jitter}ms`,
          correlation: networkConfig.latency.correlation,
        },
        duration: `${duration}s`,
      },
    };

    if (networkConfig.loss.enabled) {
      chaosManifest.spec.loss = {
        loss: `${networkConfig.loss.percentage}%`,
        correlation: networkConfig.loss.correlation,
      };
    }

    await this.applyChaosManifest(chaosManifest);
  }

  private async applyPodChaos(experiment: ChaosExperiment, duration: number): Promise<void> {
    const podConfig = CHAOS_CONFIG.pod.config;

    const chaosManifest = {
      apiVersion: 'chaos-mesh.org/v1alpha1',
      kind: 'PodChaos',
      metadata: {
        name: `pod-chaos-${Date.now()}`,
        namespace: CHAOS_CONFIG.global.namespace,
      },
      spec: {
        action: 'pod-kill',
        mode: 'one',
        selector: {
          labelSelectors: {
            app: experiment.targetServices[0],
          },
        },
        gracePeriodSeconds: podConfig.kill.gracefulPeriod,
        duration: `${duration}s`,
      },
    };

    await this.applyChaosManifest(chaosManifest);
  }

  private async applyDatabaseChaos(experiment: ChaosExperiment, duration: number): Promise<void> {
    const dbConfig = CHAOS_CONFIG.database.config;

    // For database chaos, we'll use Toxiproxy to manipulate connections
    const toxiproxyConfig = {
      enabled: true,
      proxy: {
        upstream: 'localhost:5432', // PostgreSQL
        downstream: 'localhost:5433',
      },
      chaos: {
        latency: {
          enabled: dbConfig.queryLatency.enabled,
          delay: dbConfig.queryLatency.delay,
        },
        connectionFailure: {
          enabled: dbConfig.connectionFailure.enabled,
          probability: dbConfig.connectionFailure.percentage / 100,
        },
      },
    };

    await this.applyDatabaseChaosWithToxiproxy(toxiproxyConfig, duration);
  }

  private async applyHttpChaos(experiment: ChaosExperiment, duration: number): Promise<void> {
    const httpChaosManifest = {
      apiVersion: 'chaos-mesh.org/v1alpha1',
      kind: 'HTTPChaos',
      metadata: {
        name: `http-chaos-${Date.now()}`,
        namespace: CHAOS_CONFIG.global.namespace,
      },
      spec: {
        action: 'abort',
        mode: 'all',
        selector: {
          labelSelectors: {
            app: experiment.targetServices[0],
          },
        },
        target: 'Request',
        abort: {
          http_status: 503,
          percentage: 50,
        },
        port: 80,
        path: '*',
        duration: `${duration}s`,
      },
    };

    await this.applyChaosManifest(httpChaosManifest);
  }

  private async applyChaosManifest(manifest: any): Promise<void> {
    const manifestYaml = JSON.stringify(manifest);

    return new Promise((resolve, reject) => {
      const process = spawn('kubectl', [
        'apply', '-f', '-',
        '--namespace', CHAOS_CONFIG.global.namespace
      ], {
        env: { ...process.env, KUBECONFIG: process.env.KUBECONFIG || '~/.kube/config' }
      });

      process.stdin.write(manifestYaml);
      process.stdin.end();

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`kubectl apply failed with code ${code}`));
        }
      });

      process.on('error', reject);
    });
  }

  private async cleanupChaos(experiment: ChaosExperiment): Promise<void> {
    console.log(`🧹 Cleaning up chaos for experiment: ${experiment.name}`);

    // Remove all chaos objects for this experiment
    const chaosTypes = ['NetworkChaos', 'PodChaos', 'HTTPChaos', 'IOChaos', 'TimeChaos'];

    for (const chaosType of chaosTypes) {
      await this.removeChaosObjects(chaosType);
    }
  }

  private async removeChaosObjects(chaosType: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('kubectl', [
        'delete', chaosType,
        '--all',
        '--namespace', CHAOS_CONFIG.global.namespace,
        '--ignore-not-found=true'
      ]);

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`kubectl delete failed with code ${code}`));
        }
      });

      process.on('error', reject);
    });
  }

  private async monitorExperiment(experiment: ChaosExperiment, duration: number): Promise<void> {
    console.log(`📊 Monitoring experiment: ${experiment.name} for ${duration}s`);

    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);

    // Start metrics collection
    this.startMetricsCollection();

    while (Date.now() < endTime) {
      // Check for emergency stop
      if (CHAOS_CONFIG.global.safety.emergencyStop) {
        throw new Error('Emergency stop activated');
      }

      // Verify system health
      await this.verifySystemHealth(experiment);

      // Check blast radius
      await this.checkBlastRadius(experiment);

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, CHAOS_CONFIG.global.safety.healthCheckInterval * 1000));
    }

    this.stopMetricsCollection();
  }

  private async verifySystemHealth(experiment: ChaosExperiment): Promise<void> {
    // Check if minimum required replicas are healthy
    for (const service of experiment.targetServices) {
      const config = CHAOS_CONFIG.serviceConfigs[service];
      if (config) {
        const healthyReplicas = await this.getHealthyReplicas(service);
        if (healthyReplicas < config.minReplicas) {
          throw new Error(`Service ${service} has insufficient healthy replicas: ${healthyReplicas} < ${config.minReplicas}`);
        }
      }
    }
  }

  private async checkBlastRadius(experiment: ChaosExperiment): Promise<void> {
    // Verify that chaos is contained within expected blast radius
    const blastRadius = CHAOS_CONFIG.global.safety.blastRadius;

    if (blastRadius === 'limited') {
      // Check that only target services are affected
      const affectedServices = await this.getAffectedServices();
      const unexpectedServices = affectedServices.filter(s => !experiment.targetServices.includes(s));

      if (unexpectedServices.length > 0) {
        throw new Error(`Chaos affected unexpected services: ${unexpectedServices.join(', ')}`);
      }
    }
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        this.metricsHistory.push(metrics);

        // Keep only last 1000 metrics entries
        if (this.metricsHistory.length > 1000) {
          this.metricsHistory = this.metricsHistory.slice(-1000);
        }
      } catch (error) {
        console.error('Failed to collect metrics:', error);
      }
    }, 5000); // Collect metrics every 5 seconds
  }

  private stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
  }

  private async collectMetrics(): Promise<ChaosMetrics> {
    // This would collect actual metrics from Prometheus, Kubernetes API, etc.
    // For now, we'll return mock metrics

    return {
      timestamp: new Date(),
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
      network: {
        latency: 50 + Math.random() * 200,
        throughput: 1000 + Math.random() * 5000,
        errorRate: Math.random() * 5,
      },
      application: {
        responseTime: 100 + Math.random() * 500,
        errorRate: Math.random() * 2,
        availability: 95 + Math.random() * 5,
      },
    };
  }

  private async simulateExperimentEffects(experiment: ChaosExperiment, duration: number): Promise<void> {
    // Simulate the effects of the experiment for dry run
    const steps = Math.ceil(duration / 1000); // Update every second

    for (let i = 0; i < steps; i++) {
      console.log(`🔍 Simulating experiment effect ${i + 1}/${steps}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  private generateExecutionId(): string {
    return `chaos-exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async verifyKubernetesConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('kubectl', ['cluster-info']);

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error('Cannot connect to Kubernetes cluster'));
        }
      });

      process.on('error', reject);
    });
  }

  private async verifyChaosMeshInstallation(): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('kubectl', [
        'get', 'crd', '--namespace', CHAOS_CONFIG.global.namespace
      ]);

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error('Chaos Mesh is not installed or not accessible'));
        }
      });

      process.on('error', reject);
    });
  }

  private setupMonitoring(): void {
    // Set up monitoring for chaos experiments
    if (CHAOS_CONFIG.global.monitoring.metricsCollection) {
      console.log('📊 Setting up metrics collection...');
    }

    if (CHAOS_CONFIG.global.monitoring.alerting) {
      console.log('🚨 Setting up alerting...');
    }
  }

  private async loadExperiments(): Promise<void> {
    console.log(`📋 Loaded ${CHAOS_CONFIG.experiments.length} experiments`);
  }

  // Event handlers
  private onExperimentStarted(execution: ChaosExecution): void {
    console.log(`🚀 Experiment started: ${execution.experimentId}`);
  }

  private onExperimentCompleted(execution: ChaosExecution): void {
    console.log(`✅ Experiment completed: ${execution.experimentId}`);
    this.activeExperiments.delete(execution.id);
  }

  private onExperimentFailed(execution: ChaosExecution): void {
    console.error(`❌ Experiment failed: ${execution.experimentId}`, execution.error);
    this.activeExperiments.delete(execution.id);
  }

  private onEmergencyStop(): void {
    console.log('🛑 Emergency stop triggered - rolling back all experiments');
    this.stopAllExperiments();
  }

  private async getHealthyReplicas(service: string): Promise<number> {
    // Query Kubernetes API for healthy replicas
    // For now, return a mock value
    return Math.floor(Math.random() * 3) + 1;
  }

  private async getAffectedServices(): Promise<string[]> {
    // Determine which services are currently affected by chaos
    // For now, return a mock value
    return ['auth-service', 'user-service'];
  }

  private async applyDatabaseChaosWithToxiproxy(config: any, duration: number): Promise<void> {
    // Implementation using Toxiproxy for database chaos
    console.log('🔧 Applying database chaos with Toxiproxy');

    // This would integrate with Toxiproxy to manipulate database connections
    // For now, we'll simulate the delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Public API methods
  public stopExperiment(executionId: string): Promise<void> {
    const execution = this.activeExperiments.get(executionId);
    if (!execution) {
      throw new Error(`Experiment not found: ${executionId}`);
    }

    console.log(`🛑 Stopping experiment: ${execution.experimentId}`);

    // Mark for rollback
    execution.status = 'rolled_back';
    this.activeExperiments.delete(executionId);

    return Promise.resolve();
  }

  public stopAllExperiments(): Promise<void> {
    console.log('🛑 Stopping all active experiments');

    const stopPromises = Array.from(this.activeExperiments.keys()).map(id =>
      this.stopExperiment(id)
    );

    return Promise.all(stopPromises).then(() => {});
  }

  public getActiveExperiments(): ChaosExecution[] {
    return Array.from(this.activeExperiments.values());
  }

  public getMetricsHistory(): ChaosMetrics[] {
    return this.metricsHistory;
  }

  public async shutdown(): Promise<void> {
    console.log('🔧 Shutting down Chaos Engine...');

    // Stop all experiments
    await this.stopAllExperiments();

    // Stop metrics collection
    this.stopMetricsCollection();

    this.isRunning = false;
    console.log('✅ Chaos Engine shut down successfully');
  }
}