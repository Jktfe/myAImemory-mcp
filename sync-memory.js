#!/usr/bin/env node

/**
 * This is a standalone script that directly implements the myAI Memory sync functionality
 * It's designed to be run directly and does not rely on the complex MCP or CLI infrastructure
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure paths
const MASTER_PATH = path.join(__dirname, 'myAI Master.md');
const HOME_DIR = os.homedir();
const WINDSURF_PATH = path.join(HOME_DIR, '.codeium', 'windsurf', 'memories', 'global_rules.md');
const CLAUDE_PROJECTS_PATH = path.join(HOME_DIR, 'CascadeProjects');

// Extract myAI Memory section from content
function extractMyAIMemorySection(content) {
  if (content.includes('# myAI Memory')) {
    const startIndex = content.indexOf('# myAI Memory');
    return content.substring(startIndex).trim();
  }
  return '# myAI Memory\n\n';
}

// Update myAI Memory section in a file
async function updateMemorySection(filePath, memorySection) {
  console.log(`Updating ${filePath}...`);
  
  try {
    // Check directory exists and create if needed
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });
    
    // Check if file exists
    let content = '';
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch (err) {
      // File doesn't exist, create it
      console.log(`Creating new file at ${filePath}`);
    }
    
    // Check if it has myAI Memory section
    if (content.includes('# myAI Memory')) {
      // Remove everything from "# myAI Memory" to the end of the file
      content = content.replace(/# myAI Memory[\s\S]*$/, '').trim();
    }
    
    // Append the memory section
    const newContent = content.length > 0 
      ? `${content}\n\n${memorySection}` 
      : memorySection;
    
    // Write the file
    await fs.writeFile(filePath, newContent, 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error updating ${filePath}:`, err.message);
    return false;
  }
}

// Find all CLAUDE.md files in projects
async function findClaudeMdFiles(basePath) {
  console.log(`Searching for CLAUDE.md files in ${basePath}...`);
  
  const claudeFiles = [];
  
  try {
    // List directories in base path
    const entries = await fs.readdir(basePath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const projectPath = path.join(basePath, entry.name);
      const claudePath = path.join(projectPath, 'CLAUDE.md');
      
      try {
        await fs.access(claudePath);
        claudeFiles.push(claudePath);
      } catch (err) {
        // File doesn't exist, that's okay
      }
    }
    
    console.log(`Found ${claudeFiles.length} CLAUDE.md files`);
    return claudeFiles;
  } catch (err) {
    console.error(`Error searching for CLAUDE.md files:`, err.message);
    return [];
  }
}

// Main sync function
async function syncMemory() {
  try {
    console.log('Starting myAI Memory sync...');
    
    // 1. Read the master file
    console.log(`Reading master file from ${MASTER_PATH}...`);
    let masterContent;
    try {
      masterContent = await fs.readFile(MASTER_PATH, 'utf-8');
    } catch (err) {
      console.error(`Error reading master file:`, err.message);
      return {
        success: false,
        message: `Could not read master file: ${err.message}`
      };
    }
    
    // 2. Extract the myAI Memory section
    const memorySection = extractMyAIMemorySection(masterContent);
    if (!memorySection) {
      return {
        success: false,
        message: "Could not find '# myAI Memory' section in the master file"
      };
    }
    console.log(`Extracted myAI Memory section (${memorySection.length} characters)`);
    
    // 3. Find all CLAUDE.md files to update
    const claudeFiles = await findClaudeMdFiles(CLAUDE_PROJECTS_PATH);
    
    // 4. Update all files
    let successCount = 0;
    
    // Update Windsurf memory
    console.log('Updating Windsurf memory...');
    const windsurfSuccess = await updateMemorySection(WINDSURF_PATH, memorySection);
    if (windsurfSuccess) {
      console.log('✅ Successfully updated Windsurf memory');
      successCount++;
    } else {
      console.log('❌ Failed to update Windsurf memory');
    }
    
    // Update CLAUDE.md files
    let claudeSuccessCount = 0;
    for (const claudeFile of claudeFiles) {
      const success = await updateMemorySection(claudeFile, memorySection);
      if (success) {
        claudeSuccessCount++;
      }
    }
    
    console.log(`✅ Successfully updated ${claudeSuccessCount}/${claudeFiles.length} CLAUDE.md files`);
    if (claudeSuccessCount > 0) {
      successCount++;
    }
    
    // Return results
    return {
      success: successCount > 0,
      message: `Successfully synced myAI Memory to ${successCount} platforms. Updated ${claudeSuccessCount} CLAUDE.md files.`
    };
  } catch (err) {
    console.error('Error syncing memory:', err);
    return {
      success: false,
      message: `Error syncing memory: ${err.message}`
    };
  }
}

// Run the sync
syncMemory().then(result => {
  console.log('\n==========================');
  console.log(result.success ? '✅ SYNC SUCCESSFUL' : '❌ SYNC FAILED');
  console.log(result.message);
  console.log('==========================\n');
  
  process.exit(result.success ? 0 : 1);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
