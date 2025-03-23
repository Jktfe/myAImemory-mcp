/**
 * Direct MCP server implementation that doesn't rely on the SDK
 */
import { createServer } from 'http';
import { templateService } from './services/templateService.js';
import { platformService } from './services/platformService.js';
import { generateTemplate } from './templateParser.js';
import { PlatformType } from './types.js';
import { z } from 'zod';

/**
 * Simple JSON-RPC implementation
 */
export class DirectMcpServer {
  private nextId = 1;
  private handlers: Map<string, Function> = new Map();
  private initialized = false;
  
  constructor(private readonly options: { name: string; version: string }) {
    this.setupHandlers();
  }
  
  /**
   * Set up the request handlers
   */
  private setupHandlers() {
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
        ],
      };
    });
    
    // Tools call handler
    this.handlers.set('tools/call', async (params: any) => {
      const { name, arguments: args } = params;
      
      switch (name) {
        case 'myai_get_template':
          return this.handleGetTemplate();
        case 'myai_get_section':
          return this.handleGetSection(args);
        case 'myai_store':
          return this.handleUpdateSection(args);
        case 'myai_update_template':
          return this.handleUpdateTemplate(args);
        case 'myai_list_presets':
          return this.handleListPresets();
        case 'myai_load_preset':
          return this.handleLoadPreset(args);
        case 'myai_create_preset':
          return this.handleCreatePreset(args);
        case 'myai_sync_platforms':
          return this.handleSyncPlatforms(args);
        case 'myai_list_platforms':
          return this.handleListPlatforms();
        // Keep backward compatibility
        case 'get_template':
          return this.handleGetTemplate();
        case 'get_section':
          return this.handleGetSection(args);
        case 'update_section':
          return this.handleUpdateSection(args);
        case 'update_template':
          return this.handleUpdateTemplate(args);
        case 'list_presets':
          return this.handleListPresets();
        case 'load_preset':
          return this.handleLoadPreset(args);
        case 'create_preset':
          return this.handleCreatePreset(args);
        case 'sync_platforms':
          return this.handleSyncPlatforms(args);
        case 'list_platforms':
          return this.handleListPlatforms();
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }
  
  /**
   * Start the server with HTTP
   */
  startHttp(port = 3000) {
    const server = createServer((req, res) => {
      if (req.method === 'POST') {
        let body = '';
        
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', async () => {
          try {
            const request = JSON.parse(body);
            const response = await this.handleRequest(request);
            
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(response));
          } catch (error) {
            console.error('Error processing request:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: 'Internal error',
              },
              id: null,
            }));
          }
        });
      } else {
        res.statusCode = 404;
        res.end('Not found');
      }
    });
    
    server.listen(port, () => {
      console.log(`Direct MCP server listening on port ${port}`);
    });
  }
  
  /**
   * Start the server with stdio
   */
  startStdio() {
    process.stdin.setEncoding('utf-8');
    
    // Process input line by line
    let buffer = '';
    process.stdin.on('data', async (chunk) => {
      buffer += chunk;
      
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.substring(0, newlineIndex);
        buffer = buffer.substring(newlineIndex + 1);
        
        try {
          const request = JSON.parse(line);
          const response = await this.handleRequest(request);
          
          // Send the response
          process.stdout.write(JSON.stringify(response) + '\n');
        } catch (error) {
          console.error(`Error processing request: ${error instanceof Error ? error.message : String(error)}`);
          const errorResponse = {
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal error',
            },
            id: null,
          };
          process.stdout.write(JSON.stringify(errorResponse) + '\n');
        }
      }
    });
    
    // Handle process exit
    process.on('SIGINT', () => {
      console.error('Received SIGINT, shutting down');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.error('Received SIGTERM, shutting down');
      process.exit(0);
    });
    
    console.error('Direct MCP server started with stdio transport');
  }
  
  /**
   * Handle an incoming JSON-RPC request
   */
  private async handleRequest(request: any): Promise<any> {
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
        // Update section in template store
        await templateService.updateSection(sectionName, content);
        
        // Get the full template content (as object)
        const templateObj = await templateService.getTemplate();
        
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
}

/**
 * Create and start the direct MCP server
 */
export async function createDirectMcpServer() {
  // Initialize services
  await templateService.initialize();
  await platformService.initialize();
  
  // Create the server
  return new DirectMcpServer({
    name: 'myAI Memory Sync',
    version: '1.0.0'
  });
}