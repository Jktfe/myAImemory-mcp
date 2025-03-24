import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { templateService } from './services/templateService.js';
import { platformService } from './services/platformService.js';
import { PlatformType } from './types.js';
import { generateTemplate } from './templateParser.js';
import { processMemoryCommand } from './naturalLanguageParser.js';
import { SafeSyncManager } from './safeSyncManager.js';

// Optional import for memory cache service - only used if Anthropic API is enabled
let memoryCacheService: any = null;
try {
  import('./utils/memoryCacheService.js').then(module => {
    memoryCacheService = module;
    console.error('Memory cache service loaded for "use myAI memory" support');
  }).catch(() => {
    console.error('Memory cache service not available (optional Anthropic features not enabled)');
  });
} catch (e) {
  // This is expected if Anthropic API is not enabled
}

/**
 * Create and configure the MCP server
 */
export async function createMcpServer(): Promise<McpServer> {
  try {
    // Initialize the safe sync manager
    const safeSyncManager = new SafeSyncManager();
    
    // Initialize services
    await templateService.initialize();
    await platformService.initialize();
    
    // Create the MCP server
    const server = new McpServer({
      name: 'myAI Memory Sync',
      version: '1.0.0'
    });
    
    // Get template tool
    server.tool(
      'get_template',
      {},
      async () => {
        try {
          // Use the safe sync manager to read the master file
          const masterContent = await safeSyncManager.readMasterFile();
          
          if (!masterContent) {
            return {
              content: [{ 
                type: 'text', 
                text: 'Master file is empty or not found' 
              }],
              isError: true
            };
          }
          
          return {
            content: [{ 
              type: 'text', 
              text: masterContent 
            }]
          };
        } catch (error) {
          console.error(`Error in get_template: ${error instanceof Error ? error.message : String(error)}`);
          return {
            content: [{ 
              type: 'text', 
              text: `Error retrieving template: ${error instanceof Error ? error.message : String(error)}` 
            }],
            isError: true
          };
        }
      }
    );
    
    // Get section tool
    server.tool(
      'get_section',
      {
        sectionName: z.string().describe('The name of the section to retrieve')
      },
      async ({ sectionName }) => {
        try {
          // Use the safe sync manager to get the section
          const sectionContent = await safeSyncManager.getSection(sectionName);
          
          if (!sectionContent) {
            return {
              content: [{ 
                type: 'text', 
                text: `Section '${sectionName}' not found` 
              }],
              isError: true
            };
          }
          
          return {
            content: [{ 
              type: 'text', 
              text: sectionContent 
            }]
          };
        } catch (error) {
          console.error(`Error in get_section: ${error instanceof Error ? error.message : String(error)}`);
          return {
            content: [{ 
              type: 'text', 
              text: `Error retrieving section: ${error instanceof Error ? error.message : String(error)}` 
            }],
            isError: true
          };
        }
      }
    );
    
    // Update section tool
    server.tool(
      'update_section',
      {
        sectionName: z.string().describe('The name of the section to update'),
        content: z.string().describe('The content for the section')
      },
      async ({ sectionName, content }) => {
        try {
          // Use the safe sync manager to update the section with backup
          const success = await safeSyncManager.updateSection(sectionName, content);
          
          if (!success) {
            return {
              content: [{ 
                type: 'text', 
                text: `Failed to update section '${sectionName}'` 
              }],
              isError: true
            };
          }
          
          // Sync to platforms
          const results = await safeSyncManager.syncToPlatforms();
          const successCount = results.filter(r => r.success).length;
          const platformCount = results.length;
          
          return {
            content: [{ 
              type: 'text', 
              text: `Section '${sectionName}' updated successfully with backup. Synced to ${successCount}/${platformCount} platforms.` 
            }]
          };
        } catch (error) {
          console.error(`Error in update_section: ${error instanceof Error ? error.message : String(error)}`);
          return {
            content: [{ 
              type: 'text', 
              text: `Error updating section: ${error instanceof Error ? error.message : String(error)}` 
            }],
            isError: true
          };
        }
      }
    );
    
    // Update template tool
    server.tool(
      'update_template',
      {
        content: z.string().describe('The full template content')
      },
      async ({ content }) => {
        try {
          // Use the safe sync manager to update the master file with backup
          const success = await safeSyncManager.updateMasterFile(content);
          
          if (!success) {
            return {
              content: [{ 
                type: 'text', 
                text: 'Failed to update master file' 
              }],
              isError: true
            };
          }
          
          try {
            // Sync to platforms
            const results = await safeSyncManager.syncToPlatforms();
            const successCount = results.filter(r => r.success).length;
            const platformCount = results.length;
            
            return {
              content: [{ 
                type: 'text', 
                text: `Master file updated successfully with backup. Synced to ${successCount}/${platformCount} platforms.` 
              }]
            };
          } catch (syncError) {
            console.error(`Error syncing platforms: ${syncError instanceof Error ? syncError.message : String(syncError)}`);
            // Template was updated successfully, but sync failed
            return {
              content: [{ 
                type: 'text', 
                text: 'Master file updated successfully with backup, but platform sync failed. You may need to run sync_platforms manually.' 
              }]
            };
          }
        } catch (error) {
          console.error(`Error in update_template: ${error instanceof Error ? error.message : String(error)}`);
          return {
            content: [{ 
              type: 'text', 
              text: `Error updating master file: ${error instanceof Error ? error.message : String(error)}` 
            }],
            isError: true
          };
        }
      }
    );
    
    // Sync platforms tool
    server.tool(
      'sync_platforms',
      {
        platform: z.string().optional().describe('Specific platform to sync (optional)')
      },
      async ({ platform }) => {
        try {
          let results;
          
          if (platform) {
            // Sync a specific platform
            const validPlatform = platform as PlatformType;
            return {
              content: [{ 
                type: 'text', 
                text: 'Individual platform sync not supported in safe mode. Use sync_platforms with no arguments to sync all platforms.' 
              }],
              isError: true
            };
          } else {
            // Sync all platforms using the safe sync manager
            results = await safeSyncManager.syncToPlatforms();
          }
          
          const successCount = results.filter(r => r.success).length;
          const totalCount = results.length;
          
          // Detailed results
          let detailedResults = '';
          for (const result of results) {
            const status = result.success ? '✅' : '❌';
            detailedResults += `${status} ${result.platform}: ${result.message}\n`;
          }
          
          return {
            content: [{ 
              type: 'text', 
              text: `Synced ${successCount}/${totalCount} platforms:\n\n${detailedResults}` 
            }]
          };
        } catch (error) {
          console.error(`Error in sync_platforms: ${error instanceof Error ? error.message : String(error)}`);
          return {
            content: [{ 
              type: 'text', 
              text: `Error syncing platforms: ${error instanceof Error ? error.message : String(error)}` 
            }],
            isError: true
          };
        }
      }
    );
    
    // List platforms tool
    server.tool(
      'list_platforms',
      {},
      async () => {
        return {
          content: [{ 
            type: 'text', 
            text: 'Available platforms:\n- windsurf: Windsurf IDE memories\n- claude-code: CLAUDE.md files in project directories' 
          }]
        };
      }
    );
    
    // List presets tool - limited functionality
    server.tool(
      'list_presets',
      {},
      async () => {
        return {
          content: [{ 
            type: 'text', 
            text: 'Preset functionality is not available in safe mode.' 
          }],
          isError: true
        };
      }
    );
    
    // Load preset tool - limited functionality
    server.tool(
      'load_preset',
      {
        presetName: z.string().describe('The name of the preset to load')
      },
      async () => {
        return {
          content: [{ 
            type: 'text', 
            text: 'Preset functionality is not available in safe mode.' 
          }],
          isError: true
        };
      }
    );
    
    // Create preset tool - limited functionality
    server.tool(
      'create_preset',
      {
        presetName: z.string().describe('The name for the new preset')
      },
      async () => {
        return {
          content: [{ 
            type: 'text', 
            text: 'Preset functionality is not available in safe mode.' 
          }],
          isError: true
        };
      }
    );
    
    // Natural language memory command tool
    server.tool(
      'remember',
      {
        command: z.string().describe('Natural language memory command')
      },
      async ({ command }) => {
        try {
          // Check if this is a "use myAI memory" query that should use the enhanced cache
          if (memoryCacheService && 
              memoryCacheService.processMemoryQuery &&
              (command.toLowerCase().includes('use myai memory') || 
               command.toLowerCase().includes('tell me about my'))) {
            
            console.error('Using enhanced memory cache for query:', command);
            const response = await memoryCacheService.processMemoryQuery(command);
            
            if (response.success) {
              // Format response from Claude
              const text = response.content.map((c: any) => c.text).join('');
              return {
                content: [{ type: 'text', text }],
                isError: false
              };
            } else {
              // Fall back to standard processing if cache service fails
              console.error('Memory cache service failed, falling back to standard processing');
            }
          }
          
          // Standard processing path (either no cache service or fallback)
          const result = await processMemoryCommand(command);
          
          return {
            content: [{ 
              type: 'text', 
              text: result.message
            }],
            isError: !result.success
          };
        } catch (error) {
          console.error(`Error in remember: ${error instanceof Error ? error.message : String(error)}`);
          return {
            content: [{ 
              type: 'text', 
              text: `Error processing memory command: ${error instanceof Error ? error.message : String(error)}` 
            }],
            isError: true
          };
        }
      }
    );
    
    console.error('MCP server created with limited functionality for safety');
    return server;
  } catch (error) {
    console.error(`Error creating MCP server: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}