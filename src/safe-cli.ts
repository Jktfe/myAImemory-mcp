#!/usr/bin/env node

/**
 * Safe CLI for myAI Memory Sync
 * Provides direct command-line access to sync operations that are restricted in the MCP
 */

import { program } from 'commander';
import { SafeSyncManager } from './safeSyncManager.js';
import chalk from 'chalk';

const safeSyncManager = new SafeSyncManager();

// Set up command line program
program
  .name('myAI Memory CLI')
  .description('Command line interface for myAI Memory Sync operations')
  .version('1.0.0');

// Sync command
program
  .command('sync')
  .description('Sync myAI Memory to all supported platforms')
  .action(async () => {
    console.log(chalk.blue('📡 Syncing myAI Memory to all platforms...'));
    
    try {
      const results = await safeSyncManager.syncToPlatforms();
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      console.log(chalk.green(`✅ Synced to ${successCount}/${totalCount} platforms`));
      
      // Show detailed results
      for (const result of results) {
        const statusColor = result.success ? chalk.green : chalk.red;
        const statusIcon = result.success ? '✅' : '❌';
        console.log(statusColor(`${statusIcon} ${result.platform}: ${result.message}`));
      }
    } catch (err: any) {
      console.error(chalk.red(`❌ Error syncing: ${err.message}`));
      process.exit(1);
    }
  });

// Backup command
program
  .command('backup')
  .description('Create a backup of the master file')
  .action(async () => {
    console.log(chalk.blue('📦 Creating backup of myAI Master file...'));
    
    try {
      // Read the file first to make sure it exists
      const content = await safeSyncManager.readMasterFile();
      if (!content) {
        console.error(chalk.red('❌ Master file is empty or not found'));
        process.exit(1);
      }
      
      const backupPath = await safeSyncManager.createBackup();
      if (backupPath) {
        console.log(chalk.green(`✅ Backup created successfully: ${backupPath}`));
      } else {
        console.error(chalk.red('❌ Failed to create backup'));
        process.exit(1);
      }
    } catch (err: any) {
      console.error(chalk.red(`❌ Error creating backup: ${err.message}`));
      process.exit(1);
    }
  });

// List backups command
program
  .command('list-backups')
  .description('List all available backups')
  .action(async () => {
    console.log(chalk.blue('📋 Listing available backups...'));
    
    try {
      const backups = await safeSyncManager.listBackups();
      
      if (backups.length === 0) {
        console.log(chalk.yellow('No backups found'));
      } else {
        console.log(chalk.green(`Found ${backups.length} backups:`));
        
        // Display backups with timestamps
        backups.forEach((backup, index) => {
          // Extract timestamp from backup filename
          const match = backup.match(/myAI-Master-(.+)\.md/);
          const timestamp = match ? match[1].replace(/-/g, ':').replace('T', ' ') : 'Unknown';
          console.log(`${index + 1}. ${backup} (${timestamp})`);
        });
      }
    } catch (err: any) {
      console.error(chalk.red(`❌ Error listing backups: ${err.message}`));
      process.exit(1);
    }
  });

// Restore from backup command
program
  .command('restore')
  .description('Restore from a specific backup')
  .argument('<backup-name>', 'Name of the backup file to restore from')
  .action(async (backupName) => {
    console.log(chalk.blue(`🔄 Restoring from backup: ${backupName}...`));
    
    try {
      const success = await safeSyncManager.restoreFromBackup(backupName);
      
      if (success) {
        console.log(chalk.green('✅ Restoration completed successfully'));
      } else {
        console.error(chalk.red('❌ Failed to restore from backup'));
        process.exit(1);
      }
    } catch (err: any) {
      console.error(chalk.red(`❌ Error restoring from backup: ${err.message}`));
      process.exit(1);
    }
  });

// Test command to validate backup file structure
program
  .command('test')
  .description('Test backup system without making any changes')
  .action(async () => {
    console.log(chalk.blue('🧪 Testing backup system...'));
    
    try {
      // Check if master file exists
      const content = await safeSyncManager.readMasterFile();
      if (!content) {
        console.error(chalk.red('❌ Master file is empty or not found'));
        process.exit(1);
      }
      
      console.log(chalk.green('✅ Master file exists and is readable'));
      
      // Check if backup directory exists or can be created
      const testBackup = await safeSyncManager.createBackup();
      if (testBackup) {
        console.log(chalk.green(`✅ Backup system working correctly, created test backup: ${testBackup}`));
      } else {
        console.error(chalk.red('❌ Failed to create test backup'));
        process.exit(1);
      }
      
      console.log(chalk.green('✅ All tests passed'));
    } catch (err: any) {
      console.error(chalk.red(`❌ Test failed: ${err.message}`));
      process.exit(1);
    }
  });

// Fix permissions command
program
  .command('fix-permissions')
  .description('Fix permissions for all relevant files')
  .action(async () => {
    console.log(chalk.blue('🔧 Fixing permissions...'));
    
    // This is just a stub - you may want to implement proper permission fixing
    console.log(chalk.yellow('This feature is not yet implemented'));
  });

// Parse command line arguments
program.parse();

// If no arguments, show help
if (process.argv.length <= 2) {
  program.help();
}
