#!/usr/bin/env node

/**
 * CLI Script to Run User Migration
 *
 * Usage: npx ts-node migrate-users.ts [--dry-run] [--force]
 */

import { userMigrationService } from './user-migration.service'

interface CliOptions {
  dryRun?: boolean
  force?: boolean
  help?: boolean
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const options: CliOptions = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--dry-run':
        options.dryRun = true
        break
      case '--force':
        options.force = true
        break
      case '--help':
      case '-h':
        options.help = true
        break
      default:
        console.error(`Unknown option: ${arg}`)
        process.exit(1)
    }
  }

  return options
}

function showHelp(): void {
  console.log(`
User Migration CLI

Migrates existing users from the old User table to BetterAuth format.

Usage:
  npx ts-node migrate-users.ts [options]

Options:
  --dry-run    Show what would be migrated without actually doing it
  --force      Skip confirmation prompts
  --help, -h   Show this help message

Examples:
  npx ts-node migrate-users.ts --dry-run
  npx ts-node migrate-users.ts
  npx ts-node migrate-users.ts --force
`)
}

async function main(): Promise<void> {
  const options = parseArgs()

  if (options.help) {
    showHelp()
    return
  }

  console.log('🔄 PEMS User Migration to BetterAuth')
  console.log('====================================\n')

  try {
    // Step 1: Validate migration
    console.log('📋 Validating migration prerequisites...')
    const validation = await userMigrationService.validateMigration()

    if (!validation.canProceed) {
      console.error('❌ Migration validation failed:')
      validation.issues.forEach(issue => console.error(`  - ${issue}`))
      process.exit(1)
    }
    console.log('✅ Migration validation passed\n')

    // Step 2: Show migration plan
    console.log('📊 Analyzing existing users...')
    const existingUsers = await userMigrationService.getExistingUsers()
    console.log(`Found ${existingUsers.length} users to migrate`)

    const emailUsers = existingUsers.filter(u =>
      u.authProviders.some(p => p.provider === 'email' && p.passwordHash)
    )
    const oauthUsers = existingUsers.filter(u =>
      u.authProviders.some(p => p.provider !== 'email')
    )
    const mfaUsers = existingUsers.filter(u =>
      u.authProviders.some(p => p.mfaEnabled)
    )

    console.log(`  - Email/password users: ${emailUsers.length}`)
    console.log(`  - OAuth users: ${oauthUsers.length}`)
    console.log(`  - MFA enabled users: ${mfaUsers.length}`)

    if (options.dryRun) {
      console.log('\n🔍 Dry run mode - no actual migration will be performed')
      console.log('Migration plan validated successfully!')
      return
    }

    // Step 3: Confirm migration
    if (!options.force) {
      console.log('\n⚠️  This will migrate existing users to BetterAuth format.')
      console.log('   Make sure you have a database backup before proceeding.')
      console.log('\nDo you want to continue? (y/N)')

      const response = await new Promise<string>((resolve) => {
        process.stdin.once('data', (data) => resolve(data.toString().trim().toLowerCase()))
      })

      if (response !== 'y' && response !== 'yes') {
        console.log('❌ Migration cancelled by user')
        return
      }
    }

    // Step 4: Run migration
    console.log('\n🚀 Starting user migration...')
    console.log('This may take a while depending on the number of users...\n')

    const migrationResult = await userMigrationService.migrateAllUsers()

    if (migrationResult.success) {
      console.log(`✅ Migration completed successfully!`)
      console.log(`   Migrated users: ${migrationResult.migratedUsers}`)

      if (migrationResult.warnings.length > 0) {
        console.log('\n⚠️  Warnings:')
        migrationResult.warnings.forEach(warning => console.log(`   - ${warning}`))
      }
    } else {
      console.error('❌ Migration failed:')
      migrationResult.errors.forEach(error => console.error(`   - ${error}`))
      process.exit(1)
    }

    // Step 5: Verify migration
    console.log('\n🔍 Verifying migration integrity...')
    const verification = await userMigrationService.verifyMigration()

    if (verification.success) {
      console.log('✅ Migration verification passed!')
    } else {
      console.error('❌ Migration verification failed:')
      verification.issues.forEach(issue => console.error(`   - ${issue}`))
      console.error('\nPlease review the migration and resolve these issues.')
      process.exit(1)
    }

    console.log('\n🎉 User migration to BetterAuth completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Test authentication with a few migrated accounts')
    console.log('2. Update the application to use BetterAuth endpoints')
    console.log('3. Run the cleanup migration to remove old tables when ready')

  } catch (error) {
    console.error('\n❌ Unexpected error during migration:')
    console.error(error instanceof Error ? error.message : 'Unknown error')
    console.error('\nPlease check the logs and ensure the database is accessible.')
    process.exit(1)
  }
}

// Run the migration
if (require.main === module) {
  main().catch((error) => {
    console.error('Migration script failed:', error)
    process.exit(1)
  })
}

export { main as migrateUsers }