#!/usr/bin/env node

import { processMemoryQuery, updateCacheAfterSync, clearMemoryCache } from '../dist/utils/memoryCacheService.js';
import { templateService } from '../dist/services/templateService.js';
import { platformService } from '../dist/services/platformService.js';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config();

// Check and set environment if needed
function setupEnvironment() {
  if (process.env.ENABLE_ANTHROPIC !== 'true') {
    console.log('⚙️ Enabling Anthropic API for this example...');
    process.env.ENABLE_ANTHROPIC = 'true';
  }
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY is not set in your environment');
    console.error('Please set your API key to run this demo:');
    console.error('export ANTHROPIC_API_KEY="your-api-key-here"');
    process.exit(1);
  }
}

// Interactive CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ask a question
function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function demonstrateMemoryInteraction() {
  try {
    setupEnvironment();
    
    console.log('📝 myAI Memory Demo - "use myAI memory" with Caching');
    console.log('===================================================');
    
    // Initialize services
    await templateService.initialize();
    await platformService.initialize();
    
    // Pre-cache all template content before user interaction
    console.log('\n⚙️ Pre-caching template and sections...');
    await updateCacheAfterSync();
    console.log('✅ Cache initialized! Template and sections are ready for fast access');
    
    console.log('\nDemo: This showcases how "use myAI memory" loads the full template');
    console.log('and caches sections for fast retrieval during Claude conversations.\n');
    
    // Interactive loop
    let running = true;
    while (running) {
      console.log('\n📋 Options:');
      console.log('1) Ask about your memory (simulates "use myAI Memory to...")');
      console.log('2) Update template and sync to platforms');
      console.log('3) Clear cache');
      console.log('4) Exit');
      
      const choice = await askQuestion('\nEnter option (1-4): ');
      
      switch (choice) {
        case '1':
          // Get user query
          const query = await askQuestion('\n🔍 Enter your memory query (e.g., "tell me about my education"): ');
          console.log('\n🔄 Processing query with cached memory...');
          
          console.time('Query processing');
          const response = await processMemoryQuery(query);
          console.timeEnd('Query processing');
          
          if (response.success) {
            console.log('\n✅ Claude\'s response:');
            console.log('------------------------------------------');
            console.log(response.content.map(c => c.text).join(''));
            console.log('------------------------------------------');
            console.log(`From cache: ${response.fromCache ? 'Yes' : 'No'}`);
          } else {
            console.error(`❌ Error: ${response.error}`);
          }
          break;
          
        case '2':
          // Simulate updating template and syncing
          console.log('\n⚙️ Updating template and syncing to platforms...');
          
          // Add some new data to the template (this is just for demo purposes)
          const sectionTitle = await askQuestion('Enter section name to update: ');
          const keyName = await askQuestion('Enter key name: ');
          const keyValue = await askQuestion('Enter value: ');
          
          try {
            // Update section
            const updateResult = await templateService.updateSectionItem(sectionTitle, keyName, keyValue);
            if (updateResult) {
              console.log(`✅ Updated ${sectionTitle} section with ${keyName}: ${keyValue}`);
              
              // Sync to platforms
              console.log('🔄 Syncing to platforms...');
              const syncResults = await platformService.syncAll();
              
              console.log('📊 Sync results:');
              for (const result of syncResults) {
                console.log(`- ${result.platform}: ${result.success ? '✅' : '❌'} ${result.message}`);
              }
              
              // Update cache after sync
              console.log('🔄 Updating cache after sync...');
              await updateCacheAfterSync();
              console.log('✅ Cache updated with new template content');
            } else {
              console.error('❌ Failed to update section');
            }
          } catch (error) {
            console.error('❌ Error updating template:', error);
          }
          break;
          
        case '3':
          // Clear cache
          console.log('\n🔄 Clearing memory cache...');
          clearMemoryCache();
          console.log('✅ Cache cleared');
          break;
          
        case '4':
          console.log('\n👋 Exiting demo');
          running = false;
          break;
          
        default:
          console.log('\n❌ Invalid option, please try again');
      }
    }
    
    rl.close();
  } catch (error) {
    console.error('❌ Error:', error);
    rl.close();
    process.exit(1);
  }
}

// Run the demo
demonstrateMemoryInteraction().then(() => process.exit(0));