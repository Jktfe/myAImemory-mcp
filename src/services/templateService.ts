import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MemoryTemplate, TemplateSection, Preset } from '../types.js';
import { parseTemplate, generateTemplate, validateTemplate } from '../templateParser.js';
import { homedir } from 'os';

// Determine file paths
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const TEMPLATE_FILE = path.join(DATA_DIR, 'template.md');
const PRESETS_DIR = path.join(DATA_DIR, 'presets');

// Cache configuration
const CACHE_EXPIRATION_MS = 60 * 1000; // 1 minute cache

/**
 * Service for managing memory templates
 */
export class TemplateService {
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
      await this.ensureDefaultPresets();
      
      this.initialized = true;
    } catch (err) {
      console.error('Failed to initialize template service:', err);
      throw err;
    }
  }
  
  /**
   * Load the template from storage
   */
  async loadTemplate(): Promise<MemoryTemplate> {
    // Check cache first
    const now = Date.now();
    if (this.templateCache && (now - this.templateCache.timestamp) < CACHE_EXPIRATION_MS) {
      console.error('Using cached template data');
      this.template = this.templateCache.data;
      return this.template;
    }
    
    console.error('Loading template from file');
    const templateContent = await fs.readFile(TEMPLATE_FILE, 'utf-8');
    this.template = parseTemplate(templateContent);
    
    // Update cache
    this.templateCache = {
      data: this.template,
      timestamp: now
    };
    
    return this.template;
  }
  
  /**
   * Save the current template to storage
   */
  async saveTemplate(): Promise<void> {
    const templateContent = generateTemplate(this.template);
    
    // Save to primary data file
    console.error(`Saving template to ${TEMPLATE_FILE}`);
    await fs.writeFile(TEMPLATE_FILE, templateContent, 'utf-8');
    
    // Update cache
    this.templateCache = {
      data: this.template,
      timestamp: Date.now()
    };
    
    // Don't save platform-specific files here; the platformService will handle that
  }
  
  /**
   * Get the full template
   */
  getTemplate(): MemoryTemplate {
    // If we have cached data, use it
    if (this.templateCache && 
        Date.now() - this.templateCache.timestamp < CACHE_EXPIRATION_MS) {
      return this.templateCache.data;
    }
    
    // Otherwise use what we have in memory (it will be loaded during initialize())
    return this.template;
  }
  
  /**
   * Force refresh template from storage (invalidate cache)
   */
  async refreshTemplate(): Promise<MemoryTemplate> {
    // Clear cache
    this.templateCache = null;
    // Reload from file
    return this.loadTemplate();
  }
  
  /**
   * Get a specific section from the template
   */
  getSection(sectionName: string): TemplateSection | undefined {
    // Use template from cache if available
    const template = this.templateCache && 
                     Date.now() - this.templateCache.timestamp < CACHE_EXPIRATION_MS 
                     ? this.templateCache.data 
                     : this.template;
    
    return template.sections.find(
      s => s.title.toLowerCase() === sectionName.toLowerCase()
    );
  }
  
  /**
   * Extract key-value pairs from natural language text
   */
  private extractKeyValuePairsFromText(text: string): { key: string, value: string }[] {
    const items: { key: string, value: string }[] = [];
    
    // Categorize patterns into section types
    const patternCategories = {
      'User Information': [
        // Name patterns
        {
          regex: /my name is\s+(.+?)(?:\.|,|$)/i,
          key: 'Name',
          valueIndex: 1
        },
        {
          regex: /I(?:'m| am) called\s+(.+?)(?:\.|,|$)/i,
          key: 'Name',
          valueIndex: 1
        },
        // Location patterns
        {
          regex: /I live in\s+(.+?)(?:\.|,|$)/i,
          key: 'Location',
          valueIndex: 1
        },
        {
          regex: /I(?:'m| am) from\s+(.+?)(?:\.|,|$)/i,
          key: 'Location',
          valueIndex: 1
        },
        {
          regex: /I(?:'m| am) located in\s+(.+?)(?:\.|,|$)/i,
          key: 'Location',
          valueIndex: 1
        },
        // Work patterns
        {
          regex: /I work (?:at|for)\s+(.+?)(?:\.|,|$)/i,
          key: 'Workplace',
          valueIndex: 1
        },
        {
          regex: /I(?:'m| am) employed (?:at|by)\s+(.+?)(?:\.|,|$)/i,
          key: 'Workplace',
          valueIndex: 1
        },
        // Age patterns
        {
          regex: /I(?:'m| am)\s+(\d+)(?:\s+years old)?(?:\.|,|$)/i,
          key: 'Age',
          valueIndex: 1
        },
        // Interests/Hobbies patterns
        {
          regex: /my hobbies (?:are|include)\s+(.+?)(?:\.|,|$)/i,
          key: 'Hobbies',
          valueIndex: 1
        },
        {
          regex: /I enjoy\s+(.+?)(?:\.|,|$)/i,
          key: 'Interests',
          valueIndex: 1
        },
        // Vehicle patterns
        {
          regex: /I (?:have|own|drive)(?:\s+a|\s+an)?\s+([^,.]+?)(?:\.|,|$)/i,
          key: 'Vehicle',
          valueIndex: 1
        }
      ],
      'General Response Style': [
        // Language patterns
        {
          regex: /(?:use|speak|write in)\s+(.+?)\s+(?:language|English|spelling)(?:\.|,|$)/i,
          key: 'Language',
          valueIndex: 1
        },
        // Style patterns
        {
          regex: /(?:be|respond in a)\s+(.+?)\s+(?:tone|style|way|manner)(?:\.|,|$)/i,
          key: 'Style',
          valueIndex: 1
        },
        // Brevity patterns
        {
          regex: /(?:be|keep it)\s+(concise|brief|short|succinct)(?:\.|,|$)/i,
          key: 'Brevity',
          valueIndex: 1,
          defaultValue: 'true'
        },
        // Format patterns
        {
          regex: /(?:use|format with|include)\s+(.+?)\s+(?:formatting|format|structure)(?:\.|,|$)/i,
          key: 'Format',
          valueIndex: 1
        }
      ],
      'Professional Experience': [
        // Founded patterns
        {
          regex: /I (?:founded|started|created|established)\s+(.+?)(?:\.|,|$)/i,
          key: 'Founded',
          valueIndex: 1
        },
        // Skills patterns
        {
          regex: /my skills include\s+(.+?)(?:\.|,|$)/i,
          key: 'Skills',
          valueIndex: 1
        },
        {
          regex: /I(?:'m| am) skilled (?:in|at)\s+(.+?)(?:\.|,|$)/i,
          key: 'Skills',
          valueIndex: 1
        },
        // Experience patterns
        {
          regex: /I have experience (?:in|with)\s+(.+?)(?:\.|,|$)/i,
          key: 'Experience',
          valueIndex: 1
        }
      ]
    };
    
    // Track which section the content best matches
    type CategoryScore = {
      category: string;
      score: number;
      items: { key: string, value: string }[];
    };
    
    const categoryScores: CategoryScore[] = Object.keys(patternCategories).map(category => ({
      category,
      score: 0,
      items: []
    }));
    
    // Process each category's patterns
    for (const [category, patterns] of Object.entries(patternCategories)) {
      const categoryIndex = categoryScores.findIndex(c => c.category === category);
      
      for (const pattern of patterns) {
        const match = text.match(pattern.regex);
        if (match) {
          // Safe type check for defaultValue property 
          const defaultVal = 'defaultValue' in pattern ? pattern.defaultValue : '';
          const value = match[pattern.valueIndex]?.trim() || defaultVal || '';
          if (value) {
            categoryScores[categoryIndex].items.push({ key: pattern.key, value });
            categoryScores[categoryIndex].score += 1;
          }
        }
      }
    }
    
    // Special case patterns
    
    // Process combined patterns (like "I work at and founded X")
    const workFoundedMatch = text.match(/I work at and founded\s+(.+?)(?:\.|,|$)/i);
    if (workFoundedMatch) {
      const company = workFoundedMatch[1].trim();
      const userInfoIdx = categoryScores.findIndex(c => c.category === 'User Information');
      const profExpIdx = categoryScores.findIndex(c => c.category === 'Professional Experience');
      
      categoryScores[userInfoIdx].items.push({ key: 'Workplace', value: company });
      categoryScores[userInfoIdx].score += 1;
      
      categoryScores[profExpIdx].items.push({ key: 'Founded', value: company });
      categoryScores[profExpIdx].score += 1;
    }
    
    // Cars with list handling
    const carsMatch = text.match(/I have\s+(\d+)\s+cars?(?:,|:)?\s+(.+?)(?:\.|\s+and\s+|$)/i) || 
                      text.match(/I own\s+(\d+)\s+cars?(?:,|:)?\s+(.+?)(?:\.|\s+and\s+|$)/i);
    
    if (carsMatch) {
      let carDetails = carsMatch[2].trim();
      
      // Specific car matches - look for specific car models
      const carModels = text.match(/(?:a|an)\s+([\w\s\.]+?(?:Sport|Style|SUV|Sedan|Coupe|EV|Electric|Hybrid))/gi);
      if (carModels && carModels.length > 0) {
        // Use the extracted specific models instead
        carDetails = carModels.map(m => m.replace(/^a\s+|^an\s+/i, '')).join(' and ');
      }
      
      const userInfoIdx = categoryScores.findIndex(c => c.category === 'User Information');
      categoryScores[userInfoIdx].items.push({ key: 'Cars', value: carDetails });
      categoryScores[userInfoIdx].score += 1;
    } else {
      // If no explicit "I have X cars" pattern found, try just finding car models
      const specificCarPattern = /(?:a|an)\s+([\w\s\.]+?(?:Sport|Style|SUV|Sedan|Coupe|EV|Electric|Hybrid))/gi;
      let carModelsMatches = [...text.matchAll(specificCarPattern)];
      if (carModelsMatches && carModelsMatches.length > 0) {
        // Extract the full matches
        const carModels = carModelsMatches.map(match => match[0].trim());
        // Clean up the matches by removing "a" or "an"
        const cleanedModels = carModels.map(m => m.replace(/^a\s+|^an\s+/i, '').trim());
        
        const userInfoIdx = categoryScores.findIndex(c => c.category === 'User Information');
        categoryScores[userInfoIdx].items.push({ key: 'Cars', value: cleanedModels.join(' and ') });
        categoryScores[userInfoIdx].score += 1;
      }
    }
    
    // Find the category with the highest score
    let bestCategory = categoryScores[0];
    for (const category of categoryScores) {
      if (category.score > bestCategory.score) {
        bestCategory = category;
      }
    }
    
    // If we found matches, return items from the best matching category
    if (bestCategory.score > 0) {
      return bestCategory.items;
    }
    
    // If no category pattern matched, create a generic info entry
    return [{ key: 'Info', value: text.trim() }];
  }
  
  /**
   * Detect the most likely section for a natural language update
   */
  detectSection(content: string): string {
    // Keywords that suggest different sections
    const sectionKeywords: Record<string, string[]> = {
      'User Information': [
        'name', 'age', 'location', 'live', 'work', 'job', 'hobby', 'hobbies', 
        'interest', 'drive', 'car', 'vehicle', 'family', 'child', 'children',
        'married', 'single', 'divorced', 'spouse', 'husband', 'wife', 'partner'
      ],
      'General Response Style': [
        'style', 'format', 'response', 'tone', 'language', 'writing', 'concise', 
        'detailed', 'brief', 'verbose', 'emoji', 'formal', 'informal', 'casual', 
        'friendly', 'professional', 'academic', 'technical', 'explain', 'explanation'
      ],
      'Professional Experience': [
        'founded', 'started', 'company', 'business', 'entrepreneur', 'skill', 
        'experience', 'expertise', 'profession', 'qualification', 'education', 
        'degree', 'certificate', 'industry', 'sector', 'career', 'achievement'
      ]
    };
    
    // Count keyword matches for each section
    const sectionScores: Record<string, number> = {};
    const contentLower = content.toLowerCase();
    
    for (const [section, keywords] of Object.entries(sectionKeywords)) {
      sectionScores[section] = 0;
      
      for (const keyword of keywords) {
        // Check for whole word matches - not inside other words
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = contentLower.match(regex);
        if (matches) {
          sectionScores[section] += matches.length;
        }
      }
    }
    
    // Find the section with the highest score
    let bestSection = 'User Information'; // Default section
    let highestScore = 0;
    
    for (const [section, score] of Object.entries(sectionScores)) {
      if (score > highestScore) {
        highestScore = score;
        bestSection = section;
      }
    }
    
    return bestSection;
  }
  
  /**
   * Create a new section in the template if it doesn't exist
   */
  async createSection(sectionName: string, description = ""): Promise<boolean> {
    try {
      console.error(`Creating new section: ${sectionName}`);
      
      // Check if section already exists
      const sectionIndex = this.template.sections.findIndex(
        s => s.title.toLowerCase() === sectionName.toLowerCase()
      );
      
      if (sectionIndex >= 0) {
        // Section already exists
        console.error(`Section ${sectionName} already exists`);
        return true;
      }
      
      // Create a new section
      const newSection: TemplateSection = {
        title: sectionName,
        description: description || `Information about ${sectionName}`,
        items: []
      };
      
      // Add the new section to the template
      this.template.sections.push(newSection);
      console.error(`Created new section: ${sectionName}`);
      
      // Save the updated template
      await this.saveTemplate();
      return true;
    } catch (err) {
      console.error(`Failed to create section ${sectionName}:`, err);
      return false;
    }
  }

  /**
   * Update a specific section in the template
   */
  async updateSection(sectionName: string, content: string): Promise<boolean> {
    try {
      console.error(`Updating section: ${sectionName}`);
      
      // First, try to check if the content already follows the template format
      let formattedContent = content;
      
      // If content doesn't already contain the proper format (-~- Key: Value),
      // try to extract key-value pairs from natural language
      if (!content.includes('-~-')) {
        const extractedItems = this.extractKeyValuePairsFromText(content);
        if (extractedItems.length > 0) {
          formattedContent = extractedItems.map(item => `-~- ${item.key}: ${item.value}`).join('\n');
        } else {
          // If we couldn't extract structured items, create a general entry
          formattedContent = `-~- Info: ${content}`;
        }
      }
      
      // Parse the content into a section
      const tempTemplate = parseTemplate(`# myAI Memory\n\n# ${sectionName}\n${formattedContent}`);
      
      if (tempTemplate.sections.length === 0) {
        console.error(`Failed to parse section ${sectionName}`);
        return false;
      }
      
      const newSection = tempTemplate.sections[0];
      
      // Find the existing section index
      const sectionIndex = this.template.sections.findIndex(
        s => s.title.toLowerCase() === sectionName.toLowerCase()
      );
      
      if (sectionIndex >= 0) {
        // Update existing section by merging items
        const existingSection = this.template.sections[sectionIndex];
        
        // Create a map of existing items by key for easy lookup
        const existingItemsMap = new Map<string, string>();
        for (const item of existingSection.items) {
          existingItemsMap.set(item.key.toLowerCase(), item.value);
        }
        
        // Add or update items from the new section
        for (const newItem of newSection.items) {
          existingItemsMap.set(newItem.key.toLowerCase(), newItem.value);
        }
        
        // Rebuild items array
        const mergedItems = Array.from(existingItemsMap.entries()).map(([key, value]) => {
          // Find the original key with correct casing
          const originalKey = [...existingSection.items, ...newSection.items]
            .find(item => item.key.toLowerCase() === key)?.key || key;
          
          return { key: originalKey, value };
        });
        
        // Update the section
        this.template.sections[sectionIndex] = {
          ...existingSection,
          items: mergedItems
        };
        
        console.error(`Updated existing section: ${sectionName} with ${mergedItems.length} items`);
      } else {
        // Add new section
        this.template.sections.push(newSection);
        console.error(`Added new section: ${sectionName}`);
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
   * Create a new preset from the current template
   */
  async createPreset(presetName: string): Promise<boolean> {
    try {
      const preset: Preset = {
        name: presetName,
        sections: this.template.sections
      };
      
      const presetPath = path.join(PRESETS_DIR, `${presetName.toLowerCase()}.json`);
      await fs.writeFile(presetPath, JSON.stringify(preset, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error(`Failed to create preset ${presetName}:`, err);
      return false;
    }
  }
  
  /**
   * Create default presets if they don't exist
   */
  private async ensureDefaultPresets(): Promise<void> {
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

// Export singleton instance
export const templateService = new TemplateService();