/**
 * MemoryCommandProcessor - Processes natural language memory commands
 */
import { processMemoryCommand as legacyProcessMemoryCommand } from '../../naturalLanguageParser.js';
import { ServiceFactory } from '../services/ServiceFactory.js';

export interface MemoryCommandResult {
  success: boolean;
  message: string;
}

/**
 * Process a natural language memory command
 */
export async function processMemoryCommand(command: string): Promise<MemoryCommandResult> {
  try {
    // Initialize services if needed
    const templateService = ServiceFactory.getTemplateService();
    const platformService = ServiceFactory.getPlatformService();
    
    // Use the legacy implementation for now
    return await legacyProcessMemoryCommand(command);
  } catch (error) {
    console.error(`Error processing memory command: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      message: `Error processing memory command: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Check if this is a memory query that should use the enhanced cache
 */
export function isMemoryQuery(command: string): boolean {
  const lowerCommand = command.toLowerCase();
  return lowerCommand.includes('use myai memory') || 
         lowerCommand.includes('tell me about my');
}