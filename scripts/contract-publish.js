#!/usr/bin/env node

/**
 * Contract Publishing Script
 *
 * This script manages the publishing of consumer contracts to the Pact broker,
 * enabling provider contract verification and ensuring API compatibility across
 * microservices.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class ContractPublisher {
  constructor() {
    this.config = {
      pactBrokerUrl: process.env.PACT_BROKER_URL || 'http://localhost:9292',
      pactBrokerToken: process.env.PACT_BROKER_TOKEN || '',
      consumerVersion: process.env.CONSUMER_VERSION || this.getVersionFromPackage(),
      gitBranch: process.env.GITHUB_REF_NAME || process.env.GIT_BRANCH || 'main',
      gitCommit: process.env.GITHUB_SHA || process.env.GIT_COMMIT || 'unknown',
      buildUrl: process.env.CI_BUILD_URL || '',
    };

    this.contractsPath = path.join(__dirname, '../tests/contracts');
    this.publishedContracts = [];
    this.failedContracts = [];
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

  async publishAllContracts() {
    console.log('🚀 Starting contract publishing process...');
    console.log(`📊 Pact Broker: ${this.config.pactBrokerUrl}`);
    console.log(`📝 Consumer Version: ${this.config.consumerVersion}`);
    console.log(`🌿 Git Branch: ${this.config.gitBranch}`);
    console.log('');

    try {
      // Ensure Pact broker is accessible
      await this.verifyPactBrokerConnection();

      // Find all contract files
      const contractFiles = this.findContractFiles();
      console.log(`📋 Found ${contractFiles.length} contract files to publish`);

      if (contractFiles.length === 0) {
        console.log('ℹ️ No contracts found to publish');
        return;
      }

      // Publish each contract
      for (const contractFile of contractFiles) {
        await this.publishContract(contractFile);
      }

      // Generate publishing report
      await this.generatePublishingReport();

      // Set build status in CI if applicable
      if (this.config.buildUrl) {
        await this.updateBuildStatus();
      }

      // Exit with appropriate code
      if (this.failedContracts.length > 0) {
        console.error(`❌ Failed to publish ${this.failedContracts.length} contracts`);
        process.exit(1);
      } else {
        console.log(`✅ Successfully published ${this.publishedContracts.length} contracts`);
        process.exit(0);
      }

    } catch (error) {
      console.error('💥 Contract publishing failed:', error.message);
      process.exit(1);
    }
  }

  async verifyPactBrokerConnection() {
    try {
      const response = await axios.get(`${this.config.pactBrokerUrl}/hb`, {
        headers: this.config.pactBrokerToken ? {
          'Authorization': `Bearer ${this.config.pactBrokerToken}`
        } : {},
        timeout: 10000,
      });

      if (response.status !== 200) {
        throw new Error(`Pact broker health check failed: ${response.status}`);
      }

      console.log('✅ Pact broker connection verified');
    } catch (error) {
      throw new Error(`Cannot connect to Pact broker at ${this.config.pactBrokerUrl}: ${error.message}`);
    }
  }

  findContractFiles() {
    const contractFiles = [];

    // Recursively find all .json pact files
    const findFiles = (dir) => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          findFiles(filePath);
        } else if (file.endsWith('.json') && (file.includes('pact') || file.includes('contract'))) {
          contractFiles.push(filePath);
        }
      }
    };

    findFiles(this.contractsPath);
    return contractFiles;
  }

  async publishContract(contractFilePath) {
    const contractName = path.basename(contractFilePath, '.json');
    console.log(`📤 Publishing contract: ${contractName}`);

    try {
      // Read contract file
      const contractData = JSON.parse(fs.readFileSync(contractFilePath, 'utf8'));

      // Validate contract structure
      this.validateContract(contractData, contractName);

      // Determine consumer and provider from contract
      const { consumer, provider } = this.extractConsumerProvider(contractData, contractName);

      // Publish to Pact broker
      const publishResult = await this.publishToPactBroker(contractData, consumer, provider);

      this.publishedContracts.push({
        name: contractName,
        consumer,
        provider,
        filePath: contractFilePath,
        publishResult,
      });

      console.log(`✅ Published ${contractName} (${consumer} -> ${provider})`);

    } catch (error) {
      this.failedContracts.push({
        name: contractName,
        filePath: contractFilePath,
        error: error.message,
      });

      console.error(`❌ Failed to publish ${contractName}: ${error.message}`);
    }
  }

  validateContract(contractData, contractName) {
    if (!contractData || typeof contractData !== 'object') {
      throw new Error(`Invalid contract data in ${contractName}`);
    }

    // Basic Pact contract validation
    if (contractData.consumer && contractData.provider && contractData.interactions) {
      // Valid Pact contract
      return;
    }

    // OpenAPI contract validation
    if (contractData.openapi && contractData.paths) {
      // Valid OpenAPI contract
      return;
    }

    throw new Error(`Unrecognized contract format in ${contractName}`);
  }

  extractConsumerProvider(contractData, contractName) {
    // Extract consumer and provider from Pact contracts
    if (contractData.consumer && contractData.provider) {
      return {
        consumer: contractData.consumer.name,
        provider: contractData.provider.name,
      };
    }

    // Extract from OpenAPI contracts
    if (contractData.info && contractData.info.title) {
      const title = contractData.info.title.toLowerCase();

      // Heuristic extraction from contract name and title
      if (contractName.includes('auth')) {
        return {
          consumer: 'pems-frontend',
          provider: 'pems-auth-service',
        };
      } else if (contractName.includes('user')) {
        return {
          consumer: 'pems-frontend',
          provider: 'pems-user-service',
        };
      } else if (contractName.includes('tenant')) {
        return {
          consumer: 'pems-frontend',
          provider: 'pems-tenant-service',
        };
      }

      // Default extraction
      return {
        consumer: 'pems-consumer',
        provider: 'pems-provider',
      };
    }

    throw new Error(`Cannot determine consumer/provider for ${contractName}`);
  }

  async publishToPactBroker(contractData, consumer, provider) {
    const pactCommand = [
      'pact-broker',
      'publish',
      this.contractsPath,
      '--consumer-app-version', this.config.consumerVersion,
      '--branch', this.config.gitBranch,
      '--broker-base-url', this.config.pactBrokerUrl,
    ];

    if (this.config.pactBrokerToken) {
      pactCommand.push('--broker-token', this.config.pactBrokerToken);
    }

    if (this.config.buildUrl) {
      pactCommand.push('--build-url', this.config.buildUrl);
    }

    // Add Git commit SHA if available
    if (this.config.gitCommit && this.config.gitCommit !== 'unknown') {
      pactCommand.push('--tag', `git-commit-${this.config.gitCommit.substring(0, 7)}`);
    }

    return new Promise((resolve, reject) => {
      const child = spawn('npx', pactCommand, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.join(__dirname, '..'),
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, stdout, stderr });
        } else {
          reject(new Error(`Pact publish failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to execute pact publish command: ${error.message}`));
      });
    });
  }

  async generatePublishingReport() {
    const report = {
      timestamp: new Date().toISOString(),
      config: this.config,
      summary: {
        total: this.publishedContracts.length + this.failedContracts.length,
        published: this.publishedContracts.length,
        failed: this.failedContracts.length,
      },
      publishedContracts: this.publishedContracts,
      failedContracts: this.failedContracts,
    };

    // Save report to file
    const reportPath = path.join(__dirname, '../test-results/contract-publish-report.json');

    try {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📊 Publishing report saved to: ${reportPath}`);
    } catch (error) {
      console.warn('⚠️ Could not save publishing report:', error.message);
    }

    // Print summary to console
    console.log('');
    console.log('📊 Contract Publishing Summary:');
    console.log(`   Total contracts: ${report.summary.total}`);
    console.log(`   Published: ${report.summary.published}`);
    console.log(`   Failed: ${report.summary.failed}`);

    if (this.failedContracts.length > 0) {
      console.log('');
      console.log('❌ Failed Contracts:');
      this.failedContracts.forEach(contract => {
        console.log(`   - ${contract.name}: ${contract.error}`);
      });
    }
  }

  async updateBuildStatus() {
    if (!process.env.GITHUB_ACTIONS) {
      return; // Only update build status in GitHub Actions
    }

    try {
      const status = this.failedContracts.length === 0 ? 'success' : 'failure';

      // This would typically use GitHub API to update commit status
      // For now, we'll just log it
      console.log(`🔗 Build status: ${status}`);
      console.log(`🔗 Build URL: ${this.config.buildUrl}`);
    } catch (error) {
      console.warn('⚠️ Could not update build status:', error.message);
    }
  }

  async tagContracts(tags = []) {
    console.log('🏷️ Tagging published contracts...');

    for (const contract of this.publishedContracts) {
      for (const tag of tags) {
        try {
          await this.tagContract(contract.consumer, contract.provider, tag);
          console.log(`🏷️ Tagged ${contract.name} with: ${tag}`);
        } catch (error) {
          console.warn(`⚠️ Failed to tag ${contract.name} with ${tag}:`, error.message);
        }
      }
    }
  }

  async tagContract(consumer, provider, tag) {
    const pactCommand = [
      'pact-broker',
      'create-version-tag',
      '--pacticipant', consumer,
      '--version', this.config.consumerVersion,
      '--tag', tag,
      '--broker-base-url', this.config.pactBrokerUrl,
    ];

    if (this.config.pactBrokerToken) {
      pactCommand.push('--broker-token', this.config.pactBrokerToken);
    }

    return new Promise((resolve, reject) => {
      const child = spawn('npx', pactCommand, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Tagging failed with code ${code}`));
        }
      });

      child.on('error', reject);
    });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'publish';

  const publisher = new ContractPublisher();

  switch (command) {
    case 'publish':
      await publisher.publishAllContracts();
      break;

    case 'tag':
      const tags = args.slice(1);
      if (tags.length === 0) {
        console.error('❌ Please provide tags to apply');
        process.exit(1);
      }
      await publisher.tagContracts(tags);
      break;

    case 'help':
      console.log(`
Contract Publishing Script

Usage:
  node scripts/contract-publish.js [command] [options]

Commands:
  publish    Publish all contracts to Pact broker (default)
  tag <tags> Apply tags to published contracts
  help       Show this help message

Environment Variables:
  PACT_BROKER_URL      URL of the Pact broker
  PACT_BROKER_TOKEN    Authentication token for Pact broker
  CONSUMER_VERSION     Version of the consumer application
  GITHUB_REF_NAME      Git branch name
  GITHUB_SHA           Git commit SHA
  CI_BUILD_URL         Build URL for CI integration
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

module.exports = ContractPublisher;