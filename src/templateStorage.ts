import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { MemoryTemplate, TemplateSection, Preset } from './types.js';
import { parseTemplate, generateTemplate, validateTemplate } from './templateParser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const TEMPLATE_FILE = path.join(DATA_DIR, 'template.md');
const PRESETS_DIR = path.join(DATA_DIR, 'presets');

/**
 * Class that handles template storage, retrieval, and manipulation
 */
export class TemplateStorage {
  private template: MemoryTemplate;
  
  constructor() {
    this.template = { sections: [] };
  }
  
  /**
   * Initialize storage, creating necessary directories and loading template
   */
  async initialize(): Promise<void> {
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
                { key: 'Location', value: 'Default Location' }
              ]
            },
            {
              title: 'General Response Style',
              description: 'Use this in every response',
              items: [
                { key: 'Style', value: 'Concise and friendly' }
              ]
            }
          ]
        };
        
        await this.saveTemplate();
      }
      
      // Create default presets if they don't exist
      const defaultPresets = ['dave', 'abi'];
      for (const presetName of defaultPresets) {
        const presetPath = path.join(PRESETS_DIR, `${presetName}.json`);
        try {
          await fs.access(presetPath);
        } catch (err) {
          // Preset doesn't exist, create it
          await this.createDefaultPreset(presetName);
        }
      }
    } catch (err) {
      console.error('Failed to initialize template storage:', err);
      throw err;
    }
  }
  
  /**
   * Load the template from storage
   */
  async loadTemplate(): Promise<MemoryTemplate> {
    const templateContent = await fs.readFile(TEMPLATE_FILE, 'utf-8');
    this.template = parseTemplate(templateContent);
    return this.template;
  }
  
  /**
   * Save the current template to storage
   */
  async saveTemplate(): Promise<void> {
    const templateContent = generateTemplate(this.template);
    await fs.writeFile(TEMPLATE_FILE, templateContent, 'utf-8');
  }
  
  /**
   * Get the full template
   */
  getTemplate(): MemoryTemplate {
    return this.template;
  }
  
  /**
   * Get a specific section from the template
   */
  getSection(sectionName: string): TemplateSection | null {
    const section = this.template.sections.find(
      s => s.title.toLowerCase() === sectionName.toLowerCase()
    );
    return section || null;
  }
  
  /**
   * Update a specific section in the template
   */
  async updateSection(sectionName: string, content: string): Promise<boolean> {
    try {
      // Parse the content into a section
      const tempTemplate = parseTemplate(`# myAI Memory\n\n# ${sectionName}\n${content}`);
      
      if (tempTemplate.sections.length === 0) {
        return false;
      }
      
      const newSection = tempTemplate.sections[0];
      
      // Find the existing section index
      const sectionIndex = this.template.sections.findIndex(
        s => s.title.toLowerCase() === sectionName.toLowerCase()
      );
      
      if (sectionIndex >= 0) {
        // Update existing section
        this.template.sections[sectionIndex] = newSection;
      } else {
        // Add new section
        this.template.sections.push(newSection);
      }
      
      // Save the updated template
      await this.saveTemplate();
      return true;
    } catch (err) {
      console.error(`Failed to update section ${sectionName}:`, err);
      return false;
    }
  }
  
  /**
   * Update the entire template
   */
  async updateTemplate(templateContent: string): Promise<boolean> {
    try {
      const newTemplate = parseTemplate(templateContent);
      
      if (!validateTemplate(newTemplate)) {
        return false;
      }
      
      this.template = newTemplate;
      await this.saveTemplate();
      return true;
    } catch (err) {
      console.error('Failed to update template:', err);
      return false;
    }
  }
  
  /**
   * Load a preset profile
   */
  async loadPreset(presetName: string): Promise<boolean> {
    try {
      const presetPath = path.join(PRESETS_DIR, `${presetName.toLowerCase()}.json`);
      const presetContent = await fs.readFile(presetPath, 'utf-8');
      const preset: Preset = JSON.parse(presetContent);
      
      // Keep the same sections structure but update the content
      this.template.sections = preset.sections;
      
      await this.saveTemplate();
      return true;
    } catch (err) {
      console.error(`Failed to load preset ${presetName}:`, err);
      return false;
    }
  }
  
  /**
   * List available presets
   */
  async listPresets(): Promise<string[]> {
    const presetFiles = await fs.readdir(PRESETS_DIR);
    return presetFiles
      .filter(file => file.endsWith('.json'))
      .map(file => path.basename(file, '.json'));
  }
  
  /**
   * Create a default preset
   */
  private async createDefaultPreset(presetName: string): Promise<void> {
    let preset: Preset;
    
    if (presetName === 'dave') {
      preset = {
        name: 'dave',
        sections: [
          {
            title: 'User Information',
            description: 'Use this information if you need to reference them directly',
            items: [
              { key: 'Name', value: 'Dave' },
              { key: 'Age', value: '30' },
              { key: 'Location', value: 'Birmingham' },
              { key: 'Likes', value: 'Football, Drums, Golf' }
            ]
          },
          {
            title: 'General Response Style',
            description: 'Use this in every response',
            items: [
              { key: 'Use UK English Spellings', value: 'true' },
              { key: 'Use £ (GBP) as the default currency', value: 'if you need to use conversions put them in brackets i.e. £1.10 ($1.80)' },
              { key: 'You can be very concise', value: 'true' },
              { key: 'Always double check references and provide links to sources', value: 'true' }
            ]
          },
          {
            title: 'Coding Preferences',
            description: 'General Preferences when responding to coding questions',
            items: [
              { key: 'Provide visuals to support logic explanations', value: 'true' },
              { key: 'Maintain and update a "Project Variables" document', value: 'so that it is easy to track what variables are being used in the projects' }
            ]
          }
        ]
      };
    } else if (presetName === 'abi') {
      preset = {
        name: 'abi',
        sections: [
          {
            title: 'User Information',
            description: 'Use this information if you need to reference them directly',
            items: [
              { key: 'Name', value: 'Abi Thomas' },
              { key: 'Age', value: '27' },
              { key: 'Platforms', value: 'Android Phone, iPad, Windows work laptop' }
            ]
          },
          {
            title: 'General Response Style',
            description: 'Use this in every response',
            items: [
              { key: 'Respond in English or Welsh', value: 'true' },
              { key: 'Give examples using metaphors', value: 'true' }
            ]
          },
          {
            title: 'Cooking Preferences',
            description: 'General Preferences when responding to cooking questions',
            items: [
              { key: 'Use Celsius', value: 'true' },
              { key: 'Don\'t bother with seconds', value: 'give responses with minutes and hours only' }
            ]
          }
        ]
      };
    } else {
      // Generic preset
      preset = {
        name: presetName,
        sections: [
          {
            title: 'User Information',
            description: 'Use this information if you need to reference them directly',
            items: [
              { key: 'Name', value: 'Default User' },
              { key: 'Location', value: 'Default Location' }
            ]
          },
          {
            title: 'General Response Style',
            description: 'Use this in every response',
            items: [
              { key: 'Style', value: 'Concise and friendly' }
            ]
          }
        ]
      };
    }
    
    const presetPath = path.join(PRESETS_DIR, `${presetName.toLowerCase()}.json`);
    await fs.writeFile(presetPath, JSON.stringify(preset, null, 2), 'utf-8');
  }
}