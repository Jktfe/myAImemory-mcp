#!/usr/bin/env node

/**
 * test-memory-cache.js
 * 
 * A script to demonstrate the enhanced myAI Memory caching
 * with permanent caching for memory-related queries.
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
 * Main function to demonstrate memory-specific caching
 */
async function testMemoryCache() {
  try {
    console.log('Testing memory-specific caching features...');
    
    // Read the current master template
    const masterContent = await fs.readFile(MASTER_TEMPLATE_PATH, 'utf-8');
    console.log(`Read master template (${masterContent.length} bytes)`);
    
    // Example 1: A query specifically about memory content
    console.log('\n1️⃣ MEMORY QUERY TEST');
    console.log('-------------------');
    const memoryQuery = "Based on my myAI Memory, what are my coding preferences?";
    
    const memorySystemPrompt = `You are an assistant that helps users retrieve information from their myAI Memory.
When the user asks about information in their memory, find and provide the relevant details.
Only include information that's explicitly in their memory, don't make assumptions.`;

    console.log('Making a memory-related query...');
    console.time('Memory query');
    
    const memoryResponse = await anthropicService.sendMessage([
      { role: 'system', content: memorySystemPrompt },
      { role: 'user', content: `Here is my myAI Memory:\n\n${masterContent}\n\n${memoryQuery}` }
    ]);
    
    console.timeEnd('Memory query');
    
    if (memoryResponse.success) {
      console.log('\n✅ Response for memory query:');
      console.log('-----------------------------------------');
      const memoryContent = memoryResponse.content.map(c => c.text).join('');
      console.log(memoryContent);
      console.log('-----------------------------------------');
      console.log(`Response cached: ${memoryResponse.fromCache ? 'Yes' : 'No'}`);
      
      // Make the same memory query again
      console.log('\nMaking the same memory query again (should use cache)...');
      console.time('Repeat memory query');
      
      const repeatMemoryResponse = await anthropicService.sendMessage([
        { role: 'system', content: memorySystemPrompt },
        { role: 'user', content: `Here is my myAI Memory:\n\n${masterContent}\n\n${memoryQuery}` }
      ]);
      
      console.timeEnd('Repeat memory query');
      
      if (repeatMemoryResponse.success) {
        console.log(`Response cached: ${repeatMemoryResponse.fromCache ? 'Yes ⚡' : 'No'}`);
      }
      
      // Example 2: A non-memory query
      console.log('\n2️⃣ NON-MEMORY QUERY TEST');
      console.log('------------------------');
      const regularQuery = "What is the capital of France?";
      
      console.log('Making a regular (non-memory) query...');
      console.time('Regular query');
      
      const regularResponse = await anthropicService.askQuestion(regularQuery);
      
      console.timeEnd('Regular query');
      
      if (regularResponse.success) {
        console.log(`Response cached: ${regularResponse.fromCache ? 'Yes' : 'No'}`);
        
        // Make the same regular query again
        console.log('\nMaking the same regular query again (should use cache)...');
        console.time('Repeat regular query');
        
        const repeatRegularResponse = await anthropicService.askQuestion(regularQuery);
        
        console.timeEnd('Repeat regular query');
        
        if (repeatRegularResponse.success) {
          console.log(`Response cached: ${repeatRegularResponse.fromCache ? 'Yes ⚡' : 'No'}`);
          
          // Summary of cache differences
          console.log('\n📊 CACHE COMPARISON');
          console.log('------------------');
          console.log('1. Memory queries:');
          console.log('   - Detected by keywords related to memory content');
          console.log('   - Cache keys prefixed with "memory_"');
          console.log('   - Cached for 1 year (effectively permanent)');
          console.log('   - Ideal for personal preferences, profile info, etc.');
          console.log('\n2. Regular queries:');
          console.log('   - Any other type of query');
          console.log('   - Standard cache keys');
          console.log('   - Cached for the configured TTL (1 year by default)');
          console.log('   - Good for factual information that rarely changes');
          
          console.log('\nBoth types benefit from significant performance improvements!');
        }
      }
    } else {
      console.error(`❌ Error: ${memoryResponse.error}`);
    }
  } catch (error) {
    console.error('Error testing memory cache:', error);
  }
}

// Run the test
testMemoryCache().catch(err => {
  console.error('Failed to run memory cache test:', err);
});