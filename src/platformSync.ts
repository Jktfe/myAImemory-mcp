import { promises as fs } from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { homedir } from 'os';
import { SyncStatus, PlatformType } from './types.js';
import { generateTemplate } from './templateParser.js';
import { config } from './config.js'; // Import the config object
import * as fsSync from 'fs';

// Custom logger that writes to stderr instead of stdout
const logger = {
  log: (...args: any[]) => console.error('[platformSync]', ...args),
  error: (...args: any[]) => console.error('[platformSync:error]', ...args)
};

/**
 * Base platform sync interface
 */
interface PlatformSyncer {
  sync(templateContent: string): Promise<SyncStatus>;
}

/**
 * Helper function to expand tilde in paths
 */
function expandTildePath(filePath: string): string {
  if (!filePath || typeof filePath !== 'string') {
    return filePath;
  }
  
  // Replace tilde with home directory
  if (filePath.startsWith('~/') || filePath === '~') {
    return filePath.replace(/^~/, homedir());
  }
  
  // If path is relative, make it absolute
  if (!path.isAbsolute(filePath)) {
    return path.resolve(process.cwd(), filePath);
  }
  
  return filePath;
}

/**
 * Helper function to ensure a file is writable
 * Will attempt to fix permissions if possible
 */
export async function ensureFileWritable(filePath: string): Promise<boolean> {
  try {
    // Make sure the directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    // Check if file exists
    try {
      await fs.access(filePath);
      
      // Try to make it writable
      try {
        await fs.chmod(filePath, 0o644);
        console.error(`Made file writable: ${filePath}`);
      } catch (err) {
        console.error(`Failed to change permissions on ${filePath}:`, err);
        // Continue anyway - it might still work
      }
    } catch (err) {
      // File doesn't exist, try to create it
      try {
        // Create an empty file
        await fs.writeFile(filePath, '', { flag: 'wx' });
        console.error(`Created empty file: ${filePath}`);
      } catch (fileErr) {
        // That's okay, we'll try to write to it anyway
        console.error(`Failed to create file ${filePath}:`, fileErr);
      }
    }
    
    // Final test - try to open it for writing
    try {
      const handle = await fs.open(filePath, 'r+');
      await handle.close();
      return true;
    } catch (err) {
      console.error(`File not writable: ${filePath}`, err);
      return false;
    }
  } catch (err) {
    console.error(`Error ensuring file is writable: ${filePath}`, err);
    return false;
  }
}

/**
 * Helper to extract the myAI Memory section from template content
 */
function extractMyAIMemorySection(templateContent: string): string {
  // Check if the template contains "# myAI Memory" section
  if (templateContent.includes('# myAI Memory')) {
    // Find the index of the "# myAI Memory" header
    const startIndex = templateContent.indexOf('# myAI Memory');
    
    // Extract everything from that point onwards
    return templateContent.substring(startIndex).trim();
  }
  
  // If there's no myAI Memory section, create a minimal one
  return '# myAI Memory\n\n';
}

/**
 * Helper to update the myAI Memory section in a file
 * Using the simplified approach:
 * 1. If "# myAI Memory" exists, remove everything from that line to the end
 * 2. Append the new myAI Memory section
 */
