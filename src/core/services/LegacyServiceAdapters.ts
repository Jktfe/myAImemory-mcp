/**
 * LegacyServiceAdapters - Adapters for legacy services
 * Adapts legacy service implementations to the new interfaces
 */
import { TemplateService } from './TemplateService.js';
import { PlatformService } from './PlatformService.js';
import { templateService as legacyTemplateService } from '../../services/templateService.js';
import { platformService as legacyPlatformService } from '../../services/platformService.js';
import { MemoryTemplate, TemplateSection, PlatformType, SyncStatus } from '../../types.js';

/**
 * Adapter for legacy template service
 */
export class LegacyTemplateServiceAdapter implements TemplateService {
  private legacyService = legacyTemplateService;
  
  /**
   * Initialize the template service
   */
  async initialize(): Promise<void> {
    await this.legacyService.initialize();
  }
  
  /**
   * Get the template
   */
  getTemplate(): MemoryTemplate {
    return this.legacyService.getTemplate();
  }
  
  /**
   * Get a section by name
   */
  getSection(sectionName: string): TemplateSection | null {
    const section = this.legacyService.getSection(sectionName);
    return section || null; // Convert undefined to null
  }
  
  /**
   * Update a section
   */
  async updateSection(sectionName: string, content: string): Promise<boolean> {
    await this.legacyService.updateSection(sectionName, content);
    return true; // Legacy service doesn't return a boolean, assume success
  }
  
  /**
   * Update the entire template
   */
  async updateTemplate(content: string): Promise<boolean> {
    return await this.legacyService.updateTemplate(content);
  }
  
  /**
   * List available presets
   */
  async listPresets(): Promise<string[]> {
    return await this.legacyService.listPresets();
  }
  
  /**
   * Load a preset
   */
  async loadPreset(presetName: string): Promise<boolean> {
    return await this.legacyService.loadPreset(presetName);
  }
  
  /**
   * Create a preset
   */
  async createPreset(presetName: string): Promise<boolean> {
    return await this.legacyService.createPreset(presetName);
  }
}

/**
 * Adapter for legacy platform service
 */
export class LegacyPlatformServiceAdapter implements PlatformService {
  private legacyService = legacyPlatformService;
  
  /**
   * Initialize the platform service
   */
  async initialize(): Promise<void> {
    await this.legacyService.initialize();
  }
  
  /**
   * Sync all platforms
   */
  async syncAll(templateContent?: string): Promise<SyncStatus[]> {
    // Convert legacy sync results to SyncStatus
    const results = await this.legacyService.syncAll(templateContent);
    return results.map(result => ({
      platform: result.platform as PlatformType,
      success: result.success,
      message: result.message
    }));
  }
  
  /**
   * Sync a specific platform
   */
  async syncPlatform(platform: PlatformType, templateContent?: string): Promise<SyncStatus> {
    // In the legacy service, templateContent isn't a parameter to syncPlatform
    // but we need to implement this interface for compatibility
    const result = await this.legacyService.syncPlatform(platform);
    return {
      platform: result.platform as PlatformType,
      success: result.success,
      message: result.message
    };
  }
  
  /**
   * Get available platforms
   */
  getPlatforms(): PlatformType[] {
    // Convert string array to PlatformType array
    return this.legacyService.getPlatforms() as PlatformType[];
  }
}