import path from 'path';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { SyncStatus, PlatformType } from './types.js';
import { BackupManager } from './utils/backup.js';
import { config } from './config.js';
import { ClaudeCodeSyncer, WindsurfSyncer } from './platformSync.js';

/**
 * SafeSyncManager - Restricted version of PlatformSyncManager
 * Only allows three core operations:
 * 1. Reading from the master file
 * 2. Writing to the master file (with automatic backup)
 * 3. Syncing from the master to other locations
 */
export class SafeSyncManager {
  private masterPath: string;
  private backupManager: BackupManager;
  private claudeCodeSyncer: ClaudeCodeSyncer;
  private windsurfSyncer: WindsurfSyncer;

  constructor() {
    // Set the master file path - always in the project root
    this.masterPath = path.join(process.cwd(), 'myAI Master.md');
    
    // Initialize backup manager
    this.backupManager = new BackupManager(this.masterPath);
    
    // Initialize platform syncers
    const claudeProjectsPath = config.paths?.claudeProjectsPath || path.join(homedir(), 'CascadeProjects');
    this.claudeCodeSyncer = new ClaudeCodeSyncer(claudeProjectsPath);
    
    const windsurfMemoryPath = config.paths?.windsurfMemoryPath;
    this.windsurfSyncer = new WindsurfSyncer(windsurfMemoryPath);
  }

  /**
   * Read the master file content
   * @returns The content of the master file
   */
  async readMasterFile(): Promise<string> {
    try {
      // Check if master file exists
      try {
        await fs.access(this.masterPath);
      } catch (err: any) {
        console.error(`Master file not found at ${this.masterPath}`);
        return '';
      }
      
      // Read the file
      const content = await fs.readFile(this.masterPath, 'utf-8');
      return content;
    } catch (err: any) {
      console.error(`Error reading master file: ${err}`);
      throw new Error(`Failed to read master file: ${err.message}`);
    }
  }

  /**
   * Update the master file with new content
   * Creates a backup before making any changes
   * @param newContent The new content to write
   * @returns Success status
   */
  async updateMasterFile(newContent: string): Promise<boolean> {
    try {
      // Create a backup first
      const backupPath = await this.createBackup();
      if (!backupPath) {
        console.error('Failed to create backup, aborting update');
        return false;
      }
      
      // Write the new content to the master file
      await fs.writeFile(this.masterPath, newContent, 'utf-8');
      console.log(`✅ Successfully updated master file at ${this.masterPath}`);
      return true;
    } catch (err: any) {
      console.error(`Error updating master file: ${err}`);
      return false;
    }
  }

  /**
   * Updates a specific section in the master file
   * @param sectionName The name of the section to update (e.g., "# Personal Information")
   * @param newContent The new content for the section
   * @returns Success status
   */
  async updateSection(sectionName: string, newContent: string): Promise<boolean> {
    try {
      // Read the current content
      const currentContent = await this.readMasterFile();
      
      // Find the section
      const sectionStart = currentContent.indexOf(sectionName);
      if (sectionStart === -1) {
        console.error(`Section "${sectionName}" not found in master file`);
        return false;
      }
      
      // Find the next section (if any)
      const nextSectionMatch = currentContent.slice(sectionStart + sectionName.length).match(/^# .+$/m);
      let nextSectionStart = -1;
      if (nextSectionMatch) {
        nextSectionStart = currentContent.indexOf(nextSectionMatch[0], sectionStart + sectionName.length);
      }
      
      // Create updated content
      let updatedContent;
      if (nextSectionStart !== -1) {
        // Replace just this section
        updatedContent = 
          currentContent.slice(0, sectionStart) + 
          sectionName + '\n\n' + newContent + '\n\n' + 
          currentContent.slice(nextSectionStart);
      } else {
        // This is the last section, replace to the end
        updatedContent = 
          currentContent.slice(0, sectionStart) + 
          sectionName + '\n\n' + newContent;
      }
      
      // Update the master file
      return await this.updateMasterFile(updatedContent);
    } catch (err: any) {
      console.error(`Error updating section: ${err}`);
      return false;
    }
  }

  /**
   * Retrieve a specific section from the master file
   * @param sectionName The name of the section to retrieve (e.g., "# Personal Information")
   * @returns The content of the section or null if not found
   */
  async getSection(sectionName: string): Promise<string | null> {
    try {
      // Read the master file
      const content = await this.readMasterFile();
      
      // Find the section
      const sectionStart = content.indexOf(sectionName);
      if (sectionStart === -1) {
        return null;
      }
      
      // Find the next section (if any)
      const contentAfterSection = content.slice(sectionStart + sectionName.length);
      const nextSectionMatch = contentAfterSection.match(/^# .+$/m);
      
      let sectionContent;
      if (nextSectionMatch) {
        const nextSectionOffset = contentAfterSection.indexOf(nextSectionMatch[0]);
        sectionContent = contentAfterSection.slice(0, nextSectionOffset).trim();
      } else {
        sectionContent = contentAfterSection.trim();
      }
      
      return sectionContent;
    } catch (err: any) {
      console.error(`Error getting section: ${err}`);
      return null;
    }
  }

  /**
   * Sync the master file to all supported platforms
   * @returns Array of sync status results
   */
  async syncToPlatforms(): Promise<SyncStatus[]> {
    try {
      // Read the master file
      const masterContent = await this.readMasterFile();
      if (!masterContent) {
        throw new Error('Master file is empty or not found');
      }
      
      // Sync results
      const results: SyncStatus[] = [];
      
      // Sync to Claude Code (CLAUDE.md files)
      try {
        const claudeResult = await this.claudeCodeSyncer.sync(masterContent);
        results.push(claudeResult);
      } catch (err: any) {
        console.error('Error syncing to Claude Code:', err);
        results.push({
          platform: 'claude-code',
          success: false,
          message: `Error: ${err.message}`
        });
      }
      
      // Sync to Windsurf
      try {
        const windsurfResult = await this.windsurfSyncer.sync(masterContent);
        results.push(windsurfResult);
      } catch (err: any) {
        console.error('Error syncing to Windsurf:', err);
        results.push({
          platform: 'windsurf',
          success: false,
          message: `Error: ${err.message}`
        });
      }
      
      return results;
    } catch (err: any) {
      console.error(`Error during sync: ${err}`);
      throw err;
    }
  }

  /**
   * Create a backup of the master file
   * @returns Path to the backup file or null if backup failed
   */
  public async createBackup(): Promise<string | null> {
    return await this.backupManager.createBackup();
  }

  /**
   * Get a list of available backups
   * @returns Array of backup filenames sorted by date (newest first)
   */
  public async listBackups(): Promise<string[]> {
    return await this.backupManager.listBackups();
  }

  /**
   * Restore from a specific backup
   * @param backupFilename The filename of the backup to restore
   * @returns Success status
   */
  public async restoreFromBackup(backupFilename: string): Promise<boolean> {
    return await this.backupManager.restoreFromBackup(backupFilename);
  }
}

export default SafeSyncManager;
