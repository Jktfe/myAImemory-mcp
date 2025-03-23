// Test script to verify CLAUDE.md synchronization
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fsSync from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create a CLAUDE.md file in each subdirectory of CascadeProjects
async function setupTestProjects() {
  try {
    // Get the CascadeProjects directory
    const cascadeProjectsDir = path.join(os.homedir(), 'CascadeProjects');
    console.log(`Setting up CLAUDE.md files in ${cascadeProjectsDir} subdirectories`);
    
    if (!fsSync.existsSync(cascadeProjectsDir)) {
      console.log(`CascadeProjects directory does not exist at ${cascadeProjectsDir}`);
      return;
    }
    
    // Get all subdirectories
    const entries = await fs.readdir(cascadeProjectsDir, { withFileTypes: true });
    const directories = entries.filter(entry => entry.isDirectory());
    
    console.log(`Found ${directories.length} subdirectories in CascadeProjects`);
    
    // Create CLAUDE.md in each subdirectory if it doesn't exist
    for (const dir of directories) {
      const claudeMdPath = path.join(cascadeProjectsDir, dir.name, 'CLAUDE.md');
      
      try {
        // Check if file exists
        await fs.access(claudeMdPath);
        console.log(`CLAUDE.md already exists in ${dir.name}`);
      } catch {
        // File doesn't exist, create it with a base template
        const baseTemplate = `# Project: ${dir.name}

This is a CLAUDE.md file for project ${dir.name}.

# myAI Memory

# User Information
-~- Workplace: New Model VC as a partner
-~- Vehicle: 2 cars
-~- Cars: Plug in Hybrid and ID.5 Pro Style

`;
        
        await fs.writeFile(claudeMdPath, baseTemplate, 'utf-8');
        console.log(`Created CLAUDE.md in ${dir.name}`);
      }
    }
    
    console.log('Setup complete');
  } catch (error) {
    console.error('Error setting up test projects:', error);
  }
}

// Test the synchronization
async function testClaudeMdSync() {
  try {
    // First, set up the test environment
    await setupTestProjects();
    
    console.log('Testing CLAUDE.md synchronization...');
    
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
    
    // Wait for sync to complete
    console.log('Waiting for sync to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check CLAUDE.md files in CascadeProjects subdirectories
    const cascadeProjectsDir = path.join(os.homedir(), 'CascadeProjects');
    const entries = await fs.readdir(cascadeProjectsDir, { withFileTypes: true });
    const directories = entries.filter(entry => entry.isDirectory());
    
    console.log(`\nChecking ${directories.length} project directories for CLAUDE.md files:`);
    
    let syncedCount = 0;
    let totalCount = 0;
    
    for (const dir of directories) {
      const claudeMdPath = path.join(cascadeProjectsDir, dir.name, 'CLAUDE.md');
      
      try {
        // Check if file exists
        await fs.access(claudeMdPath);
        totalCount++;
        
        // Read the file
        const content = await fs.readFile(claudeMdPath, 'utf-8');
        
        // Check if it contains our test content WITH timestamp
        // This ensures we're checking for the latest sync
        const hasLatestSync = content.includes(testTimestamp);
        const hasTeamsSection = content.includes('# Favourite Teams') && content.includes('Leicester Tigers');
        
        if (hasLatestSync) {
          console.log(`✅ ${dir.name}/CLAUDE.md: Successfully synced with timestamp ${testTimestamp}`);
          syncedCount++;
        } else if (hasTeamsSection) {
          console.log(`⚠️ ${dir.name}/CLAUDE.md: Has Teams section but NOT the latest timestamp`);
        } else {
          console.log(`❌ ${dir.name}/CLAUDE.md: Missing Teams section entirely`);
        }
      } catch (err) {
        console.log(`⏭️ ${dir.name}/CLAUDE.md: File does not exist or cannot be read`);
      }
    }
    
    console.log('\nSynchronization Test Results:');
    console.log(`Total CLAUDE.md files found: ${totalCount}`);
    console.log(`Successfully synced files: ${syncedCount}`);
    console.log(`Success rate: ${Math.round((syncedCount / totalCount) * 100)}%`);
    console.log(`Test timestamp used: ${testTimestamp}`);
    
    if (syncedCount > 0) {
      console.log('\n✅ TEST PASSED: At least some files were successfully synced');
    } else {
      console.log('\n❌ TEST FAILED: No files were successfully synced');
    }
  } catch (error) {
    console.error('Error testing CLAUDE.md sync:', error);
  }
}

// Run the test
testClaudeMdSync();
