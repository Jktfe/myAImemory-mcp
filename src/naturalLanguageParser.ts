/**
 * Natural Language Command Parser for myAI Memory
 * 
 * This module processes natural language commands like:
 * "Use myAI Memory to remember I work at New Model VC"
 * and converts them to structured updates for the memory template.
 */

import { templateService } from './services/templateService.js';
import { platformService } from './services/platformService.js';
import { MemoryTemplate } from './types.js';
import { generateTemplate } from './templateParser.js';

// Define section keywords for automatic categorization
const sectionKeywords = {
  'User Information': [
    'name', 'age', 'location', 'live', 'address', 'phone', 'email', 'birthday', 
    'work', 'job', 'family', 'spouse', 'child', 'children', 'pet', 'hobby', 
    'hobbies', 'interest', 'interests', 'education', 'school', 'university',
    'wife', 'husband', 'partner', 'daughter', 'son', 'car', 'vehicle', 'house',
    'home', 'founded', 'company', 'business'
  ],
  'General Response Style': [
    'response', 'style', 'tone', 'voice', 'formal', 'informal', 'casual', 'professional',
    'friendly', 'concise', 'detailed', 'respond', 'emoji', 'language', 'prefer',
    'spelling', 'format', 'formatting', 'brevity', 'thorough', 'currency', 'structure'
  ],
  'Coding Preferences': [
    'code', 'coding', 'programming', 'language', 'framework', 'library', 'platform',
    'syntax', 'style', 'indent', 'indentation', 'comment', 'documentation', 'naming',
    'convention', 'pattern', 'architecture', 'design', 'test', 'testing', 'debug',
    'debugging', 'editor', 'IDE', 'terminal', 'compiler', 'interpreter', 'svelte',
    'react', 'angular', 'vue', 'node', 'python', 'java', 'javascript', 'typescript'
  ],
  'MCP': [
    'mcp', 'file', 'access', 'permission', 'gitignore', 'credential', 'api',
    'key', 'secret', 'token', 'filesystem', 'filesystem', 'filesystem mcp', 
    'serveMyAPI', 'serve', 'server', 'endpoint', 'host'
  ]
};

/**
 * Interface for memory item creation
 */
interface MemoryItem {
  section: string;
  content: string;
}

/**
 * Parses a natural language command and extracts memory information
 * @param command The natural language command
 * @returns A structured memory item or null if not a memory command
 */
export function parseMemoryCommand(command: string): MemoryItem | null {
  // Check if this is a memory command with multiple patterns
  const memoryPatterns = [
    /use\s+myai\s+memory\s+to\s+remember\s+(.*)/i,
    /remember\s+that\s+(.*)/i,
    /add\s+to\s+my\s+memory\s+that\s+(.*)/i,
    /use\s+myai\s+memory\s+to\s+add\s+to\s+(.*?)\s+(.*)/i,
    /update\s+my\s+(.*?)\s+to\s+include\s+that\s+(.*)/i
  ];
  
  for (const pattern of memoryPatterns) {
    const match = command.match(pattern);
    if (match) {
      // Special handling for "add to section" pattern
      if (pattern.toString().includes('add\\s+to\\s+(.*?)\\s+')) {
        const sectionNameFromCommand = match[1].trim();
        const content = match[2].trim();
        // Find the best section match by checking keyword categories
        const sectionName = findBestSectionMatch(sectionNameFromCommand);
        return {
          section: sectionName,
          content: content
        };
      }
      
      // Special handling for "update my section" pattern
      if (pattern.toString().includes('update\\s+my\\s+(.*?)\\s+to\\s+include')) {
        const sectionNameFromCommand = match[1].trim();
        const content = match[2].trim();
        // Find the best section match by checking keyword categories
        const sectionName = findBestSectionMatch(sectionNameFromCommand);
        return {
          section: sectionName,
          content: content
        };
      }
      
      // Standard match handling for simpler patterns
      const content = match[1].trim();
      const section = determineBestSection(content);
      
      return {
        section,
        content
      };
    }
  }
  
  return null;
}

/**
 * Find the best matching section name from a partial name
 * @param partialName The partial section name from the command
 * @returns The full section name
 */
