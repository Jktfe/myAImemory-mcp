#!/usr/bin/env node

/**
 * sync-memory.js
 * 
 * A utility script for directly synchronizing memory files from myAI Master.md
 * to all appropriate locations (CLAUDE.md files in projects, Windsurf memory)
 * without starting servers.
 * 
 * Usage:
 *   node sync-memory.js [--dry-run] [--verbose] [--master-path=/path/to/master.md]
 * 
 * Options:
 *   --dry-run       Show what would be synchronized without making changes
 *   --verbose       Show detailed information about sync operations
 *   --master-path   Path to the master template file (defaults to './myAI Master.md')
 */

const fs = require('fs').promises;
const path = require('path');
const { existsSync } = require('fs');
const { homedir } = require('os');
// CommonJS already provides __dirname, so we don't need fileURLToPath

// Use regular require for glob package
// Use sync method for simplicity
const glob = require('glob');

// Default configuration
const config = {
  masterTemplatePath: path.join(__dirname, 'myAI Master.md'),
  claudeMdPath: path.join(homedir(), 'CLAUDE.md'),
  windsurfMemoryPath: path.join(homedir(), '.windsurf', 'memory.md'),
  projectsDir: [
    path.join(homedir(), 'Projects'),
    path.join(homedir(), 'CascadeProjects'),
    path.join(homedir(), 'Documents', 'Projects'),
    path.join(homedir(), 'src')
  ],
  memoryCache: path.join(homedir(), '.cache', 'myai-memory-sync', 'template-cache.json'),
  dryRun: false,
  verbose: false
};

// Process command line arguments
process.argv.slice(2).forEach(arg => {
  if (arg === '--dry-run') {
    config.dryRun = true;
  } else if (arg === '--verbose') {
    config.verbose = true;
  } else if (arg.startsWith('--master-path=')) {
    config.masterTemplatePath = arg.split('=')[1];
  }
});

/**
 * Logs a message if verbose mode is enabled
 * @param {string} message The message to log
 */
function logVerbose(message) {
  if (config.verbose) {
    console.log(`[INFO] ${message}`);
  }
}

/**
 * Logs a success message
 * @param {string} message The success message to log
 */
function logSuccess(message) {
  console.log(`[SUCCESS] ${message}`);
}

/**
 * Logs a warning message
 * @param {string} message The warning message to log
 */
function logWarning(message) {
  console.warn(`[WARNING] ${message}`);
}

/**
 * Logs an error message
 * @param {string} message The error message to log
 */
function logError(message) {
  console.error(`[ERROR] ${message}`);
}

/**
 * Ensures a directory exists
 * @param {string} dirPath Directory path to ensure
 */
async function ensureDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    logVerbose(`Ensured directory exists: ${dirPath}`);
  } catch (error) {
    throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
  }
}

/**
 * Finds all CLAUDE.md files in project directories
 * @returns {Promise<string[]>} Array of paths to CLAUDE.md files
 */
/**
 * Finds all CLAUDE.md files in project directories
 * @returns {Promise<string[]>} Array of paths to CLAUDE.md files
 */
async function findClaudeMdFiles() {
  const claudeMdFiles = [];

  for (const dir of config.projectsDir) {
    if (!existsSync(dir)) {
      logWarning(`Project directory does not exist: ${dir}`);
      continue;
    }

    logVerbose(`Searching for CLAUDE.md files in: ${dir}`);
    
    try {
      // Use sync method to avoid promise complexity
      const files = glob.sync('**/CLAUDE.md', { cwd: dir, absolute: true });
      
      files.forEach(file => {
        claudeMdFiles.push(file);
        logVerbose(`Found CLAUDE.md: ${file}`);
      });
    } catch (error) {
      logError(`Error searching for CLAUDE.md files in ${dir}: ${error.message}`);
    }
  }

  return claudeMdFiles;
}

/**
 * Reads the master template file
 * @returns {Promise<string>} The content of the master template
 */
async function readMasterTemplate() {
  try {
    logVerbose(`Reading master template from: ${config.masterTemplatePath}`);
    const content = await fs.readFile(config.masterTemplatePath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`Failed to read master template: ${error.message}`);
  }
}

