/**
 * Custom implementation of TemplateService
 */
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MemoryTemplate, TemplateSection } from '../../types.js';
import { parseTemplate, generateTemplate, validateTemplate } from '../../templateParser.js';
import { TemplateService } from './TemplateService.js';

// Determine file paths
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');
const TEMPLATE_FILE = path.join(DATA_DIR, 'template.md');
const PRESETS_DIR = path.join(DATA_DIR, 'presets');

// Cache configuration
const CACHE_EXPIRATION_MS = 60 * 1000; // 1 minute cache

/**
 * Custom implementation of the TemplateService
 */
export class CustomTemplateService implements TemplateService {
  private template: MemoryTemplate = { sections: [] };
  private templateCache: {
    data: MemoryTemplate;
    timestamp: number;
  } | null = null;
  private initialized = false;

  /**
   * Initialize the template service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create data directories if they don't exist
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.mkdir(PRESETS_DIR, { recursive: true });
      
      // Try to load existing template
      try {
        await this.loadTemplate();
      } catch (err) {
        // If no template exists, create a default one
        this.template = {
          sections: [
            {
              title: 'User Information',
              description: 'Use this information if you need to reference them directly',
              items: [
                { key: 'Name', value: 'Default User' },
              ]
            }
          ]
        };
        
        // Save the default template
        await this.saveTemplate();
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize template service:', error);
      throw error;
    }
  }

  /**
   * Get the full template
   */
  getTemplate(): MemoryTemplate {
    // Check if we have a valid cache
    if (this.templateCache && 
        Date.now() - this.templateCache.timestamp < CACHE_EXPIRATION_MS) {
      return this.templateCache.data;
    }
    
    // Return the current template
    return this.template;
  }

  /**
   * Get a specific section from the template
   */
  getSection(sectionName: string): TemplateSection | null {
    const section = this.template.sections.find(s => 
      s.title.toLowerCase() === sectionName.toLowerCase());
    
    return section || null;
  }

