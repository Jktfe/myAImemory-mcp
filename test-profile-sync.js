#!/usr/bin/env node

import { PlatformSyncManager, ClaudeWebSyncer } from './dist/platformSync.js';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  try {
    console.log('Testing Claude.ai profile sync...');
    
    // Create a test template content or load from your template file
    // This is just a sample, replace with your actual template content location
    const templatePath = path.join(process.cwd(), 'data', 'template.md');
    console.log(`Loading template from ${templatePath}`);
    
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    console.log('Template loaded successfully');
    
    // Initialize sync manager
    const syncManager = new PlatformSyncManager();
    
    // Use the ClaudeWebSyncer specifically for testing
    const claudeWebSyncer = new ClaudeWebSyncer();
    syncManager.setSyncer('claude-web', claudeWebSyncer);
    
    // Sync with Claude.ai profile settings
    console.log('Starting sync with Claude.ai profile settings...');
    const result = await syncManager.syncPlatform('claude-web', templateContent);
    
    console.log('Sync result:', result);
    
    if (result.success) {
      console.log('✅ Sync completed successfully!');
    } else {
      console.error('❌ Sync failed:', result.message);
    }
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

main().catch(console.error);
