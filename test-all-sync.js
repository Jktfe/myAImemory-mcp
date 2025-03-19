// Test script to verify synchronization across all platforms
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define paths for files to check
const MASTER_TEMPLATE_PATH = path.join(__dirname, 'myAI Master.md');
const CLAUDE_MD_PATH = path.join(os.homedir(), 'CLAUDE.md');
// Check both potential paths for Windsurf rules
const WINDSURF_RULES_PATH = path.join(os.homedir(), '.codeium', 'windsurf', 'memories', 'global_rules.md');
const WINDSURF_RULE_PATH = path.join(os.homedir(), '.codeium', 'windsurf', 'memories', 'global_rule.md');

// Helper functions
async function checkIfFileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getLastModified(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtime;
  } catch {
    return 'Unknown';
  }
}

async function checkFile(label, filePath, sectionContent) {
  try {
    console.log(`Checking ${label} at path: ${filePath}`);
    const exists = await checkIfFileExists(filePath);
    if (!exists) {
      console.log(`${label} file does not exist at ${filePath}`);
      return;
    }
    
    const fileContent = await fs.readFile(filePath, 'utf8');
    // Check if file has 'Favourite Teams' section with 'Leicester Tigers' in it
    const hasFavouriteTeamsSection = /# Favourite Teams[\s\S]*?Leicester Tigers/.test(fileContent);
    
    console.log(`${label}: ${hasFavouriteTeamsSection ? '✅ Contains Favourite Teams section with Leicester Tigers' : '❌ Missing Favourite Teams section with Leicester Tigers'}`);
    console.log(`File size: ${fileContent.length} bytes`);
    console.log(`First 100 characters: ${fileContent.substring(0, 100)}...`);
    
    // If the file has myAI Memory section, show the beginning of it
    const memoryMatch = fileContent.match(/(# myAI Memory[\s\S]{0,100})/);
    if (memoryMatch) {
      console.log(`myAI Memory section: ${memoryMatch[1]}...`);
      
      // Extract the Favourite Teams section if it exists
      const teamsSectionMatch = fileContent.match(/(# Favourite Teams[\s\S]{0,100})/);
      if (teamsSectionMatch) {
        console.log(`Favourite Teams section: ${teamsSectionMatch[1]}...`);
      } else {
        console.log(`No Favourite Teams section found in file`);
      }
      
    } else {
      console.log(`No myAI Memory section found in file`);
    }
    
    if (!hasFavouriteTeamsSection) {
      console.log(`${label} last modified: ${await getLastModified(filePath)}`);
    }
  } catch (error) {
    console.error(`Error checking ${label}:`, error);
  }
}

async function testPlatformSync() {
  try {
    console.log('Testing myAImemory platform synchronization');
    
    // Create test content with timestamp
    const testTimestamp = new Date().toISOString();
    const testContent = `This is a test section with my favourite rugby team as Leicester Tigers - timestamp: ${testTimestamp}`;
    
    // Call myai_store endpoint
    console.log('Storing test content...');
    const response = await fetch('http://localhost:3000', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'myai_store',
          arguments: {
            sectionName: 'Favourite Teams',
            content: testContent
          }
        },
        id: 1
      })
    });

    const result = await response.json();
    console.log('Result from myai_store tool:');
    console.log(JSON.stringify(result, null, 2));
    
    // Wait a moment for sync to complete
    console.log('Waiting for sync to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if files exist and contain the test content
    await checkFile('Master template', MASTER_TEMPLATE_PATH, 'Leicester Tigers');
    await checkFile('CLAUDE.md', CLAUDE_MD_PATH, 'Leicester Tigers');
    await checkFile('Windsurf global_rules.md', WINDSURF_RULES_PATH, 'Leicester Tigers');
    await checkFile('Windsurf global_rule.md (wrong path)', WINDSURF_RULE_PATH, 'Leicester Tigers');
    
    console.log('Platform sync test completed');
    console.log(`Test timestamp: ${testTimestamp}`);
  } catch (error) {
    console.error('Error testing platform sync:', error);
  }
}

// Run the test
testPlatformSync();