  /**
   * Update a specific section in the template
   * @param sectionName The name of the section to update
   * @param content The new content for the section
   * @returns true if the update was successful, false otherwise
   */
  async updateSection(sectionName: string, content: string): Promise<boolean> {
    // Validate inputs
    if (!sectionName || typeof sectionName !== 'string') {
      console.error('Section name must be a non-empty string');
      return false;
    }
    
    if (typeof content !== 'string') {
      console.error('Section content must be a string');
      return false;
    }
    
    try {
      // Find the section
      const sectionIndex = this.template.sections.findIndex(s => 
        s.title.toLowerCase() === sectionName.toLowerCase());
      
      // Create section content for parsing
      const sectionContent = `# ${sectionName}\n${content}`;
      
      // Parse the new section content
      let parsedSection: TemplateSection;
      try {
        const result = parseTemplate(sectionContent);
        
        if (!result.sections || result.sections.length === 0) {
          console.error(`Failed to parse section content for ${sectionName}`);
          return false;
        }
        
        parsedSection = result.sections[0];
        
        // Verify the section was parsed correctly
        if (!parsedSection || parsedSection.title !== sectionName) {
          console.error(`Parsed section title (${parsedSection?.title}) doesn't match expected (${sectionName})`);
          return false;
        }
      } catch (parseError) {
        console.error(`Error parsing section ${sectionName}:`, 
          parseError instanceof Error ? parseError.message : String(parseError));
        return false;
      }
      
      // Update or add the section
      if (sectionIndex >= 0) {
        console.debug(`Replacing existing section: ${sectionName}`);
        this.template.sections[sectionIndex] = parsedSection;
      } else {
        console.debug(`Adding new section: ${sectionName}`);
        this.template.sections.push(parsedSection);
      }
      
      try {
        // Save the updated template
        await this.saveTemplate();
        
        // Log success based on whether we updated or added
        if (sectionIndex >= 0) {
          console.debug(`Successfully updated section: ${sectionName}`);
        } else {
          console.debug(`Successfully added new section: ${sectionName}`);
        }
        
        return true;
      } catch (saveError) {
        console.error(`Error saving template after updating section ${sectionName}:`, 
          saveError instanceof Error ? saveError.message : String(saveError));
        return false;
      }
    } catch (error) {
      console.error(`Unexpected error updating section ${sectionName}:`, 
        error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Update the entire template
   * @param content The markdown content of the entire template
   * @returns true if the update was successful, false otherwise
   */
  async updateTemplate(content: string): Promise<boolean> {
    if (!content || typeof content !== 'string') {
      console.error('Template content must be a non-empty string');
      return false;
    }
    
    try {
      // Parse and validate the template in a separate try block for specific error handling
      let parsedTemplate: MemoryTemplate;
      
      try {
        // Parse the template from markdown to validate and convert it
        parsedTemplate = parseTemplate(content);
        
        // Validate the template structure
        const validationResult = validateTemplate(parsedTemplate);
        
        if (!validationResult) {
          console.error('Template validation failed: invalid structure');
          return false;
        }
      } catch (parseError) {
        console.error('Template parsing or validation failed:', 
          parseError instanceof Error ? parseError.message : String(parseError));
        return false;
      }
      
      // If we got here, the template is valid, so update our instance
      this.template = parsedTemplate;
      
      try {
        // Save the template
        await this.saveTemplate();
        console.debug('Template saved successfully');
        
        // Update the cache
        this.templateCache = {
          data: this.template,
          timestamp: Date.now()
        };
        
        return true;
      } catch (saveError) {
        console.error('Error saving template:', 
          saveError instanceof Error ? saveError.message : String(saveError));
        return false;
      }
    } catch (error) {
      console.error('Unexpected error updating template:', 
        error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * List available presets
   */
  async listPresets(): Promise<string[]> {
    try {
      const presetFiles = await fs.readdir(PRESETS_DIR);
      
      // Filter for JSON files and remove extension
      return presetFiles
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      console.error('Error listing presets:', error);
      return [];
    }
  }

  /**
   * Load a preset
   */
  async loadPreset(presetName: string): Promise<boolean> {
    try {
      const presetPath = path.join(PRESETS_DIR, `${presetName}.json`);
      
      // Read the preset file
      const presetData = await fs.readFile(presetPath, 'utf8');
      
      // Parse the preset
      const preset = JSON.parse(presetData);
      
      // Update the template
      this.template = preset;
      
      // Save the template
      await this.saveTemplate();
      
      return true;
    } catch (error) {
      console.error(`Error loading preset ${presetName}:`, error);
      return false;
    }
  }

  /**
   * Create a new preset from the current template
   */
  async createPreset(presetName: string): Promise<boolean> {
    try {
      const presetPath = path.join(PRESETS_DIR, `${presetName}.json`);
      
      // Save the current template as a preset
      await fs.writeFile(presetPath, JSON.stringify(this.template, null, 2), 'utf8');
      
      return true;
    } catch (error) {
      console.error(`Error creating preset ${presetName}:`, error);
      return false;
    }
  }

  /**
   * Load the template from file
   */
  private async loadTemplate(): Promise<void> {
    try {
      const templateContent = await fs.readFile(TEMPLATE_FILE, 'utf8');
      
      // Parse the template
      this.template = parseTemplate(templateContent);
      
      // Update the cache
      this.templateCache = {
        data: this.template,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error loading template:', error);
      throw error;
    }
  }

  /**
   * Save the template to file
   */
  private async saveTemplate(): Promise<void> {
    try {
      // Generate markdown from the template
      const templateContent = generateTemplate(this.template);
      
      // Save the template
      await fs.writeFile(TEMPLATE_FILE, templateContent, 'utf8');
      
      // Update the cache
      this.templateCache = {
        data: this.template,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  }
}