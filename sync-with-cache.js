#!/usr/bin/env node

/**
 * sync-with-cache.js
 * 
 * A script to demonstrate applying changes to the master template
 * using the Anthropic API with prompt caching.
 */

import { anthropicService } from './dist/utils/anthropicService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { config } from './dist/config.js';

// Load environment variables
dotenv.config();

// Get directory name for this file
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path to the master template file
const MASTER_TEMPLATE_PATH = config.paths.masterTemplate;

/**
 * Main function to update master template with Anthropic API
 */
async function updateMasterWithCache() {
  try {
    console.log('Starting master template update with cached prompts...');
    
    // Read the current master template
    const masterContent = await fs.readFile(MASTER_TEMPLATE_PATH, 'utf-8');
    console.log(`Read master template (${masterContent.length} bytes)`);
    
    // Example: Ask Claude to suggest additions to your master template
    const updateRequest = "Please review my myAI Memory template. Are there any important sections I should add for personal organization or preferences? Suggest 1-2 new sections with example content.";
    
    const systemPrompt = `You are an AI memory specialist. You will review the current myAI Memory template and suggest improvements.
Analyze the provided template and suggest 1-2 new sections that might be helpful to add.
Respond in proper Markdown format that matches the existing style.
Only include new suggested sections, not the entire template.`;

    console.log('Asking Claude for suggestions...');
    console.time('Claude suggestion request');
    
    // First API call (will be cached for future identical requests)
    const response = await anthropicService.sendMessage([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Here is my current myAI Memory template:\n\n${masterContent}\n\n${updateRequest}` }
    ]);
    
    console.timeEnd('Claude suggestion request');
    
    if (response.success) {
      console.log('\n✅ Received suggestion from Claude:');
      console.log('-----------------------------------------');
      const suggestion = response.content.map(c => c.text).join('');
      console.log(suggestion);
      console.log('-----------------------------------------');
      console.log(`Response was cached: ${response.fromCache ? 'Yes ⚡' : 'No'}`);
      
      // Now simulate a repeat request (which should use cache)
      console.log('\nMaking the same request again (should use cache)...');
      console.time('Repeat request');
      
      const repeatResponse = await anthropicService.sendMessage([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here is my current myAI Memory template:\n\n${masterContent}\n\n${updateRequest}` }
      ]);
      
      console.timeEnd('Repeat request');
      
      if (repeatResponse.success) {
        console.log(`Response was cached: ${repeatResponse.fromCache ? 'Yes ⚡' : 'No'}`);
        
        if (repeatResponse.fromCache) {
          console.log('\n⚡ Performance impact:');
          console.log('- First request went to API server');
          console.log('- Repeat request used local cache');
          console.log('- Significant reduction in response time');
          console.log('- Consistent results across identical requests');
        }
        
        // Option to apply changes
        console.log('\nTo apply these changes to your master template:');
        console.log('1. Review the suggestions');
        console.log('2. Manually edit your myAI Master.md file');
        console.log('3. Run ./sync-memory.cjs to sync changes to all CLAUDE.md files');
      }
    } else {
      console.error(`❌ Error: ${response.error}`);
    }
  } catch (error) {
    console.error('Error updating master with cache:', error);
  }
}

// Run the update process
updateMasterWithCache().catch(err => {
  console.error('Failed to update master with cache:', err);
});