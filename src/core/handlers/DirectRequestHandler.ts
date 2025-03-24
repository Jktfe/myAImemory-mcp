/**
 * DirectRequestHandler - Handles JSON-RPC requests for the Direct MCP server
 */
import { McpServerOptions } from '../server/types.js';
import { ServiceFactory } from '../services/ServiceFactory.js';
import { generateTemplate } from '../../templateParser.js';
import { processMemoryCommand } from '../utils/MemoryCommandProcessor.js';
import { PlatformType } from '../../types.js';

export class DirectRequestHandler {
  private initialized: boolean = false;
  private handlers: Map<string, Function> = new Map();
  
  constructor(private options: McpServerOptions) {
    this.setupHandlers();
  }
  
  /**
   * Set up the request handlers
   */
  private setupHandlers(): void {
    // Initialize handler
    this.handlers.set('initialize', async (params: any) => {
      this.initialized = true;
      return {
        serverInfo: {
          name: this.options.name,
          version: this.options.version,
        },
        capabilities: {
          tools: {}
        },
        protocolVersion: "2024-11-05"
      };
    });
    
    // Tools list handler
    this.handlers.set('tools/list', async () => {
      return {
        tools: [
          {
            name: 'myai_get_template',
            description: 'Get the full myAImemory template',
            parameters: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'myai_get_section',
            description: 'Get a specific section of your myAImemory',
            parameters: {
              type: 'object',
              properties: {
                sectionName: {
                  type: 'string',
                  description: 'The name of the section to retrieve',
                },
              },
            },
          },
          {
            name: 'myai_store',
            description: 'Store information in your myAImemory',
            parameters: {
              type: 'object',
              properties: {
                sectionName: {
                  type: 'string',
                  description: 'The name of the section to update',
                },
                content: {
                  type: 'string',
                  description: 'The content to store',
                },
              },
            },
          },
          {
            name: 'myai_update_template',
            description: 'Update your entire myAImemory template',
            parameters: {
              type: 'object',
              properties: {
                content: {
                  type: 'string',
                  description: 'The full template content',
                },
              },
            },
          },
          {
            name: 'myai_list_presets',
            description: 'List available myAImemory presets',
            parameters: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'myai_load_preset',
            description: 'Load a myAImemory preset',
            parameters: {
              type: 'object',
              properties: {
                presetName: {
                  type: 'string',
                  description: 'The name of the preset to load',
                },
              },
            },
          },
          {
            name: 'myai_create_preset',
            description: 'Create a new myAImemory preset from current template',
            parameters: {
              type: 'object',
              properties: {
                presetName: {
                  type: 'string',
                  description: 'The name for the new preset',
                },
              },
            },
          },
          {
            name: 'myai_sync_platforms',
            description: 'Sync your myAImemory to platform(s)',
            parameters: {
              type: 'object',
              properties: {
                platform: {
                  type: 'string',
                  description: 'Specific platform to sync (optional)',
                },
              },
            },
          },
          {
            name: 'myai_list_platforms',
            description: 'List configured platforms for myAImemory',
            parameters: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'remember',
            description: 'Process a natural language memory command',
            parameters: {
              type: 'object',
              properties: {
                command: {
                  type: 'string',
                  description: 'Natural language memory command',
                },
              },
            },
          },
        ],
      };
    });
    
    // Tools call handler
    this.handlers.set('tools/call', async (params: any) => {
      const { name, arguments: args } = params;
      
      switch (name) {
        case 'myai_get_template':
        case 'get_template':
          return this.handleGetTemplate();
          
        case 'myai_get_section':
        case 'get_section':
          return this.handleGetSection(args);
          
        case 'myai_store':
        case 'update_section':
          return this.handleUpdateSection(args);
          
        case 'myai_update_template':
        case 'update_template':
          return this.handleUpdateTemplate(args);
          
        case 'myai_list_presets':
        case 'list_presets':
          return this.handleListPresets();
          
        case 'myai_load_preset':
        case 'load_preset':
          return this.handleLoadPreset(args);
          
        case 'myai_create_preset':
        case 'create_preset':
          return this.handleCreatePreset(args);
          
        case 'myai_sync_platforms':
        case 'sync_platforms':
          return this.handleSyncPlatforms(args);
          
        case 'myai_list_platforms':
        case 'list_platforms':
          return this.handleListPlatforms();
          
        case 'remember':
          return this.handleRemember(args);
          
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }
  
  /**
   * Handle an incoming JSON-RPC request
   */
  public async handleRequest(request: any): Promise<any> {
    // Check if it's a valid JSON-RPC 2.0 request
    if (request.jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid request',
        },
        id: request.id || null,
      };
    }
    
    const { method, params, id } = request;
    
    // Check if method exists
    if (!this.handlers.has(method) && method !== 'initialized') {
      return {
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
        id,
      };
    }
    
    // Special handling for initialized notification
    if (method === 'initialized') {
      // No response needed for notifications
      return;
    }
    
    try {
      // Get the handler and execute it
      const handler = this.handlers.get(method);
      
      if (!handler) {
        return {
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
          id,
        };
      }
      
      const result = await handler(params);
      
      // Return the result
      return {
        jsonrpc: '2.0',
        result,
        id,
      };
    } catch (error) {
      console.error(`Error handling request: ${error instanceof Error ? error.message : String(error)}`);
      return {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
        id,
      };
    }
  }
  
  /**
   * Handler for get_template tool
   */
  private async handleGetTemplate() {
    try {
      const templateService = ServiceFactory.getTemplateService();
      const template = templateService.getTemplate();
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
  
  /**
   * Handler for get_section tool
   */
  private async handleGetSection(args: any) {
    try {
      const { sectionName } = args;
      
      if (!sectionName) {
        return {
          content: [{ 
            type: 'text', 
            text: 'Section name is required' 
          }],
          isError: true
        };
      }
      
      const templateService = ServiceFactory.getTemplateService();
      const section = templateService.getSection(sectionName);
      
      if (!section) {
        return {
          content: [{ 
            type: 'text', 
            text: `Section '${sectionName}' not found` 
          }],
          isError: true
        };
      }
      
      // Format section as markdown
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
  
  /**
   * Handler for update_section tool
   */
  private async handleUpdateSection(args: any) {
    try {
      const { sectionName, content } = args;
      
      if (!sectionName || !content) {
        return {
          content: [{ 
            type: 'text',
            text: 'Both sectionName and content are required parameters' 
          }],
          isError: true
        };
      }
      
      console.error(`Updating section: ${sectionName}`);
      
      try {
        const templateService = ServiceFactory.getTemplateService();
        const platformService = ServiceFactory.getPlatformService();
        
        // Update section in template store
        await templateService.updateSection(sectionName, content);
        
        // Get the full template content (as object)
        const templateObj = templateService.getTemplate();
        
        // Convert to string format for syncing
        const templateContent = generateTemplate(templateObj);
        
        // Sync with all platforms
        const syncResults = await platformService.syncAll(templateContent);
        
        // Build summary of sync results
        const successfulPlatforms = syncResults
          .filter(result => result.success)
          .map(result => result.platform)
          .join(', ');
        
        // Log the results
        console.error(`Section '${sectionName}' updated with ${syncResults.length} platforms synced`);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Section '${sectionName}' updated successfully and synced to all platforms` 
          }]
        };
      } catch (error) {
        console.error(`Error updating section: ${error}`);
        return {
          content: [{ 
            type: 'text', 
            text: `Error updating section: ${error}` 
          }]
        };
      }
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
  
  /**
   * Handler for update_template tool
   */
  private async handleUpdateTemplate(args: any) {
    try {
      const { content } = args;
      
      if (!content) {
        return {
          content: [{ 
            type: 'text', 
            text: 'Template content is required' 
          }],
          isError: true
        };
      }
      
      const templateService = ServiceFactory.getTemplateService();
      const platformService = ServiceFactory.getPlatformService();
      
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
      
      // Sync with platforms
      await platformService.syncAll();
      
      return {
        content: [{ 
          type: 'text', 
          text: 'Template updated successfully and synced to all platforms' 
        }]
      };
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
  
  /**
   * Handler for list_presets tool
   */
  private async handleListPresets() {
    try {
      const templateService = ServiceFactory.getTemplateService();
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
  
  /**
   * Handler for load_preset tool
   */
  private async handleLoadPreset(args: any) {
    try {
      const { presetName } = args;
      
      if (!presetName) {
        return {
          content: [{ 
            type: 'text', 
            text: 'Preset name is required' 
          }],
          isError: true
        };
      }
      
      const templateService = ServiceFactory.getTemplateService();
      const platformService = ServiceFactory.getPlatformService();
      
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
      await platformService.syncAll();
      
      return {
        content: [{ 
          type: 'text', 
          text: `Preset '${presetName}' loaded successfully and synced to all platforms` 
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
  
  /**
   * Handler for create_preset tool
   */
  private async handleCreatePreset(args: any) {
    try {
      const { presetName } = args;
      
      if (!presetName) {
        return {
          content: [{ 
            type: 'text', 
            text: 'Preset name is required' 
          }],
          isError: true
        };
      }
      
      const templateService = ServiceFactory.getTemplateService();
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
  
  /**
   * Handler for sync_platforms tool
   */
  private async handleSyncPlatforms(args: any) {
    try {
      const { platform } = args || {};
      let results;
      
      const platformService = ServiceFactory.getPlatformService();
      
      if (platform) {
        const platformType = platform as PlatformType;
        const result = await platformService.syncPlatform(platformType);
        results = [result];
      } else {
        results = await platformService.syncAll();
      }
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      let resultText = `Sync completed: ${successCount} successful, ${failCount} failed\n\n`;
      
      for (const result of results) {
        resultText += `${result.platform}: ${result.success ? '✅' : '❌'} ${result.message}\n`;
      }
      
      return {
        content: [{ 
          type: 'text', 
          text: resultText 
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
  
  /**
   * Handler for list_platforms tool
   */
  private async handleListPlatforms() {
    try {
      const platformService = ServiceFactory.getPlatformService();
      const platforms = platformService.getPlatforms();
      
      return {
        content: [{ 
          type: 'text', 
          text: `Configured platforms:\n${platforms.join('\n')}` 
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
  
  /**
   * Handler for remember tool
   */
  private async handleRemember(args: any) {
    try {
      const { command } = args;
      
      if (!command) {
        return {
          content: [{ 
            type: 'text', 
            text: 'Command is required' 
          }],
          isError: true
        };
      }
      
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
}