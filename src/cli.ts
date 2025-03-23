#!/usr/bin/env node

import { printVersion } from './version.js';
import { templateService } from './services/templateService.js';
import { platformService } from './services/platformService.js';
import { generateTemplate } from './templateParser.js';
import { main as startHttpServer } from './server.js';
import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import { ensureFileWritable } from './platformSync.js';
import { config } from './config.js';
import { program } from 'commander';
import { processMemoryCommand } from './naturalLanguageParser.js';

async function printHelp() {
  console.log(`
myAI Memory Sync - CLI Usage

Available commands:
  --version           Print version information
  --help              Show this help message
  --http              Start the HTTP server for SSE transport
  --stdio             Start the stdio server for MCP transport
  --debug             Enable debug mode
  --emergency-sync    Perform emergency sync across all platforms
  --remember <command> Process a natural language memory command
  
Environment variables:
  CLAUDE_WEB_SYNC_ENABLED=true    Enable Claude Web synchronization
  CLAUDE_WEB_HEADLESS=true        Run Chrome in headless mode for Claude Web
  CLAUDE_WEB_EMAIL=you@email.com  Set your Claude Web email for auto-login
`);
}

async function emergencySync() {
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
      process.exit(1);
    }
    const memorySection = myAIMemoryMatch[1];
    
    // Sync to windsurf
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
    
    // Sync to CLAUDE.md files
    const claudeProjectsPath = config.paths?.claudeProjectsPath || 
      path.join(homedir(), 'CascadeProjects');
    
    // Start with home directory
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
    
    // Check if projects directory exists
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
    
    console.log('Emergency sync completed');
  } catch (err) {
    console.error('❌ Emergency sync failed:', err);
    process.exit(1);
  }
}

async function main() {
  program
    .name('myAI Memory Sync')
    .description('Sync memory templates across platforms')
    .version('1.0.0')
    .option('--help', 'Show this help message')
    .option('--http', 'Start the HTTP server for SSE transport')
    .option('--stdio', 'Start the stdio server for MCP transport')
    .option('--debug', 'Enable debug mode')
    .option('--emergency-sync', 'Emergency sync - fixes permissions and updates all platforms')
    .option('--remember <command>', 'Process a natural language memory command')
    .action(async (options: any) => {
      if (options.help) {
        await printHelp();
        process.exit(0);
      }
      
      if (options.http) {
        startHttpServer();
        return;
      }
      
      if (options.debug) {
        // Enable debug
        process.env.DEBUG = 'true';
      }
      
      if (options.emergencySync) {
        await emergencySync();
        process.exit(0);
      }
      
      if (options.remember) {
        // Process natural language memory command
        console.log('Processing memory command:', options.remember);
        try {
          const result = await processMemoryCommand(options.remember);
          if (result.success) {
            console.log('✅', result.message);
          } else {
            console.error('❌', result.message);
          }
          process.exit(0);
        } catch (error) {
          console.error('Error processing memory command:', error);
          process.exit(1);
        }
      } else if (options.stdio) {
        // Continue with stdio server
        console.error('Starting myAI Memory Sync with stdio transport');
      } else {
        console.error(`Unknown command: ${options[0]}`);
        await printHelp();
        process.exit(1);
      }
    });
  
  program.parse(process.argv);
}

// Run main if this file is being executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('Error in main:', err);
    process.exit(1);
  });
}