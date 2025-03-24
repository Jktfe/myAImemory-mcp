/**
 * ServiceFactory - Creates and manages service instances
 */
import { TemplateService } from './TemplateService.js';
import { PlatformService } from './PlatformService.js';
import { CustomTemplateService } from './CustomTemplateService.js';
import { CustomPlatformService } from './CustomPlatformService.js';
import { LegacyTemplateServiceAdapter, LegacyPlatformServiceAdapter } from './LegacyServiceAdapters.js';
import { config } from '../../config.js';

/**
 * Implementation type for service instances
 */
export enum ImplementationType {
  LEGACY = 'legacy',
  CUSTOM = 'custom'
}

/**
 * Factory for creating and accessing services
 */
export class ServiceFactory {
  private static templateService?: TemplateService;
  private static platformService?: PlatformService;
  // Default implementation type from configuration
  private static implementationType: ImplementationType = 
    (config.services?.implementationType === 'legacy') 
      ? ImplementationType.LEGACY 
      : ImplementationType.CUSTOM;
  
  /**
   * Set the implementation type for services
   */
  static setImplementationType(type: ImplementationType): void {
    this.implementationType = type;
    // Clear existing instances to ensure they'll be recreated with the new type
    this.templateService = undefined;
    this.platformService = undefined;
  }
  
  /**
   * Get the current implementation type
   */
  static getImplementationType(): ImplementationType {
    return this.implementationType;
  }
  
  /**
   * Get the current implementation type as a string for display purposes
   */
  static getImplementationTypeString(): string {
    return this.implementationType === ImplementationType.LEGACY ? 'Legacy' : 'Custom';
  }
  
  /**
   * Get the template service instance
   * @throws Error if service creation fails
   */
  static getTemplateService(): TemplateService {
    if (!this.templateService) {
      try {
        if (this.implementationType === ImplementationType.LEGACY) {
          console.debug('Creating legacy template service adapter');
          this.templateService = new LegacyTemplateServiceAdapter();
        } else {
          console.debug('Creating custom template service');
          this.templateService = new CustomTemplateService();
        }
      } catch (error) {
        const errorType = this.implementationType === ImplementationType.LEGACY ? 'Legacy' : 'Custom';
        const errorMsg = `Failed to create ${errorType} TemplateService: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        
        // If one implementation fails, try to fall back to the other
        try {
          if (this.implementationType === ImplementationType.LEGACY) {
            console.warn('Attempting to fall back to custom template service');
            this.templateService = new CustomTemplateService();
          } else {
            console.warn('Attempting to fall back to legacy template service adapter');
            this.templateService = new LegacyTemplateServiceAdapter();
          }
        } catch (fallbackError) {
          // Both implementations failed, throw a comprehensive error
          throw new Error(
            `Failed to create template service with either implementation type.` +
            `\nOriginal error (${errorType}): ${error instanceof Error ? error.message : String(error)}` +
            `\nFallback error: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}` +
            `\nPlease check your configuration and dependencies.`
          );
        }
      }
    }
    
    return this.templateService;
  }
  
  /**
   * Get the platform service instance
   * @throws Error if service creation fails
   */
  static getPlatformService(): PlatformService {
    if (!this.platformService) {
      try {
        if (this.implementationType === ImplementationType.LEGACY) {
          console.debug('Creating legacy platform service adapter');
          this.platformService = new LegacyPlatformServiceAdapter();
        } else {
          console.debug('Creating custom platform service');
          this.platformService = new CustomPlatformService();
        }
      } catch (error) {
        const errorType = this.implementationType === ImplementationType.LEGACY ? 'Legacy' : 'Custom';
        const errorMsg = `Failed to create ${errorType} PlatformService: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        
        // If one implementation fails, try to fall back to the other
        try {
          if (this.implementationType === ImplementationType.LEGACY) {
            console.warn('Attempting to fall back to custom platform service');
            this.platformService = new CustomPlatformService();
          } else {
            console.warn('Attempting to fall back to legacy platform service adapter');
            this.platformService = new LegacyPlatformServiceAdapter();
          }
        } catch (fallbackError) {
          // Both implementations failed, throw a comprehensive error
          throw new Error(
            `Failed to create platform service with either implementation type.` +
            `\nOriginal error (${errorType}): ${error instanceof Error ? error.message : String(error)}` +
            `\nFallback error: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}` +
            `\nPlease check your configuration and dependencies.`
          );
        }
      }
    }
    
    return this.platformService;
  }
  
  /**
   * Initialize all services
   * @throws Error if initialization fails
   */
  static async initializeServices(): Promise<void> {
    try {
      // Get service instances (may throw errors if creation fails)
      const templateService = this.getTemplateService();
      const platformService = this.getPlatformService();
      
      // Initialize services with proper error handling
      try {
        console.debug(`Initializing template service (${this.getImplementationTypeString()})`);
        await templateService.initialize();
      } catch (error) {
        throw new Error(
          `Failed to initialize ${this.getImplementationTypeString()} template service: ` +
          `${error instanceof Error ? error.message : String(error)}`
        );
      }
      
      try {
        console.debug(`Initializing platform service (${this.getImplementationTypeString()})`);
        await platformService.initialize();
      } catch (error) {
        throw new Error(
          `Failed to initialize ${this.getImplementationTypeString()} platform service: ` +
          `${error instanceof Error ? error.message : String(error)}`
        );
      }
      
      console.debug('All services initialized successfully');
    } catch (error) {
      console.error(`Service initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Reset factory to default state using configuration
   * Useful when restarting services or during tests
   */
  static resetToConfigDefaults(): void {
    // Get implementation type from config
    this.implementationType = 
      (config.services?.implementationType === 'legacy') 
        ? ImplementationType.LEGACY 
        : ImplementationType.CUSTOM;
        
    // Reset service instances
    this.templateService = undefined;
    this.platformService = undefined;
  }
}