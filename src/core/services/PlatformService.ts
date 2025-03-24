/**
 * PlatformService interface for platform synchronization
 */
import { PlatformType, SyncStatus } from '../../types.js';

export interface PlatformService {
  /**
   * Initialize the platform service
   */
  initialize(): Promise<void>;
  
  /**
   * Sync template content to all platforms
   */
  syncAll(templateContent?: string): Promise<SyncStatus[]>;
  
  /**
   * Sync template content to a specific platform
   */
  syncPlatform(platform: PlatformType, templateContent?: string): Promise<SyncStatus>;
  
  /**
   * Get all available platforms
   */
  getPlatforms(): PlatformType[];
}