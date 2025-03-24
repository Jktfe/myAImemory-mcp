/**
 * Custom implementation of PlatformService
 */
import { promises as fs } from 'fs';
import path from 'path';
import { homedir } from 'os';
import { SyncStatus, PlatformType } from '../../types.js';
import { generateTemplate } from '../../templateParser.js';
import { PlatformService } from './PlatformService.js';
import { ClaudeCodeSyncer, ensureFileWritable } from '../../platformSync.js';
import { config } from '../../config.js';

// Import the memory cache service dynamically - handles if Anthropic features are not enabled
let memoryCacheService: any = null;
try {
  // We'll attempt to load this module, but it's optional
  import('../../utils/memoryCacheService.js').then(module => {
    memoryCacheService = module;
    console.error('Memory cache service loaded for prompt caching');
  }).catch(err => {
    console.error('Memory cache service not available (Anthropic features likely not enabled)');
  });
} catch (e) {
  // This is expected if Anthropic features are not enabled
  console.error('Memory cache service could not be imported');
}

/**
 * Base platform sync interface
 */
interface PlatformSyncer {
  sync(templateContent: string): Promise<SyncStatus>;
}

/**
 * Windsurf synchronization (global_rules.md file)
 */
class WindsurfSyncer implements PlatformSyncer {
  private rulesPath: string;
  private lastSyncTime: number = 0;
  private syncCooldown: number = 5000; // 5 second cooldown
  
  constructor(rulesPath?: string) {
    this.rulesPath = rulesPath || path.join(homedir(), '.windsurf', 'global_rules.md');
  }
  
