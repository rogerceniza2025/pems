import { FullConfig } from '@playwright/test';

/**
 * Global Teardown for Visual Testing
 *
 * This cleanup function runs after all visual tests and handles
 * cleanup of the testing environment.
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up visual testing environment...');

  // Generate visual testing report
  await generateVisualTestReport();

  // Clean up temporary files
  await cleanupTemporaryFiles();

  // Summary of visual testing session
  printVisualTestSummary();

  console.log('✅ Visual testing environment cleanup complete');
}

/**
 * Generate a comprehensive visual testing report
 */
async function generateVisualTestReport() {
  console.log('📊 Generating visual testing report...');

  const fs = require('fs');
  const path = require('path');

  try {
    // Collect test results
    const testResultsPath = path.join(process.cwd(), 'test-results/visual-results.json');
    let testResults = {};

    if (fs.existsSync(testResultsPath)) {
      const resultsContent = fs.readFileSync(testResultsPath, 'utf8');
      testResults = JSON.parse(resultsContent);
    }

    // Generate report data
    const reportData = {
      timestamp: new Date().toISOString(),
      environment: {
        ci: !!process.env.CI,
        percyEnabled: !!process.env.PERCY_TOKEN,
        baseUrl: process.env.TEST_BASE_URL,
        storybookUrl: process.env.STORYBOOK_URL,
      },
      summary: {
        totalTests: Object.keys(testResults).length,
        passedTests: Object.values(testResults).filter((result: any) => result.status === 'passed').length,
        failedTests: Object.values(testResults).filter((result: any) => result.status === 'failed').length,
        skippedTests: Object.values(testResults).filter((result: any) => result.status === 'skipped').length,
      },
      testSuites: {
        crossBrowser: 'tests/visual/percy/cross-browser.test.ts',
        responsive: 'tests/visual/responsive/responsive-design.test.ts',
        themes: 'tests/visual/themes/theme-consistency.test.ts',
        storybook: 'tests/visual/storybook/',
        criticalJourneys: 'tests/visual/percy/critical-journeys.test.ts',
      },
      screenshots: {
        captured: countScreenshots('test-results/screenshots'),
        percyUploaded: process.env.PERCY_TOKEN ? 'Uploaded to Percy' : 'Local only',
      },
      recommendations: generateRecommendations(testResults),
    };

    // Write report to file
    const reportPath = path.join(process.cwd(), 'visual-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

    console.log(`✅ Visual test report generated: ${reportPath}`);
    console.log(`📈 Summary: ${reportData.summary.passedTests}/${reportData.summary.totalTests} tests passed`);

  } catch (error) {
    console.warn('⚠️ Could not generate visual test report:', error.message);
  }
}

/**
 * Count screenshots in a directory
 */
function countScreenshots(directory: string): number {
  const fs = require('fs');
  const path = require('path');

  try {
    if (fs.existsSync(directory)) {
      const files = fs.readdirSync(directory);
      return files.filter((file: string) => file.endsWith('.png')).length;
    }
  } catch (error) {
    // Ignore errors
  }

  return 0;
}

/**
 * Generate recommendations based on test results
 */
function generateRecommendations(testResults: any): string[] {
  const recommendations: string[] = [];

  // Analyze test results and provide recommendations
  const failedTests = Object.values(testResults).filter((result: any) => result.status === 'failed');
  const totalTests = Object.keys(testResults).length;

  if (failedTests.length > 0) {
    recommendations.push(`${failedTests.length} visual tests failed - review and fix UI inconsistencies`);
  }

  if (totalTests === 0) {
    recommendations.push('No visual tests were executed - check test configuration');
  }

  if (!process.env.PERCY_TOKEN) {
    recommendations.push('Set up PERCY_TOKEN for automated visual regression testing in CI/CD');
  }

  const successRate = totalTests > 0 ? ((totalTests - failedTests.length) / totalTests * 100) : 0;
  if (successRate < 95) {
    recommendations.push('Visual test success rate is below 95% - consider reviewing test stability');
  }

  return recommendations;
}

/**
 * Clean up temporary files created during testing
 */
async function cleanupTemporaryFiles() {
  console.log('🗑️ Cleaning up temporary files...');

  const fs = require('fs');
  const path = require('path');

  // Temporary directories and files to clean up
  const cleanupPaths = [
    'temp-visual-data',
    'test-results/temp',
    '.visual-cache',
  ];

  for (const cleanupPath of cleanupPaths) {
    const fullPath = path.join(process.cwd(), cleanupPath);
    try {
      if (fs.existsSync(fullPath)) {
        if (fs.statSync(fullPath).isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fullPath);
        }
        console.log(`🗑️ Cleaned up: ${cleanupPath}`);
      }
    } catch (error) {
      console.warn(`⚠️ Could not clean up ${cleanupPath}:`, error.message);
    }
  }
}

/**
 * Print a summary of the visual testing session
 */
function printVisualTestSummary() {
  console.log('\n📋 Visual Testing Session Summary');
  console.log('=' .repeat(40));

  // Environment info
  console.log(`🌐 Environment: ${process.env.CI ? 'CI/CD' : 'Local'}`);
  console.log(`🔧 Percy: ${process.env.PERCY_TOKEN ? 'Enabled' : 'Disabled'}`);
  console.log(`📱 Base URL: ${process.env.TEST_BASE_URL || 'http://localhost:3000'}`);

  // Test coverage
  console.log('\n📊 Test Coverage:');
  console.log('   ✅ Cross-browser compatibility');
  console.log('   ✅ Responsive design');
  console.log('   ✅ Theme consistency');
  console.log('   ✅ Component isolation (Storybook)');
  console.log('   ✅ Critical user journeys');

  // Recommendations
  console.log('\n💡 Recommendations:');
  console.log('   • Review visual test failures in the Percy dashboard');
  console.log('   • Update baseline snapshots when UI changes are intentional');
  console.log('   • Consider adding more edge case scenarios');
  console.log('   • Monitor performance impact of visual tests');

  console.log('\n🎨 Visual testing is complete!');
  console.log('   Check visual-test-report.json for detailed results.');
}

export default globalTeardown;