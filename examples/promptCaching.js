#!/usr/bin/env node

import { anthropicService } from '../dist/utils/anthropicService.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Ensure the required environment variables are set for the demo
function setupEnvironmentForDemo() {
  // Check if Anthropic API is enabled
  if (process.env.ENABLE_ANTHROPIC !== 'true') {
    console.log('❗ The Anthropic API integration is not enabled.');
    console.log('For this demo, we will temporarily enable it...');
    process.env.ENABLE_ANTHROPIC = 'true';
  }
  
  // Check if prompt caching is enabled
  if (process.env.ENABLE_PROMPT_CACHE !== 'true') {
    console.log('❗ Prompt caching is not enabled.');
    console.log('For this demo, we will temporarily enable it...');
    process.env.ENABLE_PROMPT_CACHE = 'true';
  }
  
  // Check if API key is set
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY is not set in your environment');
    console.error('Please set your Anthropic API key to run this demo:');
    console.error('export ANTHROPIC_API_KEY="your-api-key-here"');
    process.exit(1);
  }
}

async function testPromptCaching() {
  console.log('📝 Testing prompt caching with Claude API');
  console.log('========================================');
  
  // Setup environment for the demo
  setupEnvironmentForDemo();
  
  // Define a simple question
  const question = 'What is prompt caching and why is it useful?';
  
  // First call - should make an API request
  console.log('\n🔄 Making first request (should hit API)...');
  console.time('First request');
  const firstResponse = await anthropicService.askQuestion(question);
  console.timeEnd('First request');
  
  if (firstResponse.success) {
    console.log('\n✅ First response from Claude:');
    console.log('--------------------------');
    console.log(firstResponse.content.map(c => c.text).join(''));
    console.log('--------------------------');
    console.log(`Model: ${firstResponse.model}, ID: ${firstResponse.id}`);
    console.log(`From cache: ${firstResponse.fromCache ? 'Yes' : 'No'}`);
  } else {
    console.error(`❌ Error: ${firstResponse.error}`);
    process.exit(1);
  }
  
  // Second call with same question - should use the cache
  console.log('\n🔄 Making second request with same question (should use cache)...');
  console.time('Second request (cached)');
  const secondResponse = await anthropicService.askQuestion(question);
  console.timeEnd('Second request (cached)');
  
  if (secondResponse.success) {
    console.log('\n✅ Second response (should be from cache):');
    console.log('--------------------------');
    // Show just a preview of the content to save screen space
    const contentPreview = secondResponse.content.map(c => c.text).join('').substring(0, 100) + '...';
    console.log(contentPreview);
    console.log('--------------------------');
    console.log(`Model: ${secondResponse.model}, ID: ${secondResponse.id}`);
    console.log(`From cache: ${secondResponse.fromCache ? 'Yes' : 'No'}`);
    
    // Verify cache was used
    if (secondResponse.fromCache) {
      console.log('\n✅ CACHE HIT: Second response was retrieved from cache');
      // Show performance improvement
      const firstTime = parseFloat(process.env.FIRST_REQUEST_TIME || '0');
      const secondTime = parseFloat(process.env.SECOND_REQUEST_TIME || '0');
      if (firstTime > 0 && secondTime > 0) {
        const speedup = ((firstTime - secondTime) / firstTime * 100).toFixed(2);
        console.log(`⚡ Performance improvement: ${speedup}% faster`);
      }
    } else {
      console.log('\n❌ CACHE MISS: Got a new response from API');
    }
  } else {
    console.error(`❌ Error: ${secondResponse.error}`);
  }
  
  // Third call with cache disabled - should make a new API request
  console.log('\n🔄 Making third request with cache explicitly disabled...');
  console.time('Third request (cache disabled)');
  const thirdResponse = await anthropicService.askQuestion(question, undefined, { disableCache: true });
  console.timeEnd('Third request (cache disabled)');
  
  if (thirdResponse.success) {
    console.log('\n✅ Third response (cache disabled):');
    console.log('--------------------------');
    // Show just a preview of the content
    const contentPreview = thirdResponse.content.map(c => c.text).join('').substring(0, 100) + '...';
    console.log(contentPreview);
    console.log('--------------------------');
    console.log(`Model: ${thirdResponse.model}, ID: ${thirdResponse.id}`);
    console.log(`From cache: ${thirdResponse.fromCache ? 'Yes' : 'No'}`);
    
    // Verify cache was not used
    if (!thirdResponse.fromCache) {
      console.log('\n✅ Cache correctly disabled for third request');
    } else {
      console.log('\n❌ Something unexpected happened - got cached response despite disabling cache');
    }
  } else {
    console.error(`❌ Error: ${thirdResponse.error}`);
  }
  
  console.log('\n📊 Summary:');
  console.log('========================================');
  console.log('1️⃣ First call: API request (no cache available)');
  console.log(`2️⃣ Second call: ${secondResponse.fromCache ? 'Used cache ✅' : 'Made API request ❌'}`);
  console.log(`3️⃣ Third call: ${!thirdResponse.fromCache ? 'Made API request (cache disabled) ✅' : 'Incorrectly used cache ❌'}`);
  console.log('\n💡 To use this feature in your app, set these environment variables:');
  console.log('   ENABLE_ANTHROPIC=true');
  console.log('   ENABLE_PROMPT_CACHE=true');
  console.log('   ANTHROPIC_API_KEY=your-api-key');
}

// Run the test
testPromptCaching().catch(err => {
  console.error('❌ Error running prompt caching test:', err);
  process.exit(1);
});