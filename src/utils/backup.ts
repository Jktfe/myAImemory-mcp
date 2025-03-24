import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';

/**
 * Utility for creating backups of the myAI Master file
 * Handles creating timestamped backups before any modifications
 */
export class BackupManager {
  private masterPath: string;
  private backupDir: string;

  constructor(masterPath: string) {
    this.masterPath = masterPath;
    this.backupDir = path.join(path.dirname(masterPath), 'MasterBackups');
  }

  /**
   * Create a backup of the master file with timestamp
   * @returns Promise resolving to the path of the backup file or null if backup failed
   */
  async createBackup(): Promise<string | null> {
    try {
      // Ensure backup directory exists
      if (!fs.existsSync(this.backupDir)) {
        await fsPromises.mkdir(this.backupDir, { recursive: true });
      }

      // Check if master file exists
      if (!fs.existsSync(this.masterPath)) {
        console.error(`Master file not found at ${this.masterPath}`);
        return null;
      }

      // Create backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `myAI-Master-${timestamp}.md`;
      const backupPath = path.join(this.backupDir, backupFilename);

      // Copy the file
      await fsPromises.copyFile(this.masterPath, backupPath);
      console.log(`✅ Created backup at ${backupPath}`);
      return backupPath;
    } catch (err) {
      console.error('Failed to create backup:', err);
      return null;
    }
  }

  /**
   * List all available backups
   * @returns Array of backup filenames sorted by date (newest first)
   */
  async listBackups(): Promise<string[]> {
    try {
      if (!fs.existsSync(this.backupDir)) {
        return [];
      }

      const files = await fsPromises.readdir(this.backupDir);
      return files
        .filter(file => file.startsWith('myAI-Master-') && file.endsWith('.md'))
        .sort()
        .reverse();
    } catch (err) {
      console.error('Failed to list backups:', err);
      return [];
    }
  }

  /**
   * Restore from a specific backup
   * @param backupFilename The filename of the backup to restore
   * @returns Promise resolving to true if successful
   */
  async restoreFromBackup(backupFilename: string): Promise<boolean> {
    try {
      const backupPath = path.join(this.backupDir, backupFilename);
      
      // Check if backup exists
      if (!fs.existsSync(backupPath)) {
        console.error(`Backup not found: ${backupFilename}`);
        return false;
      }

      // Create an extra backup of current state before restoration
      await this.createBackup();
      
      // Copy backup to master
      await fsPromises.copyFile(backupPath, this.masterPath);
      console.log(`✅ Restored from backup: ${backupFilename}`);
      return true;
    } catch (err) {
      console.error('Failed to restore from backup:', err);
      return false;
    }
  }
}

export default BackupManager;
