/**
 * Memory Cache Service
 * 
 * This service caches memory sections and template contents,
 * integrating with the prompt caching system to provide
 * fast access to memory contents.
 */

import { anthropicService } from './anthropicService.js';
import { templateService } from '../services/templateService.js';
import { generateTemplate } from '../templateParser.js';
import { config } from '../config.js';

// Cache for template and sections
let templateCache: {
  content: string;
  timestamp: number;
} | null = null;

// Cache for individual sections
const sectionCache = new Map<string, {
  content: string;
  timestamp: number;
}>();

// Default TTL for template cache (5 minutes)
const TEMPLATE_CACHE_TTL = 5 * 60 * 1000;

/**
 * Get the full template with caching
 */
export async function getCachedTemplate(): Promise<string> {
  try {
    const now = Date.now();
    
    // Check if cache is valid
    if (templateCache && (now - templateCache.timestamp < TEMPLATE_CACHE_TTL)) {
      console.log('Using cached template');
      return templateCache.content;
    }
    
    // Get fresh template
    const template = await templateService.getTemplate();
    const templateContent = generateTemplate(template);
    
    // Update cache
    templateCache = {
      content: templateContent,
      timestamp: now
    };
    
    return templateContent;
  } catch (error) {
    console.error('Error getting cached template:', error);
    throw error;
  }
}

/**
 * Get a specific section with caching
 */
export async function getCachedSection(sectionName: string): Promise<string> {
  try {
    const now = Date.now();
    const cachedSection = sectionCache.get(sectionName);
    
    // Check if cache is valid
    if (cachedSection && (now - cachedSection.timestamp < TEMPLATE_CACHE_TTL)) {
      console.log(`Using cached section: ${sectionName}`);
      return cachedSection.content;
    }
    
    // Get fresh section
    const section = await templateService.getSection(sectionName);
    
    if (!section) {
      throw new Error(`Section '${sectionName}' not found`);
    }
    
    // Format section for display
    let sectionText = `# ${section.title}\n`;
    if (section.description) {
      sectionText += `## ${section.description}\n`;
    }
    
    for (const item of section.items) {
      sectionText += `-~- ${item.key}: ${item.value}\n`;
    }
    
    // Update cache
    sectionCache.set(sectionName, {
      content: sectionText,
      timestamp: now
    });
    
    return sectionText;
  } catch (error) {
    console.error(`Error getting cached section ${sectionName}:`, error);
    throw error;
  }
}

/**
 * Process a natural language memory query with Claude using cached templates
 */
export async function processMemoryQuery(query: string): Promise<any> {
  // Only proceed if Anthropic integration is enabled
  if (!config.anthropic?.enabled) {
    return {
      success: false,
      error: 'Anthropic API integration is not enabled. Set ENABLE_ANTHROPIC=true to use this feature.'
    };
  }
  
  try {
    // Get the cached template
    const templateContent = await getCachedTemplate();
    
    // Create system prompt with the template content
    const systemPrompt = `You are assisting with memory retrieval from the user's myAI Memory template.
The user will ask questions about their memory. Use the template content to answer their questions.
Only reference information that's explicitly in the template.

Here is the user's full memory template:

${templateContent}`;

    // Extract query intent - is this a general request or section-specific?
    const intentPrompt = `Analyze this user query: "${query}"
Is the user asking about a specific section of their memory or about the general template?
Return a structured response as JSON, like this:
{
  "queryType": "general" or "section",
  "sectionName": "Name of the section if section-specific, otherwise null",
  "intent": "Brief description of what the user is asking for"
}`;

    // First, determine the query intent
    const intentResponse = await anthropicService.sendMessage([
      { role: 'user', content: intentPrompt }
    ]);
    
    if (!intentResponse.success) {
      return intentResponse;
    }
    
    // Parse the intent response
    let intentData;
    try {
      const intentText = intentResponse.content.map((c: any) => c.text).join('');
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = intentText.match(/```json\s*({[\s\S]*?})\s*```/) || 
                        intentText.match(/```\s*({[\s\S]*?})\s*```/) ||
                        intentText.match(/({[\s\S]*?})/);
                        
      const jsonString = jsonMatch ? jsonMatch[1] : intentText;
      intentData = JSON.parse(jsonString);
    } catch (e) {
      console.error('Failed to parse intent response:', e);
      intentData = { queryType: 'general', sectionName: null };
    }
    
    let finalPrompt = '';
    
    // Fetch section-specific content if needed
    if (intentData.queryType === 'section' && intentData.sectionName) {
      try {
        const sectionContent = await getCachedSection(intentData.sectionName);
        finalPrompt = `${systemPrompt}\n\nThe user is specifically asking about the "${intentData.sectionName}" section.\nHere's that specific section:\n\n${sectionContent}\n\nUser query: ${query}`;
      } catch (error) {
        // If section doesn't exist, fall back to general template
        finalPrompt = `${systemPrompt}\n\nUser query: ${query}`;
      }
    } else {
      // Use the full template for general queries
      finalPrompt = `${systemPrompt}\n\nUser query: ${query}`;
    }
    
    // Get the answer from Claude
    return await anthropicService.sendMessage([
      { role: 'system', content: finalPrompt },
      { role: 'user', content: query }
    ]);
  } catch (error) {
    console.error('Error in processMemoryQuery:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Clear the template and section caches
 */
export function clearMemoryCache(): void {
  templateCache = null;
  sectionCache.clear();
  console.log('Memory cache cleared');
}

/**
 * Update the cache after template changes
 */
export async function updateCacheAfterSync(): Promise<void> {
  try {
    // Clear existing cache
    clearMemoryCache();
    
    // Pre-cache the template
    await getCachedTemplate();
    
    // Get all section titles to pre-cache
    const template = await templateService.getTemplate();
    const sections = template.sections || [];
    
    // Pre-cache each section
    for (const section of sections) {
      await getCachedSection(section.title);
    }
    
    console.log(`Pre-cached template and ${sections.length} sections`);
  } catch (error) {
    console.error('Error updating cache after sync:', error);
  }
}