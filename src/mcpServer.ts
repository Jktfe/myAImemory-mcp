import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { templateService } from './services/templateService.js';
import { platformService } from './services/platformService.js';
import { PlatformType } from './types.js';
import { generateTemplate } from './templateParser.js';
import { processMemoryCommand } from './naturalLanguageParser.js';

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
          const template = await templateService.getTemplate();
          const markdown = generateTemplate(template);
          
          return {
            content: [{ 
              type: 'text', 
              text: markdown 
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
          const section = await templateService.getSection(sectionName);
          
          if (!section) {
            return {
              content: [{ 
                type: 'text', 
                text: `Section '${sectionName}' not found` 
              }],
              isError: true
            };
          }
          
          // Format section for display
          let sectionText = `# ${section.title}\n`;
          if (section.description) {
            sectionText += `## ${section.description}\n`;
          }
          
          for (const item of section.items) {
            sectionText += `-~- ${item.key}: ${item.value}\n`;
          }
          
          return {
            content: [{ 
              type: 'text', 
              text: sectionText 
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
          const success = await templateService.updateSection(sectionName, content);
          
          if (!success) {
            return {
              content: [{ 
                type: 'text', 
                text: `Failed to update section '${sectionName}'` 
              }],
              isError: true
            };
          }
          
          // Sync with platforms
          const results = await platformService.syncAll();
          const successCount = results.filter(r => r.success).length;
          const platformCount = results.length;
          
          return {
            content: [{ 
              type: 'text', 
              text: `Section '${sectionName}' updated successfully. Synced to ${successCount}/${platformCount} platforms.` 
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
          const success = await templateService.updateTemplate(content);
          
          if (!success) {
            return {
              content: [{ 
                type: 'text', 
                text: 'Failed to update template' 
              }],
              isError: true
            };
          }
          
          try {
            // Sync with platforms
            const results = await platformService.syncAll();
            const successCount = results.filter(r => r.success).length;
            const platformCount = results.length;
            
            return {
              content: [{ 
                type: 'text', 
                text: `Template updated successfully. Synced to ${successCount}/${platformCount} platforms.` 
              }]
            };
          } catch (syncError) {
            console.error(`Error syncing platforms: ${syncError instanceof Error ? syncError.message : String(syncError)}`);
            // Template was updated successfully, but sync failed
            return {
              content: [{ 
                type: 'text', 
                text: 'Template updated successfully but platform sync failed. You may need to run sync_platforms manually.' 
              }]
            };
          }
        } catch (error) {
          console.error(`Error in update_template: ${error instanceof Error ? error.message : String(error)}`);
          return {
            content: [{ 
              type: 'text', 
              text: `Error updating template: ${error instanceof Error ? error.message : String(error)}` 
            }],
            isError: true
          };
        }
      }
    );
    
    // List presets tool
    server.tool(
      'list_presets',
      {},
      async () => {
        try {
          const presets = await templateService.listPresets();
          
          if (presets.length === 0) {
            return {
              content: [{ 
                type: 'text', 
                text: 'No presets found' 
              }]
            };
          }
          
          return {
            content: [{ 
              type: 'text', 
              text: `Available presets:\n${presets.join('\n')}` 
            }]
          };
        } catch (error) {
          console.error(`Error in list_presets: ${error instanceof Error ? error.message : String(error)}`);
          return {
            content: [{ 
              type: 'text', 
              text: `Error listing presets: ${error instanceof Error ? error.message : String(error)}` 
            }],
            isError: true
          };
        }
      }
    );
    
    // Load preset tool
    server.tool(
      'load_preset',
      {
        presetName: z.string().describe('The name of the preset to load')
      },
      async ({ presetName }) => {
        try {
          const success = await templateService.loadPreset(presetName);
          
          if (!success) {
            return {
              content: [{ 
                type: 'text', 
                text: `Failed to load preset '${presetName}'` 
              }],
              isError: true
            };
          }
          
          // Sync with platforms
          const results = await platformService.syncAll();
          const successCount = results.filter(r => r.success).length;
          const platformCount = results.length;
          
          return {
            content: [{ 
              type: 'text', 
              text: `Preset '${presetName}' loaded successfully. Synced to ${successCount}/${platformCount} platforms.` 
            }]
          };
        } catch (error) {
          console.error(`Error in load_preset: ${error instanceof Error ? error.message : String(error)}`);
          return {
            content: [{ 
              type: 'text', 
              text: `Error loading preset: ${error instanceof Error ? error.message : String(error)}` 
            }],
            isError: true
          };
        }
      }
    );
    
    // Create preset tool
    server.tool(
      'create_preset',
      {
        presetName: z.string().describe('The name for the new preset')
      },
      async ({ presetName }) => {
        try {
          const success = await templateService.createPreset(presetName);
          
          if (!success) {
            return {
              content: [{ 
                type: 'text', 
                text: `Failed to create preset '${presetName}'` 
              }],
              isError: true
            };
          }
          
          return {
            content: [{ 
              type: 'text', 
              text: `Preset '${presetName}' created successfully` 
            }]
          };
        } catch (error) {
          console.error(`Error in create_preset: ${error instanceof Error ? error.message : String(error)}`);
          return {
            content: [{ 
              type: 'text', 
              text: `Error creating preset: ${error instanceof Error ? error.message : String(error)}` 
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
      async (params) => {
        try {
          const platform = params.platform as PlatformType | undefined;
          let results;
          
          if (platform) {
            const result = await platformService.syncPlatform(platform);
            results = [result];
          } else {
            const template = await templateService.getTemplate();
            const templateContent = generateTemplate(template);
            results = await platformService.syncAll(templateContent);
          }
          
          return {
            content: [{ 
              type: 'text', 
              text: `Sync results: ${results.map(r => `${r.platform}: ${r.success ? '✅' : '❌'}`).join(', ')}` 
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
        try {
          const platforms = platformService.getPlatforms();
          const availablePlatforms = platformService.getAvailablePlatforms();
          
          let platformText = 'Configured platforms:\n';
          
          for (const platform of availablePlatforms) {
            const isEnabled = platforms.includes(platform);
            platformText += `${platform}: ${isEnabled ? '✅ Enabled' : '❌ Disabled'}\n`;
          }
          
          return {
            content: [{ 
              type: 'text', 
              text: platformText
            }]
          };
        } catch (error) {
          console.error(`Error in list_platforms: ${error instanceof Error ? error.message : String(error)}`);
          return {
            content: [{ 
              type: 'text', 
              text: `Error listing platforms: ${error instanceof Error ? error.message : String(error)}` 
            }],
            isError: true
          };
        }
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
              const text = response.content.map(c => c.text).join('');
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
    
    console.error('[mcpServer] MCP server created and configured');
    return server;
  } catch (error) {
    console.error(`[mcpServer:error] Error creating MCP server: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}