  async sync(templateContent: string): Promise<SyncStatus> {
    try {
      const now = Date.now();
      
      // Check if we're within the cooldown period
      if (now - this.lastSyncTime < this.syncCooldown) {
        console.error(`Skipping Windsurf sync - within cooldown period (${this.syncCooldown}ms)`);
        return {
          platform: 'windsurf' as PlatformType,
          success: false,
          message: 'Skipped - cooldown period'
        };
      }
      
      // Update our last sync time
      this.lastSyncTime = now;
      
      // Ensure the directory exists
      const dirPath = path.dirname(this.rulesPath);
      await fs.mkdir(dirPath, { recursive: true });
      
      // Make sure we can write to the file
      await ensureFileWritable(this.rulesPath);
      
      // Write the template to the rules file
      await fs.writeFile(this.rulesPath, templateContent, 'utf8');
      
      console.error(`Windsurf sync complete: ${this.rulesPath}`);
      
      return {
        platform: 'windsurf' as PlatformType,
        success: true,
        message: `Synced to ${this.rulesPath}`
      };
    } catch (error) {
      console.error('Error syncing to Windsurf:', error);
      return {
        platform: 'windsurf' as PlatformType,
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

/**
 * Claude.ai sync (CLAUDE.md file)
 */
class ClaudeAiSyncer implements PlatformSyncer {
  private claudeMdPath: string;
  private lastSyncTime: number = 0;
  private syncCooldown: number = 5000; // 5 second cooldown
  
  constructor(claudeMdPath?: string) {
    this.claudeMdPath = claudeMdPath || path.join(homedir(), 'CLAUDE.md');
  }
  
  async sync(templateContent: string): Promise<SyncStatus> {
    try {
      const now = Date.now();
      
      // Check if we're within the cooldown period
      if (now - this.lastSyncTime < this.syncCooldown) {
        console.error(`Skipping Claude.ai sync - within cooldown period (${this.syncCooldown}ms)`);
        return {
          platform: 'claude-web' as PlatformType,
          success: false,
          message: 'Skipped - cooldown period'
        };
      }
      
      // Update our last sync time
      this.lastSyncTime = now;
      
      // Make sure we can write to the file
      await ensureFileWritable(this.claudeMdPath);
      
      // Write the template to the CLAUDE.md file
      await fs.writeFile(this.claudeMdPath, templateContent, 'utf8');
      
      console.error(`Claude.ai sync complete: ${this.claudeMdPath}`);
      
      // If the memory cache service is available, clear the cache
      if (memoryCacheService && memoryCacheService.clearCache) {
        await memoryCacheService.clearCache();
        console.error('Memory cache cleared');
      }
      
      return {
        platform: 'claude-web' as PlatformType,
        success: true,
        message: `Synced to ${this.claudeMdPath}`
      };
    } catch (error) {
      console.error('Error syncing to Claude.ai:', error);
      return {
        platform: 'claude-web' as PlatformType,
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

/**
 * Custom implementation of the PlatformService
 */
export class CustomPlatformService implements PlatformService {
  private syncers: Map<PlatformType, PlatformSyncer> = new Map();
  private initialized = false;
  private templateContent: string | null = null;

  /**
   * Initialize the platform service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create default syncers
      this.syncers.set('windsurf', new WindsurfSyncer());
      this.syncers.set('claude-web', new ClaudeAiSyncer());
      
      // Create Claude Code syncer if configured for Claude projects folder
      const claudeCodePath = config.paths?.claudeProjectsPath;
      if (claudeCodePath) {
        this.syncers.set('claude-code', new ClaudeCodeSyncer(claudeCodePath));
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize platform service:', error);
      throw error;
    }
  }

  /**
   * Sync template content to all platforms
   * @param templateContent Optional template content to sync (uses cached content if not provided)
   * @returns Array of sync status objects for each platform
   */
  async syncAll(templateContent?: string): Promise<SyncStatus[]> {
    try {
      // Initialize if needed
      if (!this.initialized) {
        console.debug('Initializing platform service before syncing to all platforms');
        await this.initialize();
      }
      
      // Check if we have any platforms to sync to
      const platforms = Array.from(this.syncers.keys());
      if (platforms.length === 0) {
        console.warn('No platforms available to sync to');
        return [{
          platform: 'unknown' as PlatformType,
          success: false,
          message: 'No platforms available to sync to'
        }];
      }
      
      // Use provided content or cached content
      let content = templateContent;
      if (!content) {
        if (!this.templateContent) {
          console.warn('No template content provided and no cached content available');
          return [{
            platform: 'all' as PlatformType,
            success: false,
            message: 'No template content provided and no cached content available'
          }];
        }
        content = this.templateContent;
        console.debug('Using cached template content for all platforms');
      } else {
        // Update our cached content
        this.templateContent = content;
      }
      
      console.debug(`Syncing template to all platforms (${platforms.join(', ')})`);
      
      // Sync to all platforms
      const results: SyncStatus[] = [];
      const successCount = { success: 0, failed: 0 };
      
      // Process platforms in parallel using Promise.all for better performance
      const syncPromises = platforms.map(platform => 
        this.syncPlatform(platform, content)
          .then(result => {
            if (result.success) {
              successCount.success++;
            } else {
              successCount.failed++;
            }
            return result;
          })
          .catch(error => {
            console.error(`Error syncing to platform ${platform}:`, error);
            successCount.failed++;
            return {
              platform,
              success: false,
              message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
            };
          })
      );
      
      // Wait for all syncs to complete
      const syncResults = await Promise.all(syncPromises);
      results.push(...syncResults);
      
      console.debug(`Sync to all platforms complete: ${successCount.success} succeeded, ${successCount.failed} failed`);
      
      return results;
    } catch (error) {
      console.error('Unexpected error syncing to all platforms:', 
        error instanceof Error ? error.message : String(error));
      return [{
        platform: 'all' as PlatformType,
        success: false,
        message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
      }];
    }
  }

  /**
   * Sync template content to a specific platform
   * @param platform The platform to sync to (e.g., 'windsurf', 'claude-web', 'claude-code')
   * @param templateContent Optional template content to sync (uses cached content if not provided)
   * @returns The status of the sync operation
   */
  async syncPlatform(platform: PlatformType, templateContent?: string): Promise<SyncStatus> {
    // Validate the platform parameter
    if (!platform || typeof platform !== 'string') {
      return {
        platform: platform || 'unknown' as PlatformType,
        success: false,
        message: 'Invalid platform: Platform must be a non-empty string'
      };
    }
    
    try {
      // Initialize if needed
      if (!this.initialized) {
        console.debug(`Initializing platform service before syncing to ${platform}`);
        await this.initialize();
      }
      
      // Get the syncer for the platform
      const syncer = this.syncers.get(platform);
      
      if (!syncer) {
        const supportedPlatforms = Array.from(this.syncers.keys()).join(', ');
        return {
          platform,
          success: false,
          message: `Platform not supported: ${platform}. Supported platforms: ${supportedPlatforms}`
        };
      }
      
      // Use provided content or cached content
      let content = templateContent;
      if (!content) {
        if (!this.templateContent) {
          console.warn(`No template content provided for platform ${platform} and no cached content available`);
          return {
            platform,
            success: false,
            message: 'No template content provided and no cached content available'
          };
        }
        content = this.templateContent;
        console.debug(`Using cached template content for platform ${platform}`);
      } else {
        // Update our cached content
        this.templateContent = content;
      }
      
      console.debug(`Syncing template to platform: ${platform}`);
      
      // Sync to the platform with error handling
      try {
        return await syncer.sync(content);
      } catch (syncError) {
        console.error(`Error syncing to platform ${platform}:`, 
          syncError instanceof Error ? syncError.message : String(syncError));
        return {
          platform,
          success: false,
          message: `Sync error: ${syncError instanceof Error ? syncError.message : String(syncError)}`
        };
      }
    } catch (error) {
      console.error(`Unexpected error syncing to platform ${platform}:`, 
        error instanceof Error ? error.message : String(error));
      return {
        platform,
        success: false,
        message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get all available platforms
   */
  getPlatforms(): PlatformType[] {
    return Array.from(this.syncers.keys());
  }
}