async function updateMyAIMemorySection(filePath: string, memorySection: string): Promise<void> {
  try {
    // Ensure the file is writable
    if (!await ensureFileWritable(filePath)) {
      throw new Error(`File not writable: ${filePath}`);
    }
    
    // Read the file
    let content = await fs.readFile(filePath, 'utf-8');
    
    // Check if it has a myAI Memory section
    const hasMemorySection = content.includes('# myAI Memory');
    
    if (hasMemorySection) {
      // Remove everything from "# myAI Memory" to the end of the file
      content = content.replace(/# myAI Memory[\s\S]*$/, '');
      // Trim any trailing whitespace
      content = content.trim();
      // Append the new myAI Memory section with proper spacing
      content = `${content}\n\n${memorySection}`;
    } else {
      // Append the myAI Memory section at the end with proper spacing
      content = content.trim();
      content = `${content}\n\n${memorySection}`;
    }
    
    // Write the updated content back to the file
    await fs.writeFile(filePath, content, 'utf-8');
    console.error(`Successfully updated myAI Memory section in ${filePath}`);
  } catch (err) {
    console.error(`Error updating myAI Memory section in ${filePath}:`, err);
    throw err;
  }
}

/**
 * Check if CLAUDE.md is gitignored in a project
 * @param projectPath The path to the project root
 * @returns True if CLAUDE.md is gitignored, false otherwise
 */
async function isClaudeMdGitignored(projectPath: string): Promise<boolean> {
  try {
    const gitignorePath = path.join(projectPath, '.gitignore');
    
    // Check if .gitignore exists
    try {
      await fs.access(gitignorePath);
    } catch (err) {
      // .gitignore doesn't exist
      return false;
    }
    
    // Read the .gitignore file
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    
    // Check if CLAUDE.md is mentioned
    const lines = gitignoreContent.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Check for any of these patterns that would match CLAUDE.md
      if (
        trimmedLine === 'CLAUDE.md' ||
        trimmedLine === '/CLAUDE.md' ||
        trimmedLine === '**/CLAUDE.md' ||
        trimmedLine === 'CLAUDE.*'
      ) {
        return true;
      }
    }
    
    return false;
  } catch (err) {
    console.error(`Error checking if CLAUDE.md is gitignored in ${projectPath}:`, err);
    return false;
  }
}

/**
 * Adds CLAUDE.md to the .gitignore file of a project
 * @param projectPath The path to the project root
 */
async function addClaudeMdToGitignore(projectPath: string): Promise<void> {
  try {
    const gitignorePath = path.join(projectPath, '.gitignore');
    
    // Create .gitignore if it doesn't exist
    let content = '';
    try {
      await fs.access(gitignorePath);
      content = await fs.readFile(gitignorePath, 'utf-8');
    } catch (err) {
      // .gitignore doesn't exist, create it
      console.error(`Creating new .gitignore file in ${projectPath}`);
    }
    
    // Add CLAUDE.md to .gitignore if it's not already there
    if (!content.includes('CLAUDE.md')) {
      // Add a header if this is a new file
      if (!content.trim()) {
        content = '# Git ignore file\n\n';
      }
      
      // Make sure it ends with a newline
      if (content.length > 0 && !content.endsWith('\n')) {
        content += '\n';
      }
      
      // Add CLAUDE.md
      content += '/CLAUDE.md\n';
      
      // Write the updated content back to the file
      await fs.writeFile(gitignorePath, content, 'utf-8');
      console.error(`Added CLAUDE.md to .gitignore in ${projectPath}`);
    }
  } catch (err) {
    console.error(`Error adding CLAUDE.md to .gitignore in ${projectPath}:`, err);
    throw err;
  }
}

/**
 * Claude Code synchronization (CLAUDE.md files in project roots)
 */
export class ClaudeCodeSyncer implements PlatformSyncer {
  private projectRoots: string[] = [];
  private lastSyncTime: number = 0;
  private syncCooldown: number = 5000; // 5 second cooldown
  private claudeProjectsPath: string;
  
  constructor(claudeProjectsPath?: string) {
    // Set the Claude projects path
    this.claudeProjectsPath = claudeProjectsPath || path.join(homedir(), 'CascadeProjects');
    console.error(`ClaudeCodeSyncer initialized with path: ${this.claudeProjectsPath}`);
    
    // Add the current project as a starting point
    const myAiClaudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
    if (fsSync.existsSync(myAiClaudeMdPath)) {
      this.projectRoots.push(process.cwd());
      console.error(`Found CLAUDE.md in current project: ${myAiClaudeMdPath}`);
    }
    
    // Log initialization
    console.error('ClaudeCodeSyncer initialized - will search common project directories for CLAUDE.md files');
  }
  
