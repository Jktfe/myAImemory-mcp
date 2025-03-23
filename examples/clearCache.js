#!/usr/bin/env node

import { clearAllCache } from '../dist/utils/anthropicUtils.js';
import { config } from '../dist/config.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

/**
 * Clear the prompt cache 
 */
async function clearCache() {
  console.log('🧹 Clearing the Anthropic prompt cache...');
  
  try {
    // Get the cache path from config
    const cachePath = config.anthropic.cache.cachePath;
    
    // Check if cache directory exists
    if (fs.existsSync(cachePath)) {
      // Call the cache clearing function
      await clearAllCache();
      
      // Count the number of files removed
      const filesBefore = fs.existsSync(cachePath) ? fs.readdirSync(cachePath).length : 0;
      
      console.log(`✅ Successfully cleared the prompt cache at ${cachePath}`);
      console.log(`🗑️ Removed ${filesBefore} cached responses`);
    } else {
      console.log(`ℹ️ No cache directory found at ${cachePath}`);
      console.log('ℹ️ Cache appears to be empty already');
    }
  } catch (error) {
    console.error(`❌ Error clearing cache: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Run the cache clearing function
clearCache().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});