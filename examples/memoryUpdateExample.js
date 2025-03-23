#!/usr/bin/env node

import { anthropicService } from '../dist/utils/anthropicService.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Ensure environment is properly configured
function setupEnvironment() {
  if (process.env.ENABLE_ANTHROPIC !== 'true') {
    console.log('Enabling Anthropic API integration for this demo...');
    process.env.ENABLE_ANTHROPIC = 'true';
  }
  
  if (process.env.ENABLE_PROMPT_CACHE !== 'true') {
    console.log('Enabling prompt caching for this demo...');
    process.env.ENABLE_PROMPT_CACHE = 'true';
  }
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set in your environment');
    console.error('Please set your API key to run this demo');
    process.exit(1);
  }
}

async function updateMemoryWithCaching() {
  setupEnvironment();
  
  console.log('Example: Adding education information to myAI Memory');
  console.log('===================================================');
  
  // The user's request to update their memory
  const updateRequest = "Add to my AI memory that I studied computer science at State University and information technology at Tech Institute";
  
  // This is the system prompt that instructs Claude on how to process memory updates
  const systemPrompt = `You are a memory processing assistant that handles updates to the user's myAI Memory.
When the user asks to update their memory, extract the key information and format it appropriately.
For education information, place it in the "User Information" section with proper formatting.
Return your response in the format:
{
  "section": "User Information",
  "key": "Education",
  "value": "The formatted education information"
}`;

  console.log('1️⃣ First request - processing memory update...');
  console.time('First request');
  const firstResponse = await anthropicService.sendMessage([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: updateRequest }
  ]);
  console.timeEnd('First request');
  
  if (firstResponse.success) {
    console.log('\n✅ Claude processed your memory update:');
    console.log('-----------------------------------------');
    console.log(firstResponse.content.map(c => c.text).join(''));
    console.log('-----------------------------------------');
    console.log(`Cache used: ${firstResponse.fromCache ? 'Yes' : 'No'}`);
    
    // Now imagine another user makes a similar request
    const similarRequest = "Please update my memory to include that I studied Computer Science at State University and Information Technology at Tech Institute";
    
    console.log('\n2️⃣ Processing a similar memory update request...');
    console.time('Second request (similar)');
    const secondResponse = await anthropicService.sendMessage([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: similarRequest }
    ]);
    console.timeEnd('Second request (similar)');
    
    if (secondResponse.success) {
      console.log('\n✅ Result for the similar request:');
      console.log('-----------------------------------------');
      console.log(secondResponse.content.map(c => c.text).join(''));
      console.log('-----------------------------------------');
      console.log(`Cache used: ${secondResponse.fromCache ? 'Yes' : 'No'}`);
      
      // Now a third identical request (as if the user clicked submit twice by accident)
      console.log('\n3️⃣ Processing an identical memory update (as if submitted twice)...');
      console.time('Third request (identical)');
      const thirdResponse = await anthropicService.sendMessage([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: updateRequest }
      ]);
      console.timeEnd('Third request (identical)');
      
      if (thirdResponse.success) {
        console.log('\n✅ Result for the identical request:');
        console.log('-----------------------------------------');
        console.log(thirdResponse.content.map(c => c.text).join(''));
        console.log('-----------------------------------------');
        console.log(`Cache used: ${thirdResponse.fromCache ? 'Yes' : 'No'}`);
        
        // Show how this would be used in the real application
        console.log('\n🔄 Real-world application flow:');
        console.log('1. User asks to update their memory with education information');
        console.log('2. Request is processed (with optional caching for performance)');
        console.log('3. Claude extracts the structured information');
        console.log('4. The myAI Memory system would update the "User Information" section:');
        console.log('\n```markdown');
        console.log('# User Information');
        console.log('## Use this information if you need to reference them directly');
        console.log('-~- Name: John Doe');
        console.log('-~- Age: 35');
        console.log('-~- Location: New York');
        console.log('-~- Education: BS Computer Science at State University, MS Information Technology at Tech Institute');
        console.log('-~- ...(other existing information)');
        console.log('```');
        
        // Compare performance
        if (thirdResponse.fromCache) {
          console.log('\n⚡ Performance impact:');
          console.log('- First request (API call): took the most time');
          console.log('- Similar request: may or may not use cache depending on similarity threshold');
          console.log('- Identical request: nearly instant response from cache');
          console.log('\nThis means:');
          console.log('- Better user experience (faster responses)');
          console.log('- Reduced API costs (fewer API calls)');
          console.log('- Consistent results for identical inputs');
        }
      }
    }
  } else {
    console.error(`Error: ${firstResponse.error}`);
  }
}

updateMemoryWithCaching().catch(err => {
  console.error('Error:', err);
});