function findBestSectionMatch(partialName: string): string {
  const lowercasePartial = partialName.toLowerCase();
  
  // First try exact matches of section names
  for (const sectionName of Object.keys(sectionKeywords)) {
    if (sectionName.toLowerCase() === lowercasePartial) {
      return sectionName;
    }
  }
  
  // Then try partial matches
  for (const sectionName of Object.keys(sectionKeywords)) {
    if (sectionName.toLowerCase().includes(lowercasePartial) || 
        lowercasePartial.includes(sectionName.toLowerCase())) {
      return sectionName;
    }
  }
  
  // If no match found, use the partial name directly with proper casing
  return partialName.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Determines the best section for a piece of content based on keywords
 * @param content The content to categorize
 * @returns The name of the best matching section
 */
function determineBestSection(content: string): string {
  // Default to User Information if no better match is found
  let bestSection = 'User Information';
  let bestScore = 0;
  
  // Convert content to lowercase for better matching
  const lowercaseContent = content.toLowerCase();
  
  // Check each section's keywords for matches
  for (const [section, keywords] of Object.entries(sectionKeywords)) {
    let score = 0;
    
    for (const keyword of keywords) {
      if (lowercaseContent.includes(keyword.toLowerCase())) {
        score++;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestSection = section;
    }
  }
  
  return bestSection;
}

/**
 * Formats memory content to match template format with -~- prefix
 * @param content Raw content string
 * @returns Formatted content string
 */
function formatContent(content: string): string {
  // If the content already has a -~- prefix, return as is
  if (content.trim().startsWith('-~-')) {
    return content;
  }
  
  // Try to extract a key/value pair
  const keyValueMatch = content.match(/^(my|i|we)\s+(.*?)\s+is\s+(.*)/i);
  
  if (keyValueMatch) {
    const key = keyValueMatch[2].trim();
    const value = keyValueMatch[3].trim();
    return `-~- ${key}: ${value}`;
  }
  
  // If there's a colon in the content, try to split on that
  if (content.includes(':')) {
    const parts = content.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join(':').trim();
      return `-~- ${key}: ${value}`;
    }
  }
  
  // For statements that don't fit the key/value pattern
  return `-~- ${content}`;
}

/**
 * Processes a memory command, updates the template, and syncs to platforms
 * @param command The natural language command
 * @returns Success status and message
 */
export async function processMemoryCommand(command: string): Promise<{ success: boolean; message: string }> {
  try {
    // Initialize services if not already initialized
    await templateService.initialize();
    await platformService.initialize();
    
    // Parse the command
    const memoryItem = parseMemoryCommand(command);
    
    if (!memoryItem) {
      return { 
        success: false, 
        message: "Not a valid memory command. Use 'Use myAI Memory to remember [your information]'" 
      };
    }
    
    // Get the current section content
    let section = await templateService.getSection(memoryItem.section);
    
    // If section doesn't exist, create it
    if (!section) {
      console.error(`Section "${memoryItem.section}" does not exist, creating it`);
      const created = await templateService.createSection(memoryItem.section);
      if (!created) {
        return {
          success: false,
          message: `Failed to create section '${memoryItem.section}'.`
        };
      }
      // Get the newly created section
      section = await templateService.getSection(memoryItem.section);
    }
    
    // Format the new content
    const formattedContent = formatContent(memoryItem.content);
    
    // Update the section
    const success = await templateService.updateSection(memoryItem.section, formattedContent);
    
    if (!success) {
      return {
        success: false,
        message: `Failed to update section '${memoryItem.section}'.`
      };
    }
    
    // Get the updated template
    const template = await templateService.getTemplate();
    
    // Generate markdown content from template
    const templateContent = generateTemplate(template);
    
    // Sync to all platforms
    const results = await platformService.syncAll(templateContent);
    
    const successCount = results.filter(r => r.success).length;
    
    return { 
      success: true, 
      message: `Added to ${memoryItem.section}. Synced to ${successCount}/${results.length} platforms.` 
    };
  } catch (error) {
    console.error('Error in processMemoryCommand:', error);
    return { 
      success: false, 
      message: `Error processing memory command: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}