/**
 * Updates a target file with the master template content
 * Finds the "# myAI Memory" section, replaces it, or adds if missing
 * @param {string} targetPath Path to the target file
 * @param {string} content Content to write to the file
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function updateFile(targetPath, content) {
  try {
    if (config.dryRun) {
      logSuccess(`[DRY RUN] Would update file: ${targetPath}`);
      return true;
    }

    // Ensure the directory exists
    await ensureDirectory(path.dirname(targetPath));
    
    // Check if file already exists
    let existingContent = '';
    try {
      existingContent = await fs.readFile(targetPath, 'utf-8');
    } catch (error) {
      // File doesn't exist, we'll create it
      logVerbose(`Creating new file: ${targetPath}`);
    }
    
    let newContent = '';
    
    if (existingContent) {
      // Look for the "# myAI Memory" section
      const myAIMemoryRegex = /# myAI Memory[\s\S]*?(?=^#[^#]|\Z)/m;
      
      if (myAIMemoryRegex.test(existingContent)) {
        // Replace existing myAI Memory section
        newContent = existingContent.replace(myAIMemoryRegex, content);
        logVerbose(`Replaced existing myAI Memory section in: ${targetPath}`);
      } else {
        // Add myAI Memory section at the beginning
        newContent = content + '\n\n' + existingContent;
        logVerbose(`Added myAI Memory section to: ${targetPath}`);
      }
    } else {
      // New file, just use content
      newContent = content;
    }
    
    // Write the file
    await fs.writeFile(targetPath, newContent, 'utf-8');
    logSuccess(`Updated file: ${targetPath}`);
    return true;
  } catch (error) {
    logError(`Failed to update file ${targetPath}: ${error.message}`);
    return false;
  }
}

/**
 * Updates the memory cache file
 * @param {string} content Template content to cache
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function updateMemoryCache(content) {
  try {
    if (config.dryRun) {
      logSuccess(`[DRY RUN] Would update memory cache: ${config.memoryCache}`);
      return true;
    }

    // Ensure the cache directory exists
    await ensureDirectory(path.dirname(config.memoryCache));
    
    // Create a cache object with timestamp and content
    const cacheObject = {
      timestamp: Date.now(),
      content
    };
    
    // Write the cache file
    await fs.writeFile(config.memoryCache, JSON.stringify(cacheObject, null, 2), 'utf-8');
    logSuccess(`Updated memory cache: ${config.memoryCache}`);
    return true;
  } catch (error) {
    logError(`Failed to update memory cache: ${error.message}`);
    return false;
  }
}

/**
 * Main function to sync memory files
 */
async function syncMemory() {
  console.log('======================================');
  console.log('       myAI Memory Sync Utility       ');
  console.log('======================================');
  
  if (config.dryRun) {
    console.log('Running in DRY RUN mode - no files will be changed');
  }
  
  try {
    // 1. Read the master template
    const masterContent = await readMasterTemplate();
    console.log(`Master template loaded (${masterContent.length} bytes)`);

    // 2. Find all CLAUDE.md files
    const claudeMdFiles = await findClaudeMdFiles();
    console.log(`Found ${claudeMdFiles.length} CLAUDE.md files in projects`);

    // 3. Update all files
    let successCount = 0;
    let failureCount = 0;
    
    // Update the home directory CLAUDE.md
    if (await updateFile(config.claudeMdPath, masterContent)) {
      successCount++;
    } else {
      failureCount++;
    }
    
    // Update the Windsurf memory file
    if (await updateFile(config.windsurfMemoryPath, masterContent)) {
      successCount++;
    } else {
      failureCount++;
    }
    
    // Update all project CLAUDE.md files
    for (const filePath of claudeMdFiles) {
      if (await updateFile(filePath, masterContent)) {
        successCount++;
      } else {
        failureCount++;
      }
    }
    
    // 4. Update the memory cache
    await updateMemoryCache(masterContent);
    
    // 5. Display summary
    console.log('\n======================================');
    console.log('             Sync Summary            ');
    console.log('======================================');
    console.log(`Total files processed: ${successCount + failureCount}`);
    console.log(`Successful updates: ${successCount}`);
    console.log(`Failed updates: ${failureCount}`);
    
    if (config.dryRun) {
      console.log('\nThis was a dry run. No files were actually changed.');
      console.log('Run without --dry-run to perform actual file updates.');
    }
    
  } catch (error) {
    logError(`Memory sync failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the sync process
syncMemory();

// Export functions for potential reuse
module.exports = {
  syncMemory,
  readMasterTemplate,
  updateFile,
  updateMemoryCache,
  findClaudeMdFiles
};

