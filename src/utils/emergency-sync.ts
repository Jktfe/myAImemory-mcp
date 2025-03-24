/**
 * Emergency Sync Utility
 * 
 * Provides emergency synchronization capabilities when the MCP server
 * is not available or experiencing issues.
 */
import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import { config } from '../config.js';
import { ensureFileWritable } from '../platformSync.js';

/**
 * Perform emergency sync across all platforms
 */
export async function emergencySync(): Promise<void> {
  try {
    console.log('Starting emergency sync...');
    
    // Read the master template
    const masterPath = config.paths?.masterTemplate || path.join(process.cwd(), 'myAI Master.md');
    console.log(`Reading master template from: ${masterPath}`);
    const templateContent = await fs.readFile(masterPath, 'utf-8');
    
    // Get myAI Memory section
    const myAIMemoryMatch = templateContent.match(/(# myAI Memory[\s\S]*)/);
    if (!myAIMemoryMatch) {
      console.error('Could not find "# myAI Memory" section in the template');
      throw new Error('Missing myAI Memory section in master template');
    }
    const memorySection = myAIMemoryMatch[1];
    
    // Sync to windsurf
    await syncToWindsurf(memorySection);
    
    // Sync to home directory
    await syncToHomeDirectory(memorySection);
    
    // Sync to project directories
    await syncToProjects(memorySection);
    
    console.log('Emergency sync completed successfully');
  } catch (error) {
    console.error(`Emergency sync failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Sync to Windsurf memory file
 */
async function syncToWindsurf(memorySection: string): Promise<void> {
  // Get Windsurf memory path
  const windsurfPath = config.paths?.windsurfMemoryPath || 
    path.join(homedir(), '.codeium', 'windsurf', 'memories', 'global_rules.md');
  
  console.log(`Syncing to Windsurf at: ${windsurfPath}`);
  
  try {
    // Ensure the file is writable
    const windsurfWritable = await ensureFileWritable(windsurfPath);
    
    if (windsurfWritable) {
      // Read existing content if it exists
      let windsurfContent = '';
      try {
        windsurfContent = await fs.readFile(windsurfPath, 'utf-8');
      } catch (err) {
        // File might not exist, that's okay
      }
      
      // Check if it has myAI Memory section
      const hasMemorySection = windsurfContent.includes('# myAI Memory');
      
      if (hasMemorySection) {
        // Replace existing section
        windsurfContent = windsurfContent.replace(/# myAI Memory[\s\S]*$/, memorySection);
      } else {
        // Append memory section
        windsurfContent = windsurfContent.trim() + '\n\n' + memorySection;
      }
      
      // Write updated content
      await fs.writeFile(windsurfPath, windsurfContent);
      console.log('✅ Successfully updated Windsurf memory');
    } else {
      console.error('❌ Could not make Windsurf file writable:', windsurfPath);
    }
  } catch (err) {
    console.error('❌ Error updating Windsurf:', err);
  }
}

/**
 * Sync to home directory CLAUDE.md
 */
async function syncToHomeDirectory(memorySection: string): Promise<void> {
  // Get home directory CLAUDE.md path
  const homeClaudeMdPath = path.join(homedir(), 'CLAUDE.md');
  
  console.log(`Syncing to home CLAUDE.md at: ${homeClaudeMdPath}`);
  
  try {
    // Ensure the file is writable
    const homeClaudeWritable = await ensureFileWritable(homeClaudeMdPath);
    
    if (homeClaudeWritable) {
      // Read existing content if it exists
      let claudeContent = '';
      try {
        claudeContent = await fs.readFile(homeClaudeMdPath, 'utf-8');
      } catch (err) {
        // File might not exist, that's okay
      }
      
      // Check if it has myAI Memory section
      const hasMemorySection = claudeContent.includes('# myAI Memory');
      
      if (hasMemorySection) {
        // Replace existing section
        claudeContent = claudeContent.replace(/# myAI Memory[\s\S]*$/, memorySection);
      } else {
        // Append memory section
        claudeContent = claudeContent.trim() + '\n\n' + memorySection;
      }
      
      // Write updated content
      await fs.writeFile(homeClaudeMdPath, claudeContent);
      console.log('✅ Successfully updated home CLAUDE.md');
    } else {
      console.error('❌ Could not make home CLAUDE.md file writable');
    }
  } catch (err) {
    console.error('❌ Error updating home CLAUDE.md:', err);
  }
}

/**
 * Sync to project directories
 */
async function syncToProjects(memorySection: string): Promise<void> {
  // Get projects directory
  const claudeProjectsPath = config.paths?.claudeProjectsPath || 
    path.join(homedir(), 'CascadeProjects');
  
  console.log(`Syncing to project CLAUDE.md files in: ${claudeProjectsPath}`);
  
  try {
    // Get all subdirectories
    const dirEntries = await fs.readdir(claudeProjectsPath, { withFileTypes: true });
    const directories = dirEntries.filter(entry => entry.isDirectory());
    
    console.log(`Found ${directories.length} project directories`);
    let successCount = 0;
    let failCount = 0;
    
    // Process each directory
    for (const dir of directories) {
      const dirPath = path.join(claudeProjectsPath, dir.name);
      const claudeMdPath = path.join(dirPath, 'CLAUDE.md');
      
      try {
        // Ensure the file is writable
        const claudeWritable = await ensureFileWritable(claudeMdPath);
        
        if (claudeWritable) {
          // Read existing content if it exists
          let claudeContent = '';
          try {
            claudeContent = await fs.readFile(claudeMdPath, 'utf-8');
          } catch (err) {
            // File might not exist, that's okay
          }
          
          // Check if it has myAI Memory section
          const hasMemorySection = claudeContent.includes('# myAI Memory');
          
          if (hasMemorySection) {
            // Replace existing section
            claudeContent = claudeContent.replace(/# myAI Memory[\s\S]*$/, memorySection);
          } else {
            // Append memory section
            claudeContent = claudeContent.trim() + '\n\n' + memorySection;
          }
          
          // Write updated content
          await fs.writeFile(claudeMdPath, claudeContent);
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        console.error(`Error updating ${claudeMdPath}:`, err);
        failCount++;
      }
    }
    
    console.log(`✅ Successfully updated ${successCount} project CLAUDE.md files`);
    
    if (failCount > 0) {
      console.log(`❌ Failed to update ${failCount} project CLAUDE.md files`);
    }
  } catch (err) {
    console.error('❌ Error accessing projects directory:', err);
  }
}