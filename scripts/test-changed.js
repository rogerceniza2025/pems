#!/usr/bin/env node

/* eslint-disable no-console */

import { execSync } from 'child_process'
import path from 'path'

function getChangedTestFiles() {
  try {
    // Get changed files compared to main branch
    const changedFiles = execSync('git diff --name-only main...HEAD', {
      encoding: 'utf8',
      stdio: 'pipe',
    })
      .trim()
      .split('\n')
      .filter(Boolean)

    // Filter for test files
    const testFiles = changedFiles.filter((file) =>
      file.match(/\.(test|spec)\.(js|jsx|ts|tsx)$/),
    )

    // Also find corresponding test files for changed source files
    const sourceFiles = changedFiles.filter(
      (file) =>
        file.match(/\.(js|jsx|ts|tsx)$/) &&
        !file.includes('.test.') &&
        !file.includes('.spec.'),
    )

    for (const sourceFile of sourceFiles) {
      const dir = path.dirname(sourceFile)
      const name = path.basename(sourceFile, path.extname(sourceFile))

      const possibleTestPaths = [
        path.join(dir, `${name}.test.ts`),
        path.join(dir, `${name}.test.tsx`),
        path.join(dir, `${name}.spec.ts`),
        path.join(dir, `${name}.spec.tsx`),
        path.join(dir, '__tests__', `${name}.test.ts`),
        path.join(dir, '__tests__', `${name}.test.tsx`),
        path.join('tests/unit', dir, `${name}.test.ts`),
        path.join('tests/unit', dir, `${name}.test.tsx`),
        path.join('tests/integration', dir, `${name}.test.ts`),
        path.join('tests/integration', dir, `${name}.test.tsx`),
      ]

      for (const testPath of possibleTestPaths) {
        try {
          execSync(`test -f "${testPath}"`, { stdio: 'pipe' })
          if (!testFiles.includes(testPath)) {
            testFiles.push(testPath)
          }
          break
        } catch {
          // File doesn't exist, continue
        }
      }
    }

    return testFiles
  } catch (error) {
    console.error('Error getting changed files:', error.message)
    return []
  }
}

function runTests() {
  const testFiles = getChangedTestFiles()

  if (testFiles.length === 0) {
    console.log('📝 No changed test files found to run.')
    process.exit(0)
  }

  console.log(`🧪 Running tests for ${testFiles.length} changed files:`)
  testFiles.forEach((file) => console.log(`  - ${file}`))
  console.log('')

  try {
    // Run vitest with the specific test files
    const vitestCommand = `vitest run --reporter=verbose ${testFiles.join(' ')}`
    execSync(vitestCommand, {
      stdio: 'inherit',
      encoding: 'utf8',
    })
  } catch {
    console.error('❌ Tests failed')
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
}
