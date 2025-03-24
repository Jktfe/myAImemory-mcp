/**
 * TemplateService interface for the memory template management
 */
import { MemoryTemplate, TemplateSection } from '../../types.js';

export interface TemplateService {
  /**
   * Initialize the template service
   */
  initialize(): Promise<void>;
  
  /**
   * Get the full template
   */
  getTemplate(): MemoryTemplate;
  
  /**
   * Get a specific section from the template
   */
  getSection(sectionName: string): TemplateSection | null;
  
  /**
   * Update a specific section in the template
   */
  updateSection(sectionName: string, content: string): Promise<boolean>;
  
  /**
   * Update the entire template
   */
  updateTemplate(content: string): Promise<boolean>;
  
  /**
   * List available presets
   */
  listPresets(): Promise<string[]>;
  
  /**
   * Load a preset
   */
  loadPreset(presetName: string): Promise<boolean>;
  
  /**
   * Create a new preset from the current template
   */
  createPreset(presetName: string): Promise<boolean>;
}