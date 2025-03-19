import { MemoryTemplate, TemplateSection, TemplateItem } from './types.js';

/**
 * Parse a markdown template string into a structured MemoryTemplate object
 */
export function parseTemplate(markdownContent: string): MemoryTemplate {
  const lines = markdownContent.split('\n');
  const sections: TemplateSection[] = [];
  
  let currentSection: TemplateSection | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and the initial "# myAI Memory" header
    if (line === '' || line === '# myAI Memory') {
      continue;
    }
    
    // Handle section headers (# Section Title)
    if (line.startsWith('# ') && line !== '# myAI Memory') {
      if (currentSection) {
        sections.push(currentSection);
      }
      
      currentSection = {
        title: line.substring(2),
        description: '',
        items: []
      };
      continue;
    }
    
    // Handle description lines (## Description)
    if (line.startsWith('## ') && currentSection) {
      currentSection.description = line.substring(3);
      continue;
    }
    
    // Handle preference items (-~- Key: Value)
    if (line.startsWith('-~-') && currentSection) {
      const itemContent = line.substring(3).trim();
      const colonIndex = itemContent.indexOf(':');
      
      if (colonIndex > 0) {
        const key = itemContent.substring(0, colonIndex).trim();
        const value = itemContent.substring(colonIndex + 1).trim();
        
        currentSection.items.push({ key, value });
      }
    }
  }
  
  // Add the last section if it exists
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return { sections };
}

/**
 * Generate a markdown string from a MemoryTemplate object
 */
export function generateTemplate(template: MemoryTemplate): string {
  let markdown = '# myAI Memory\n\n';
  
  for (const section of template.sections) {
    markdown += `# ${section.title}\n`;
    
    if (section.description) {
      markdown += `## ${section.description}\n`;
    }
    
    for (const item of section.items) {
      markdown += `-~- ${item.key}: ${item.value}\n`;
    }
    
    markdown += '\n';
  }
  
  return markdown;
}

/**
 * Validate that a template has the correct structure and formatting
 */
export function validateTemplate(template: MemoryTemplate): boolean {
  if (!template.sections || !Array.isArray(template.sections)) {
    return false;
  }
  
  for (const section of template.sections) {
    if (typeof section.title !== 'string' || !section.title) {
      return false;
    }
    
    if (typeof section.description !== 'string') {
      return false;
    }
    
    if (!Array.isArray(section.items)) {
      return false;
    }
    
    for (const item of section.items) {
      if (typeof item.key !== 'string' || !item.key) {
        return false;
      }
      
      if (typeof item.value !== 'string') {
        return false;
      }
    }
  }
  
  return true;
}