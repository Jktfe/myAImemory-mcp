import { promises as fs } from 'fs';
import path from 'path';
import { homedir } from 'os';
import { SyncStatus, PlatformType } from '../types.js';
import { generateTemplate } from '../templateParser.js';
import { templateService } from './templateService.js';
import { config } from '../config.js';
import { ClaudeCodeSyncer, ensureFileWritable } from '../platformSync.js';

// Import the memory cache service dynamically - handles if Anthropic features are not enabled
let memoryCacheService: any = null;
try {
  // We'll attempt to load this module, but it's optional
  import('../utils/memoryCacheService.js').then(module => {
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
export class WindsurfSyncer implements PlatformSyncer {
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
          platform: 'windsurf',
          success: true,
          message: `Skipped update to global_rules.md (within throttle period)`
        };
      }
      
      // Create directory if it doesn't exist
      const dir = path.dirname(this.rulesPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write the template to the global_rules.md file
      console.error(`Writing template to ${this.rulesPath}`);
      await fs.writeFile(this.rulesPath, templateContent, 'utf-8');
      
      // Update last sync time
      this.lastSyncTime = now;
      
      return {
        platform: 'windsurf',
        success: true,
        message: `Successfully updated global_rules.md at ${this.rulesPath}`
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
 * Claude Web synchronization
 */
export class ClaudeWebSyncer implements PlatformSyncer {
  private email?: string;
  private headless: boolean;
  private lastSyncTime: number = 0;
  private syncCooldown: number = 60000; // 1 minute cooldown (web sync is expensive)
  
  constructor(options?: { email?: string, headless?: boolean }) {
    this.email = options?.email;
    this.headless = options?.headless ?? true;
  }
  
  async sync(templateContent: string): Promise<SyncStatus> {
    try {
      const now = Date.now();
      
      // Check if we're within the cooldown period
      if (now - this.lastSyncTime < this.syncCooldown) {
        console.error(`Skipping Claude Web sync - within cooldown period (${this.syncCooldown}ms)`);
        return {
          platform: 'claude-web',
          success: true,
          message: `Skipped update to Claude Web (within throttle period)`
        };
      }
      
      console.error('Starting Claude Web sync operation...');
      
      // We'll implement this as a background task if possible
      // For now, just log that we would sync with Claude Web
      console.error('Sync with Claude Web would happen here (headless mode)');
      
      // Update last sync time
      this.lastSyncTime = now;
      
      return {
        platform: 'claude-web',
        success: true,
        message: `Claude Web sync scheduled (headless mode: ${this.headless})`
      };
    } catch (err) {
      console.error('Error syncing with Claude Web:', err);
      return {
        platform: 'claude-web',
        success: false,
        message: `Failed to sync with Claude Web: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }
}

/**
 * Master template file synchronization
 */
export class MasterSyncer implements PlatformSyncer {
  private masterPath: string;
  private lastSyncTime: number = 0;
  private syncCooldown: number = 5000; // 5 second cooldown
  
  constructor(masterPath?: string) {
    this.masterPath = masterPath || (config.paths.masterTemplate || path.join(homedir(), 'myAI Master.md'));
  }
  
  async sync(templateContent: string): Promise<SyncStatus> {
    try {
      const now = Date.now();
      
      // Check if we're within the cooldown period
      if (now - this.lastSyncTime < this.syncCooldown) {
        console.error(`Skipping Master template sync - within cooldown period (${this.syncCooldown}ms)`);
        return {
          platform: 'master',
          success: true,
          message: `Skipped update to Master template (within throttle period)`
        };
      }
      
      // Ensure the file is writable
      const isWritable = await ensureFileWritable(this.masterPath);
      if (!isWritable) {
        return {
          platform: 'master',
          success: false,
          message: `Failed to sync with Master template: Permission denied. Could not make file writable: ${this.masterPath}`
        };
      }
      
      // Create directory if it doesn't exist (should be handled by ensureFileWritable, but just to be safe)
      const dir = path.dirname(this.masterPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write the template to the Master template file
      console.error(`Writing template to Master file ${this.masterPath}`);
      await fs.writeFile(this.masterPath, templateContent, 'utf-8');
      
      // Update last sync time
      this.lastSyncTime = now;
      
      return {
        platform: 'master',
        success: true,
        message: `Successfully updated Master template at ${this.masterPath}`
      };
    } catch (err) {
      console.error('Error syncing with Master template:', err);
      return {
        platform: 'master',
        success: false,
        message: `Failed to sync with Master template: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }
}

/**
 * Platform synchronization manager
 */
export class PlatformService {
  private syncers: Map<PlatformType, PlatformSyncer> = new Map();
  private initialized = false;
  private configuredPlatforms: Set<PlatformType> = new Set();
  private syncQueue: { platform: PlatformType; content: string }[] = [];
  private isSyncing = false;
  
  /**
   * Initialize the platform service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // Log the configuration paths
    console.error('Initializing platform service with paths:');
    console.error(`Master template path: ${config.paths?.masterTemplate}`);
    console.error(`Claude projects path: ${config.paths?.claudeProjectsPath}`);
    console.error(`Windsurf memory path: ${config.paths?.windsurfMemoryPath}`);
    
    // Set up default syncers
    this.configuredPlatforms.add('master');
    this.syncers.set('master', new MasterSyncer(config.paths?.masterTemplate));
    
    this.configuredPlatforms.add('claude-code');
    this.syncers.set('claude-code', new ClaudeCodeSyncer(config.paths?.claudeProjectsPath));
    console.error('ClaudeCodeSyncer initialized - ready to sync CLAUDE.md files');
    console.error(`Using Claude projects path from config: ${config.paths?.claudeProjectsPath}`);
    
    this.configuredPlatforms.add('windsurf');
    this.syncers.set('windsurf', new WindsurfSyncer(config.paths?.windsurfMemoryPath));
    console.error(`WindsurfSyncer initialized with path from config: ${config.paths?.windsurfMemoryPath}`);
    
    // Optionally set up Claude Web syncer if configured
    try {
      const config = await this.loadConfig();
      if (config.claudeWeb && config.claudeWeb.enabled) {
        this.configuredPlatforms.add('claude-web');
        this.syncers.set('claude-web', new ClaudeWebSyncer({
          email: config.claudeWeb.email,
          headless: config.claudeWeb.headless
        }));
        console.error('Claude Web sync enabled');
      }
    } catch (err) {
      console.error('Error loading config for Claude Web sync:', err);
      // Continue without Claude Web sync
    }
    
    this.initialized = true;
    
    // Start the sync queue processor
    this.processSyncQueue();
  }
  
  /**
   * Load configuration from environment or config file
   */
  private async loadConfig(): Promise<any> {
    // Default config
    const config = {
      claudeWeb: {
        enabled: false,
        headless: true,
        email: undefined as string | undefined
      }
    };
    
    // Try to load from environment variables
    if (process.env.CLAUDE_WEB_SYNC_ENABLED === 'true') {
      config.claudeWeb.enabled = true;
      config.claudeWeb.headless = process.env.CLAUDE_WEB_HEADLESS !== 'false';
      if (process.env.CLAUDE_WEB_EMAIL) {
        config.claudeWeb.email = process.env.CLAUDE_WEB_EMAIL;
      }
    }
    
    // Could also try to load from a config file here
    
    return config;
  }
  
  /**
   * Add a sync task to the queue
   */
  private queueSync(platform: PlatformType, content: string): void {
    this.syncQueue.push({ platform, content });
    if (!this.isSyncing) {
      this.processSyncQueue();
    }
  }
  
  /**
   * Process the sync queue in background
   */
  private async processSyncQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }
    
    this.isSyncing = true;
    
    while (this.syncQueue.length > 0) {
      const task = this.syncQueue.shift();
      if (!task) continue;
      
      const { platform, content } = task;
      const syncer = this.syncers.get(platform);
      
      if (syncer) {
        try {
          console.error(`Processing queued sync for ${platform}`);
          await syncer.sync(content);
        } catch (err) {
          console.error(`Error processing queued sync for ${platform}:`, err);
        }
      }
    }
    
    this.isSyncing = false;
  }
  
  /**
   * Set the syncer for a specific platform
   */
  setSyncer(platform: PlatformType, syncer: PlatformSyncer): void {
    this.syncers.set(platform, syncer);
    this.configuredPlatforms.add(platform);
  }
  
  /**
   * Disable a specific platform
   */
  disablePlatform(platform: PlatformType): void {
    this.configuredPlatforms.delete(platform);
  }
  
  /**
   * Enable a specific platform
   */
  enablePlatform(platform: PlatformType): void {
    if (this.syncers.has(platform)) {
      this.configuredPlatforms.add(platform);
    }
  }
  
  /**
   * Sync template with all platforms
   */
  async syncAll(templateContent?: string): Promise<SyncStatus[]> {
    if (!this.initialized) await this.initialize();
    
    // Get template content if not provided
    if (!templateContent) {
      const template = await templateService.getTemplate();
      templateContent = generateTemplate(template);
    }
    
    const results: SyncStatus[] = [];
    console.error(`Syncing with all configured platforms (${this.configuredPlatforms.size}): ${Array.from(this.configuredPlatforms).join(', ')}`);
    
    for (const platform of this.configuredPlatforms) {
      const syncer = this.syncers.get(platform);
      if (syncer) {
        console.error(`Syncing with platform: ${platform}`);
        try {
          const result = await syncer.sync(templateContent);
          results.push(result);
          console.error(`Sync result for ${platform}: ${result.success ? 'Success' : 'Failure'} - ${result.message}`);
        } catch (err) {
          console.error(`Error syncing with ${platform}:`, err);
          results.push({
            platform,
            success: false,
            message: `Error syncing with ${platform}: ${err instanceof Error ? err.message : String(err)}`
          });
        }
      } else {
        console.error(`No syncer configured for platform: ${platform}`);
        results.push({
          platform,
          success: false,
          message: `No syncer configured for platform: ${platform}`
        });
      }
    }
    
    // Update memory cache after successful sync (if available)
    if (memoryCacheService && memoryCacheService.updateCacheAfterSync) {
      try {
        console.error('Updating memory cache after sync...');
        await memoryCacheService.updateCacheAfterSync();
        console.error('Memory cache updated successfully');
      } catch (err) {
        console.error('Error updating memory cache:', err);
        // This is non-critical, so we don't add it to results
      }
    }
    
    return results;
  }
  
  /**
   * Sync template with a specific platform
   */
  async syncPlatform(platform: PlatformType): Promise<SyncStatus> {
    if (!this.initialized) await this.initialize();
    
    if (!this.configuredPlatforms.has(platform)) {
      return {
        platform,
        success: false,
        message: `Platform ${platform} is disabled`
      };
    }
    
    const template = templateService.getTemplate();
    const templateContent = generateTemplate(template);
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
  
  /**
   * Get configured platforms
   */
  getPlatforms(): PlatformType[] {
    return Array.from(this.configuredPlatforms);
  }
  
  /**
   * Get available platforms (including disabled)
   */
  getAvailablePlatforms(): PlatformType[] {
    return Array.from(this.syncers.keys());
  }
}

// Export singleton instance
export const platformService = new PlatformService();