  async sync(templateContent: string): Promise<SyncStatus> {
    console.error('ClaudeCodeSyncer.sync called, claudeProjectsPath:', this.claudeProjectsPath);
    
    try {
      const now = Date.now();
      
      // Check if we're within the cooldown period
      if (now - this.lastSyncTime < this.syncCooldown) {
        console.error(`Skipping Claude Code sync - within cooldown period (${this.syncCooldown}ms)`);
        return {
          platform: 'claude-code',
          success: true,
          message: `Skipped update to Claude Code files (within throttle period)`
        };
      }
      
      // Make sure we're working with a properly expanded path
      const resolvedProjectsPath = expandTildePath(this.claudeProjectsPath);
      console.error(`Resolved projects path: ${resolvedProjectsPath}`);
      
      // Start with home directory CLAUDE.md
      const homeClaudeMdPath = path.join(homedir(), 'CLAUDE.md');
      const successfulSyncs: string[] = [];
      const failedSyncs: { path: string; error: string }[] = [];
      
      // Handle home directory CLAUDE.md
      console.error(`Checking home directory CLAUDE.md at ${homeClaudeMdPath}`);
      try {
        // Ensure writable
        const homeFileWritable = await ensureFileWritable(homeClaudeMdPath);
        if (homeFileWritable) {
          // Extract the "myAI Memory" section
          const memorySection = extractMyAIMemorySection(templateContent);
          if (memorySection) {
            // Update the memory section
            await updateMyAIMemorySection(homeClaudeMdPath, memorySection);
            successfulSyncs.push(homeClaudeMdPath);
            console.error(`Successfully updated ${homeClaudeMdPath}`);
          } else {
            failedSyncs.push({
              path: homeClaudeMdPath,
              error: 'Failed to extract "myAI Memory" section from template'
            });
          }
        } else {
          failedSyncs.push({
            path: homeClaudeMdPath,
            error: 'Could not make file writable'
          });
        }
      } catch (err) {
        console.error(`Error updating ${homeClaudeMdPath}:`, err);
        failedSyncs.push({
          path: homeClaudeMdPath,
          error: err instanceof Error ? err.message : String(err)
        });
      }
      
      try {
        // Check if the projects directory exists
        await fs.access(resolvedProjectsPath);
        
        // Get all directories within the project directory
        const dirEntries = await fs.readdir(resolvedProjectsPath, { withFileTypes: true });
        const directories = dirEntries.filter(entry => entry.isDirectory());
        
        console.error(`Found ${directories.length} project directories to check for CLAUDE.md files`);
        
        // Extract the "myAI Memory" section
        const memorySection = extractMyAIMemorySection(templateContent);
        if (!memorySection) {
          throw new Error('Failed to extract "myAI Memory" section from template');
        }
        
        // Check each directory for a CLAUDE.md file
        for (const dir of directories) {
          try {
            const dirPath = path.join(resolvedProjectsPath, dir.name);
            const claudeMdPath = path.join(dirPath, 'CLAUDE.md');
            
            // First, ensure CLAUDE.md is gitignored
            const isGitignored = await isClaudeMdGitignored(dirPath);
            if (!isGitignored) {
              console.error(`CLAUDE.md is not gitignored in ${dirPath}. Adding to .gitignore...`);
              try {
                await addClaudeMdToGitignore(dirPath);
                console.error(`Successfully added CLAUDE.md to .gitignore in ${dirPath}`);
              } catch (gitignoreErr) {
                console.error(`Failed to add CLAUDE.md to .gitignore in ${dirPath}:`, gitignoreErr);
                // Continue anyway - we'll still update the file
              }
            }
            
            // Check if CLAUDE.md exists and ensure it's writable
            const isWritable = await ensureFileWritable(claudeMdPath);
            if (isWritable) {
              // Update the memory section
              await updateMyAIMemorySection(claudeMdPath, memorySection);
              successfulSyncs.push(claudeMdPath);
              console.error(`Successfully updated ${claudeMdPath}`);
            } else {
              failedSyncs.push({
                path: claudeMdPath,
                error: 'Could not make file writable'
              });
            }
          } catch (err) {
            console.error(`Error updating ${dir.name}/CLAUDE.md:`, err);
            failedSyncs.push({
              path: `${dir.name}/CLAUDE.md`,
              error: err instanceof Error ? err.message : String(err)
            });
          }
        }
      } catch (err) {
        console.error(`Error accessing projects directory ${resolvedProjectsPath}:`, err);
        failedSyncs.push({
          path: resolvedProjectsPath,
          error: err instanceof Error ? err.message : String(err)
        });
      }
      
      // Update last sync time
      this.lastSyncTime = now;
      
      if (successfulSyncs.length === 0) {
        return {
          platform: 'claude-code',
          success: false,
          message: `Failed to update any CLAUDE.md files. Errors: ${failedSyncs.map(f => `${f.path}: ${f.error}`).join(', ')}`
        };
      } else if (failedSyncs.length === 0) {
        return {
          platform: 'claude-code',
          success: true,
          message: `Successfully updated ${successfulSyncs.length} CLAUDE.md files`
        };
      } else {
        return {
          platform: 'claude-code',
          success: true,
          message: `Partially successful: Updated ${successfulSyncs.length} CLAUDE.md files, ${failedSyncs.length} failures`
        };
      }
    } catch (err) {
      console.error('Error in ClaudeCodeSyncer.sync:', err);
      return {
        platform: 'claude-code',
        success: false,
        message: `Failed to sync CLAUDE.md files: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }
}

/**
 * Claude.ai web interface synchronization
 */
export class ClaudeWebSyncer implements PlatformSyncer {
  private email?: string;
  
  constructor(options?: { email?: string }) {
    this.email = options?.email;
  }
  
  async sync(templateContent: string): Promise<SyncStatus> {
    logger.log('Syncing with Claude Web Profile Settings...');
    
    // Launch browser
    const browser = await puppeteer.launch({
      headless: config.puppeteer.headless,
      slowMo: config.puppeteer.slowMo,
      args: ['--no-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      // Set default timeout
      page.setDefaultTimeout(config.puppeteer.defaultTimeout);
      
      // Navigate directly to Claude.ai profile settings
      await page.goto('https://claude.ai/settings/profile');
      
      // Check if already logged in by looking for profile settings elements
      const isLoggedIn = await page.evaluate(() => {
        return document.querySelector('textarea[name="preferences"]') !== null || 
               document.querySelector('form[action="/settings/profile"]') !== null;
      });
      
      if (!isLoggedIn) {
        logger.log('Not logged in, initiating login process...');
        
        // Wait for the email input field
        const emailInput = await page.waitForSelector('input[type="email"]');
        
        // Fill in email if provided
        if (this.email && emailInput) {
          await emailInput.type(this.email);
          logger.log(`Email field filled with: ${this.email}`);
          
          // Click continue button
          const continueButton = await page.waitForSelector('button[type="submit"]');
          if (continueButton) {
            await continueButton.click();
            logger.log('Clicked continue button');
          }
        } else {
          logger.log('No email provided or email input not found. Please enter your email manually in the browser.');
        }
        
        // Wait for user to complete login process
        logger.log('Waiting for user to complete login process...');
        await page.waitForSelector('textarea[name="preferences"], form[action="/settings/profile"]', { timeout: 300000 }); // 5 minute timeout
        logger.log('Login successful!');
      } else {
        logger.log('Already logged in to Claude.ai');
      }
      
      // Wait for the preferences textarea to be available
      logger.log('Accessing profile preferences...');
      const preferencesTextarea = await page.waitForSelector('textarea[name="preferences"]');
      
      if (preferencesTextarea) {
        // Extract myAI Memory section from template content
        const myAIMemorySection = extractMyAIMemorySection(templateContent);
        
        // Update preferences content
        logger.log('Updating profile preferences...');
        await page.evaluate((el: HTMLTextAreaElement, content: string) => {
          el.value = content;
          
          // Trigger input event to ensure the UI recognizes the change
          const event = new Event('input', { bubbles: true });
          el.dispatchEvent(event);
        }, preferencesTextarea, myAIMemorySection);
        
        // Find and click the Save button
        const saveButton = await page.waitForSelector('button[type="submit"]');
        if (saveButton) {
          await saveButton.click();
          logger.log('Clicked save button');
          
          // Wait for save to complete (you might need to adjust this based on actual page behavior)
          await page.waitForFunction(
            () => {
              // Look for success notification or changes in button state
              return (
                document.querySelector('.success-notification') !== null || 
                !document.querySelector('button[type="submit"][disabled]')
              );
            },
            { timeout: 10000 }
          );
          
          logger.log('Preferences successfully saved');
        } else {
          throw new Error('Save button not found');
        }
      } else {
        throw new Error('Preferences textarea not found');
      }
      
      logger.log('Closing browser...');
      await browser.close();
      
      return {
        platform: 'claude-web',
        success: true,
        message: 'Successfully updated Claude.ai profile preferences'
      };
    } catch (err) {
      if (browser) {
        await browser.close();
      }
      
      logger.error('Error syncing with Claude.ai profile settings:', err);
      return {
        platform: 'claude-web',
        success: false,
        message: `Failed to sync with Claude.ai profile settings: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }
}

/**
 * Windsurf synchronization (global_rules.md file)
 */
export class WindsurfSyncer implements PlatformSyncer {
  private rulesPath: string;
  private lastSyncTime: number = 0;
  private syncCooldown: number = 5000; // 5 second cooldown
  
  constructor(rulesPath?: string) {
    // IMPORTANT: Use the correct path with plural "rules" instead of "rule"
    // Always use the path from config if available
    if (rulesPath) {
      this.rulesPath = expandTildePath(rulesPath);
      console.error(`WindsurfSyncer using configured rulesPath: ${this.rulesPath}`);
    } else {
      // Use the default path with explicit homedir
      this.rulesPath = path.join(homedir(), '.codeium', 'windsurf', 'memories', 'global_rules.md');
      console.error(`WindsurfSyncer using default path: ${this.rulesPath}`);
    }
    
    // Direct reference to ensure we're using the right path
    if (config.paths && config.paths.windsurfMemoryPath) {
      const configPath = expandTildePath(config.paths.windsurfMemoryPath);
      console.error(`Config contains windsurfMemoryPath: ${config.paths.windsurfMemoryPath} (expanded: ${configPath})`);
      
      // If we have a config path, use it instead
      this.rulesPath = configPath;
      console.error(`WindsurfSyncer using config path: ${this.rulesPath}`);
    }
  }
  
  async sync(templateContent: string): Promise<SyncStatus> {
    try {
      const now = Date.now();
      
      // Check if we're within the cooldown period
      if (now - this.lastSyncTime < this.syncCooldown) {
        console.error(`Skipping Windsurf sync - within cooldown period (${this.syncCooldown}ms)`);
        return {
          platform: 'windsurf',
          success: true,
          message: `Skipped update to Windsurf (within throttle period)`
        };
      }
      
      // Make sure the path is properly expanded and resolved
      const resolvedPath = expandTildePath(this.rulesPath);
      console.error(`Preparing to sync with Windsurf at resolved path: ${resolvedPath}`);
      
      // Ensure directory exists and file is writable
      const isWritable = await ensureFileWritable(resolvedPath);
      if (!isWritable) {
        return {
          platform: 'windsurf',
          success: false,
          message: `Failed to sync with Windsurf: Could not make file writable: ${resolvedPath}`
        };
      }
      
      // Extract the "myAI Memory" section
      const memorySection = extractMyAIMemorySection(templateContent);
      if (!memorySection) {
        return {
          platform: 'windsurf',
          success: false,
          message: 'Failed to extract "myAI Memory" section from template'
        };
      }
      
      // Update the memory section (this handles creating/replacing logic)
      await updateMyAIMemorySection(resolvedPath, memorySection);
      
      // Update last sync time
      this.lastSyncTime = now;
      
      return {
        platform: 'windsurf',
        success: true,
        message: `Successfully updated Windsurf memory at ${resolvedPath}`
      };
    } catch (err) {
      console.error('Error syncing with Windsurf:', err);
      return {
        platform: 'windsurf',
        success: false,
        message: `Failed to sync with Windsurf: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }
}

/**
 * Platform synchronization manager
 */
export class PlatformSyncManager {
  private syncers: Map<PlatformType, PlatformSyncer> = new Map();
  
  constructor() {
    // Default syncers
    this.syncers.set('claude-code', new ClaudeCodeSyncer());
    this.syncers.set('windsurf', new WindsurfSyncer());
    // Claude web syncer requires credentials, so it's not created by default
  }
  
  /**
   * Set the syncer for a specific platform
   */
  setSyncer(platform: PlatformType, syncer: PlatformSyncer): void {
    this.syncers.set(platform, syncer);
  }
  
  /**
   * Sync template with all platforms
   */
  async syncAll(templateContent: string): Promise<SyncStatus[]> {
    const results: SyncStatus[] = [];
    
    for (const [platform, syncer] of this.syncers.entries()) {
      logger.log(`Syncing with platform: ${platform}`);
      const result = await syncer.sync(templateContent);
      results.push(result);
    }
    
    return results;
  }
  
  /**
   * Sync template with a specific platform
   */
  async syncPlatform(platform: PlatformType, templateContent: string): Promise<SyncStatus> {
    const syncer = this.syncers.get(platform);
    
    if (!syncer) {
      return {
        platform,
        success: false,
        message: `No syncer configured for platform: ${platform}`
      };
    }
    
    return await syncer.sync(templateContent);
  }
}